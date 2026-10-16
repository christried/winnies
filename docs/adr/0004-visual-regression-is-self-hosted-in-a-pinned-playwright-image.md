# Visual regression is self-hosted in a pinned Playwright image

The redesign's component states are screenshot-tested from Storybook stories (Storybook's Vitest addon with Vitest's screenshot matcher), and the baselines are generated and compared only inside one pinned `mcr.microsoft.com/playwright:v<X.Y.Z>-noble` image: Podman on the maintainer's Windows machine, the same image as the CI job's container. Baselines are committed to the repo by the maintainer and reviewed as image diffs in the PR. Font rasterization differs between Windows and Linux, so baselines from a bare machine never match CI; one image on both ends removes the platform from the comparison, with no quota and no third party.

## Considered options

- **Chromatic free tier.** Rejected: 5,000 snapshots a month and no TurboSnap on the free tier, against roughly 400 snapshots per full run (about 50 components, a few states each, light and dark), so a busy redesign month runs out. Its review screen and hosted Storybook are the real loss; GitHub's image diff view stands in for the first, and Storybook stays local.
- **Argos Hobby.** Rejected for the same quota, and its Storybook integration is less proven.
- **Baselines updated by a CI workflow.** Rejected as the main path: CI would push commits, and the maintainer commits (`AGENTS.md`). It stays the fallback if Podman doesn't hold up on Windows.

## Consequences

- Version bumps of Playwright and the image move together; a mismatch fails every comparison.
- In the container, `node_modules` are installed separately on Linux, not mounted from Windows (native modules such as `better-sqlite3`).
- Stories carry no service-specific parameters, so swapping the runner or adding a hosted service later doesn't touch them.
- Baselines live in plain git; Git LFS only if the repo noticeably bloats.
