const ROLE_LABELS: Record<string, string> = {
  Admin: "管理员",
  "Admin Viewer": "管理员（只读）",
  "Internal User": "内部用户",
  "Team Admin": "团队管理员",
  Member: "成员",
  User: "用户",
};

/** 只用于界面显示，不改变角色值/权限判断。 */
export const roleDisplayName = (role?: string | null): string =>
  role ? (ROLE_LABELS[role] ?? role) : "";
