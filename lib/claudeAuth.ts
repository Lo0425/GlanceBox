import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

const CREDENTIALS_PATH = join(homedir(), ".claude", ".credentials.json");

// Reads the OAuth access token fresh from Claude Code's own credentials file
// on every call, rather than copying it into a second store. Claude Code
// keeps this file's token refreshed as long as it's used normally -- if it's
// stale, the caller will see an auth failure from Anthropic's API and should
// surface "use Claude Code to refresh your session" rather than us trying to
// reimplement its refresh flow.
export async function getClaudeAccessToken(): Promise<string | null> {
  try {
    const raw = await readFile(CREDENTIALS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}


//bro