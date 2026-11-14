export const SENSITIVE_FIELDS = new Set(["cyberark_api_key", "client_key"]);

export const FIELD_LABELS: Record<string, string> = {
  cyberark_api_base: "Conjur Server URL",
  cyberark_account: "账户",
  cyberark_username: "用户名",
  cyberark_api_key: "API 密钥",
  client_cert: "Client Certificate",
  client_key: "Client Key",
  ssl_verify: "SSL Verification",
  refresh_interval: "Token Refresh Interval (seconds)",
};
