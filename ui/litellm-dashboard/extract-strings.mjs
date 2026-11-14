// 提取 UI 源码里可能显示给用户的英文串，用于补汉化词典。
// 只读，不改源码。输出 zh-candidates.json / zh-candidates.txt。
import fs from "node:fs";
import path from "node:path";
import parser from "@babel/parser";

const root = process.cwd();
const dict = JSON.parse(fs.readFileSync(path.join(root, "zh-dict.json"), "utf8"));
const EXCLUDE = /\.(test|spec|integration\.test)\.(tsx|ts)$/;
const DISPLAY_ATTRS = new Set([
  "placeholder", "title", "aria-label", "label", "alt", "description",
  "header", "subheader", "helperText", "emptyText", "emptyMessage",
  "confirmText", "cancelText", "tooltip", "message", "detail",
]);
const DISPLAY_PROPS = new Set([
  "label", "title", "description", "groupLabel", "placeholder", "header",
  "subheader", "helperText", "emptyText", "emptyMessage", "confirmText",
  "cancelText", "tooltip", "message", "detail", "displayName",
]);
const DISPLAY_CALLS = /^(toast\.|alert$|confirm$|setError$|setMessage$|setStatus$|notify$|message\.|Modal\.|window\.alert$|window\.confirm$)/;

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "out", "tests", "__tests__"].includes(entry.name)) continue;
      walkFiles(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !EXCLUDE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const hasCJK = (s) => /[㐀-鿿]/.test(s);
const looksText = (s) => {
  const t = s.trim();
  if (!t || t.length < 2 || t.length > 160) return false;
  if (hasCJK(t)) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  if (/^(https?:|\/|\.\/|\.\.\/|@|#|_|--)/.test(t)) return false;
  if (/^[A-Z0-9_]+$/.test(t)) return false; // 常量/枚举
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(t)) return false; // camelCase
  if (/^[a-z]+(_[a-z0-9]+)+$/.test(t)) return false; // snake_case
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(t)) return false; // 域名/文件名
  if (/[{}<>;$]|=>|\\n|\bclassName\b/.test(t)) return false;
  return true;
};

const hits = new Map(); // text -> {count, files:Set, contexts:Set}
function add(text, file, line, context) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!looksText(t)) return;
  if (!hits.has(t)) hits.set(t, { text: t, count: 0, files: new Set(), contexts: new Set() });
  const item = hits.get(t);
  item.count += 1;
  item.files.add(`${path.relative(root, file)}:${line}`);
  item.contexts.add(context);
}

function walk(node, file, parent) {
  if (!node || typeof node !== "object") return;
  const line = node.loc?.start?.line || 0;
  if (node.type === "JSXText") {
    add(node.value, file, line, "jsx-text");
  }
  if (node.type === "StringLiteral") {
    if (parent?.type === "JSXAttribute" && DISPLAY_ATTRS.has(parent.name?.name)) {
      add(node.value, file, line, `attr:${parent.name.name}`);
    } else if (parent?.type === "ObjectProperty" && DISPLAY_PROPS.has(parent.key?.name || parent.key?.value)) {
      add(node.value, file, line, `prop:${parent.key?.name || parent.key?.value}`);
    } else if (parent?.type === "ConditionalExpression") {
      add(node.value, file, line, "ternary");
    } else if (parent?.type === "LogicalExpression") {
      add(node.value, file, line, "logical");
    } else if (parent?.type === "JSXExpressionContainer" && parent.parent?.type === "JSXElement") {
      add(node.value, file, line, "jsx-expr");
    } else if (parent?.type === "CallExpression") {
      const callee = parent.callee;
      const name = callee?.type === "Identifier" ? callee.name
        : callee?.type === "MemberExpression" ? `${callee.object?.name || ""}.${callee.property?.name || ""}` : "";
      if (DISPLAY_CALLS.test(name)) add(node.value, file, line, `call:${name}`);
    }
  }
  if (node.type === "TemplateLiteral") {
    // 只提取没有表达式插值的纯模板串
    if (!node.expressions?.length) {
      const raw = node.quasis.map((q) => q.value.cooked || "").join("");
      add(raw, file, line, "template");
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const value = node[key];
    if (Array.isArray(value)) value.forEach((child) => walk(child, file, node));
    else if (value && typeof value === "object" && value.type) walk(value, file, node);
  }
}

for (const file of walkFiles(path.join(root, "src"))) {
  let ast;
  try {
    ast = parser.parse(fs.readFileSync(file, "utf8"), {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch {
    continue;
  }
  walk(ast, file, null);
}

const rows = [...hits.values()]
  .map((h) => ({
    text: h.text,
    count: h.count,
    translated: Boolean(dict[h.text]),
    contexts: [...h.contexts].sort(),
    files: [...h.files].slice(0, 4),
  }))
  .filter((r) => !r.translated)
  .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

fs.writeFileSync(path.join(root, "zh-candidates.json"), JSON.stringify(rows, null, 2), "utf8");
fs.writeFileSync(
  path.join(root, "zh-candidates.txt"),
  rows.map((r) => `${String(r.count).padStart(3)} ${r.text}\n     ${r.files.join("  ")}\n     ${r.contexts.join(",")}`).join("\n\n"),
  "utf8",
);
console.log(JSON.stringify({ candidates: rows.length, translated: Object.keys(dict).length }, null, 2));
