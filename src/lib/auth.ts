import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { dirname } from "node:path";
import { CLIENT_ID, OAUTH_AUTHORIZE, OAUTH_TOKEN, REDIRECT_URI, TOKENS_FILE } from "./config.ts";
import { error, info } from "./output.ts";

export interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

// --- PKCE helpers ---

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateVerifier(): string {
  return base64url(randomBytes(32));
}

function generateChallenge(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

// --- Token storage ---

export async function saveTokens(tokens: Tokens): Promise<void> {
  await mkdir(dirname(TOKENS_FILE), { recursive: true });
  await writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export async function loadTokens(): Promise<Tokens | null> {
  try {
    const raw = await readFile(TOKENS_FILE, "utf8");
    return JSON.parse(raw) as Tokens;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  try {
    const { unlink } = await import("fs/promises");
    await unlink(TOKENS_FILE);
  } catch {
    // already gone
  }
}

// --- Token refresh ---

async function refreshTokens(refresh_token: string): Promise<Tokens> {
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? refresh_token,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

// --- Get a valid access token (refresh if needed) ---

export async function getAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  // Refresh if expired (with 60s buffer)
  if (tokens.expires_at && Date.now() > tokens.expires_at - 60_000 && tokens.refresh_token) {
    try {
      const refreshed = await refreshTokens(tokens.refresh_token);
      await saveTokens(refreshed);
      return refreshed.access_token;
    } catch {
      return null;
    }
  }

  return tokens.access_token;
}

// --- OAuth PKCE login flow ---

export async function login(): Promise<void> {
  const verifier = generateVerifier();
  const challenge = generateChallenge(verifier);
  const state = base64url(randomBytes(16));

  const authUrl = new URL(OAUTH_AUTHORIZE);
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "portfolio:read");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  info("Opening browser for Parqet authorization...");
  info(`If the browser doesn't open, visit:\n  ${authUrl.toString()}`);

  const { default: open } = await import("open");
  await open(authUrl.toString());

  // Start local callback server
  const code = await waitForCallback(state);

  info("Exchanging authorization code for tokens...");
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  });
}

// --- Local HTTP server to catch OAuth callback ---

function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost:3000");

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const err = url.searchParams.get("error");

      const send = (title: string, body: string, status = 200) => {
        const html = htmlPage(title, body);
        res.writeHead(status, { "Content-Type": "text/html" });
        res.end(html);
        server.close();
      };

      if (err) {
        send("Authorization failed", `Error: ${err}`);
        reject(new Error(`OAuth error: ${err} — ${url.searchParams.get("error_description") ?? ""}`));
        return;
      }

      if (state !== expectedState) {
        send("Authorization failed", "State mismatch.");
        reject(new Error("OAuth state mismatch — possible CSRF"));
        return;
      }

      if (!code) {
        send("Authorization failed", "No code received.");
        reject(new Error("No authorization code in callback"));
        return;
      }

      send("Authorization successful", "You can close this tab and return to the terminal.");
      resolve(code);
    });

    server.listen(3000);
  });
}

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#111}
    h1{font-size:1.4rem}p{color:#555}
  </style></head><body><h1>${title}</h1><p>${body}</p></body></html>`;
}
