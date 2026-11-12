// Strips the C2PA manifest from committed images, so `scripts/attribution.mjs` has nothing to refuse (CLAUDE.md § Attribution).
// A design export carries one; run this after copying a handoff in.
//
//   node scripts/strip-metadata.mjs [path...]   no path: every tracked .svg, .jpg, .jpeg and .png
//   node scripts/strip-metadata.mjs --check     writes nothing, lists the files that would change, exits 1 if any
//
// Every result is proven to differ from its input only by the manifest before the first file is written; a file that
// fails the proof aborts the run with nothing written.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertOnlyMetadataRemoved, COVERED_FILES, stripFileMetadata } from "./file-metadata.mjs";

function main(args) {
  const check = args.includes("--check");
  const named = args.filter(arg => arg !== "--check");
  const paths = named.length > 0
    ? named
    : execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\0").filter(path => COVERED_FILES.test(path));

  const changes = [];
  let removedBytes = 0;
  for (const path of paths) {
    const before = readFileSync(path);
    const after = stripFileMetadata(path, before);
    if (after === before)
      continue;
    removedBytes += assertOnlyMetadataRemoved(path, before, after);
    changes.push([path, after]);
  }

  if (check) {
    for (const [path] of changes) console.error(`${path} would change`);
    return changes.length > 0
      ? 1
      : 0;
  }
  for (const [path, after] of changes) writeFileSync(path, after);
  console.log(`stripped ${changes.length} of ${paths.length} files (${removedBytes} bytes removed; the proof held for every one)`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(main(process.argv.slice(2)));
