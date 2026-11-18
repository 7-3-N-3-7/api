import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(rootDir, "sdlc", "core", "sdlc-github.ts");
const userArgs = process.argv.slice(2);
const [major, minor] = process.versions.node.split(".").map(Number);
const supportsNativeStripTypes = major > 22 || (major === 22 && minor >= 6);
const localTsx = path.join(rootDir, "frontend", "node_modules", "tsx", "dist", "cli.mjs");

const nodeArgs = supportsNativeStripTypes
  ? ["--no-warnings", "--experimental-strip-types", entry, ...userArgs]
  : fs.existsSync(localTsx)
    ? [localTsx, entry, ...userArgs]
    : ["--experimental-strip-types", entry, ...userArgs];

const res = spawnSync(process.execPath, nodeArgs, { cwd: rootDir, stdio: "inherit" });
process.exit(res.status ?? 1);
