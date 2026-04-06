import { homedir } from "os";
import { join } from "path";

export const CLIENT_ID =
  process.env["PARQET_CLIENT_ID"] ?? "019d63d3-44eb-779e-b8bf-adc5b7a72994";

export const REDIRECT_URI =
  process.env["PARQET_REDIRECT_URI"] ?? "http://localhost:3000/callback";

export const OAUTH_AUTHORIZE = "https://connect.parqet.com/oauth2/authorize";
export const OAUTH_TOKEN = "https://connect.parqet.com/oauth2/token";
export const API_BASE = "https://connect.parqet.com";

export const CONFIG_DIR = join(homedir(), ".config", "parqet-cli");
export const TOKENS_FILE = join(CONFIG_DIR, "tokens.json");

export const IS_CI = Boolean(process.env["CI"]);
export const NO_COLOR = Boolean(process.env["NO_COLOR"]) || IS_CI;

export type OutputFormat = "table" | "json" | "markdown";

export function getOutputFormat(flag: string | undefined): OutputFormat {
  if (flag === "json" || flag === "markdown" || flag === "table") return flag;
  if (IS_CI) return "json";
  return "table";
}
