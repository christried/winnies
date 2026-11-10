// Loaded into the server under test only: `node --import <this file> <build>/server/index.mjs`.
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { applyNeonLocalConfig } from "./neon-local.mjs";

// `neonConfig` lives on the module instance. Nitro traces the driver into the build's own
// node_modules, and that copy, not the repository's, is the one the server's chunks import.
const driver = join(dirname(process.argv[1]), "node_modules", "@neondatabase", "serverless", "index.mjs");

if (!existsSync(driver)) {
  throw new Error(`The build has no traced copy of the Neon driver at ${driver}, so the test preload cannot configure the one the server uses.`);
}

// Awaited on purpose: `node --import` finishes loading this file before the server starts.
// eslint-disable-next-line antfu/no-top-level-await
const { neonConfig } = await import(pathToFileURL(driver).href);
applyNeonLocalConfig(neonConfig);
