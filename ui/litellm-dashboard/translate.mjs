// 源码级中文替换（LiteLLM UI fork，2026-11-14）。
//
// 只替换**显示文案**：
//  - JSX 文本节点（<h1>Virtual Keys</h1>）
//  - JSX 属性 placeholder/title/aria-label/label/alt/description
//  - 对象字面量里 label/title/description/groupLabel/placeholder 的值（导航/页面标题）
// 不碰 href/route/page/key/name/value/id/className，避免影响路由和数据。
import fs from "node:fs";
import path from "node:path";
import parser from "@babel/parser";

const root = process.cwd();
const dict = JSON.parse(fs.readFileSync(path.join(root, "zh-dict.json"), "utf8"));
const ATTRS = new Set([
  "placeholder", "title", "aria-label", "label", "alt", "description",
  "header", "subheader", "helperText", "emptyText", "emptyMessage",
  "confirmText", "cancelText", "tooltip", "message", "detail", "searchPlaceholder",
]);
const LOGIC_KEYS = new Set([
  "value", "id", "key", "slug", "path", "href", "url", "route", "type",
  "status", "state", "mode", "role", "kind", "level", "severity", "outcome",
  "result", "method", "provider", "model", "endpoint", "event", "action",
  "field", "column", "configKey", "settingKey", "env", "envVar", "param",
  "params", "api", "database", "db", "table", "sort", "order", "direction",
  "format", "lang", "locale", "currency", "unit", "date", "time", "timestamp",
  "createdAt", "updatedAt", "name", "children", "className", "style",
]);
const PROPS = new Set([
  "label", "title", "description", "groupLabel", "placeholder",
  "header", "subheader", "helperText", "emptyText", "emptyMessage",
  "confirmText", "cancelText", "tooltip", "message", "detail", "displayName",
]);
const CALLS = new Set([
  "toast.success", "toast.error", "toast.info", "toast.warning", "toast.fromError",
  "alert", "window.alert", "confirm", "window.confirm",
  "setError", "setMessage", "notify", "message.success", "message.error",
  "message.info", "message.warning",
]);
const EXCLUDE = /\.(test|spec|integration\.test)\.(tsx|ts)$/;

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walkFiles(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !EXCLUDE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function translateFile(file) {
  const source = fs.readFileSync(file, "utf8");
  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true,
    });
  } catch (error) {
    return { file, changed: 0, error: String(error.message || error) };
  }
  const edits = [];
  const addString = (node) => {
    const raw = source.slice(node.start, node.end);
    const quote = raw[0];
    if (quote !== '"' && quote !== "'") return;
    const value = node.value;
    const zh = dict[value];
    if (!zh || zh === value) return;
    edits.push({ start: node.start, end: node.end, text: quote + zh + quote });
  };
  const decode = (text) =>
    text
      .replaceAll("&apos;", "'")
      .replaceAll("&quot;", '"')
      .replaceAll("&amp;", "&");
  const addJsxText = (node) => {
    const raw = source.slice(node.start, node.end);
    const trimmed = raw.trim();
    const pure = decode(trimmed);
    const zh = dict[pure];
    if (!zh || zh === pure) return;
    const index = raw.indexOf(trimmed);
    edits.push({
      start: node.start,
      end: node.end,
      text: raw.slice(0, index) + zh + raw.slice(index + trimmed.length),
    });
  };

  const visit = (node, parent) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "JSXText") addJsxText(node);
    if (node.type === "StringLiteral") {
      if (parent?.type === "JSXAttribute" && ATTRS.has(parent.name?.name)) addString(node);
      else if (parent?.type === "ObjectProperty" && PROPS.has(parent.key?.name || parent.key?.value)) addString(node);
      else if (parent?.type === "ObjectProperty" && parent.value === node && !parent.computed) {
        const key = parent.key?.name || parent.key?.value;
        if (!LOGIC_KEYS.has(key)) addString(node);
      } else if (parent?.type === "JSXExpressionContainer" && parent.parent?.type === "JSXElement") addString(node);
      else if (parent?.type === "CallExpression") {
        const callee = parent.callee;
        const name = callee?.type === "Identifier"
          ? callee.name
          : callee?.type === "MemberExpression"
            ? `${callee.object?.name || callee.object?.property?.name || ""}.${callee.property?.name || ""}`
            : "";
        if (CALLS.has(name) && parent.arguments?.[0] === node) addString(node);
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach((child) => visit(child, node));
      else if (value && typeof value === "object") visit(value, node);
    }
  };
  visit(ast, null);

  if (!edits.length) return { file, changed: 0 };
  edits.sort((a, b) => b.start - a.start);
  let output = source;
  for (const edit of edits) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  fs.writeFileSync(file, output, "utf8");
  return { file, changed: edits.length };
}

const files = walkFiles(path.join(root, "src"));
let total = 0;
let touched = 0;
const failures = [];
for (const file of files) {
  const result = translateFile(file);
  if (result.error) failures.push(result);
  if (result.changed) {
    touched += 1;
    total += result.changed;
  }
}
console.log(JSON.stringify({ files: files.length, touched, replacements: total, failures }, null, 2));
