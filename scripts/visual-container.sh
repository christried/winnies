#!/bin/sh
# Runs inside the pinned Playwright image (ADR-0004), started by scripts/visual-image.mjs. The image has Node 26 and
# no pnpm, and the repo wants Node 24 (.nvmrc) and the pnpm of `packageManager`, so both go into a prefix that is not
# on the image's own PATH entries. The host script passes the versions, read from the repo's own files.
set -eu

npm install --prefix /opt/tools --no-audit --no-fund --loglevel=error "node@${NODE_VERSION}" "pnpm@${PNPM_VERSION}"
PATH="/opt/tools/node_modules/.bin:${PATH}"
export PATH
export pnpm_config_store_dir=/pnpm-store

# No postinstall: Storybook and Vitest build nothing, and `nuxt prepare` needs the app's environment.
pnpm install --frozen-lockfile --ignore-scripts

exec pnpm "$@"
