import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ICONS, tintSvg } from "./favicon-tint.mjs";

// `pnpm favicons:stage`: writes public/staging/ from public/ (the rule is in scripts/favicon-tint.mjs).
// A colour the rule does not cover stops the run with the file's name; nothing is written after it.

const path = relative => fileURLToPath(new URL(`../${relative}`, import.meta.url));

for (const { file } of ICONS) {
  let tinted;
  try {
    tinted = tintSvg(readFileSync(path(`public/${file}`), "utf8"));
  }
  catch (error) {
    throw new Error(`public/${file}: ${error.message}`, { cause: error });
  }
  writeFileSync(path(`public/staging/${file}`), tinted);
  console.log(`wrote public/staging/${file}`);
}
