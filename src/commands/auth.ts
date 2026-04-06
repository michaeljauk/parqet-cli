import { Command } from "commander";
import { login, clearTokens, getAccessToken, loadTokens } from "../lib/auth.ts";
import { c, error, info } from "../lib/output.ts";
import { TOKENS_FILE } from "../lib/config.ts";

export function registerAuthCommands(program: Command): void {
  const auth = program.command("auth").description("Manage Parqet authentication");

  auth
    .command("login")
    .description("Authenticate with your Parqet account via OAuth")
    .action(async () => {
      try {
        await login();
        console.log(c.green("Authenticated successfully."));
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  auth
    .command("logout")
    .description("Remove stored credentials")
    .action(async () => {
      await clearTokens();
      console.log("Logged out.");
    });

  auth
    .command("status")
    .description("Show authentication status")
    .action(async () => {
      const token = await getAccessToken();
      if (!token) {
        error("Not authenticated. Run: parqet auth login");
        process.exit(2);
      }
      const tokens = await loadTokens();
      const expiresAt = tokens?.expires_at
        ? new Date(tokens.expires_at).toLocaleString()
        : "unknown";
      console.log(c.green("Authenticated"));
      info(`Token expires: ${expiresAt}`);
      info(`Stored at: ${TOKENS_FILE}`);
    });
}
