#!/usr/bin/env node
// Installs the parqet skill to ~/.claude/skills/parqet/
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillSrc = join(__dirname, "..", "skills", "parqet", "SKILL.md");
const skillDir = join(homedir(), ".claude", "skills", "parqet");
const skillDst = join(skillDir, "SKILL.md");

try {
  if (!existsSync(skillSrc)) process.exit(0); // not in package, skip

  mkdirSync(skillDir, { recursive: true });
  copyFileSync(skillSrc, skillDst);
  console.log(`parqet: skill installed → ${skillDst}`);
} catch {
  // Non-fatal — skill install failure shouldn't break npm install
}
