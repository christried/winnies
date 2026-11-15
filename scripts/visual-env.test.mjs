import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCLI } from "vitest/node";
import {
  asksForUpdate,
  assertInContainer,
  baselinesOutsideFilter,
  caBundlePath,
  changedPaths,
  CLOUD_CA_BUNDLE,
  containerArgs,
  isCloudContainer,
  missingRuntimeMessage,
  outsideFilterMessage,
  pickRuntime,
  pinnedImage,
  visualRun,
  vitestFilters,
} from "./visual-env.mjs";

// Baselines come out of the pinned Playwright image and nowhere else (ADR-0004), so a run on the host is refused
// before the config lets Vitest write or compare anything. The refusals are what a developer on Windows sees.

const INSIDE = { WINNIES_VISUAL: "container" };

describe("scripts/visual-env.mjs assertInContainer", () => {
  it("lets the suite run inside the container, with or without an update", () => {
    expect(() => assertInContainer({
      env: INSIDE,
      argv: ["vitest", "run"],
    })).not.toThrow();
    expect(() => assertInContainer({
      env: INSIDE,
      argv: ["vitest", "run", "--update"],
    })).not.toThrow();
  });

  it("refuses a plain run on the host and names the image script", () => {
    expect(() => assertInContainer({
      env: {},
      argv: ["vitest", "run"],
    })).toThrow(/pnpm test:visual:image`\./);
  });

  it.each([
    [
      "--update",
      ["vitest", "run", "--update"],
    ],
    [
      "-u",
      ["vitest", "run", "-u"],
    ],
    [
      "--update=all",
      ["vitest", "run", "--update=all"],
    ],
  ])("refuses %s on the host before a baseline can be written", (_flag, argv) => {
    expect(() => assertInContainer({ env: {}, argv })).toThrow(/Baselines are written inside the pinned Playwright image only/);
    expect(() => assertInContainer({ env: {}, argv })).toThrow(/pnpm test:visual:image` --update/);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["another value", "host"],
    ["a truthy look-alike", "1"],
  ])("refuses when WINNIES_VISUAL is %s", (_case, value) => {
    expect(() => assertInContainer({
      env: { WINNIES_VISUAL: value },
      argv: ["vitest", "run", "--update"],
    })).toThrow();
  });
});

describe("scripts/visual-env.mjs asksForUpdate", () => {
  it("is false for a run that only compares", () => {
    expect(asksForUpdate([
      "vitest",
      "run",
      "--project",
      "workspace-dark",
    ])).toBe(false);
  });

  it("does not take a longer flag for an update", () => {
    expect(asksForUpdate(["vitest", "run", "--update-snapshots-not-a-flag"])).toBe(false);
  });
});

describe("scripts/visual-env.mjs visualRun", () => {
  it("a comparing run runs `test:visual` as CI, and forwards everything", () => {
    expect(visualRun([])).toEqual({
      update: false,
      script: "test:visual",
      forwarded: [],
    });
    expect(visualRun(["--project", "workspace-dark"])).toEqual({
      update: false,
      script: "test:visual",
      forwarded: ["--project", "workspace-dark"],
    });
  });

  it.each(["--update", "-u"])("%s runs `test:visual:update`, which carries the one update flag, so none is forwarded", (flag) => {
    expect(visualRun([flag, "--project", "workspace-dark"])).toEqual({
      update: true,
      script: "test:visual:update",
      forwarded: ["--project", "workspace-dark"],
    });
  });

  it("--update=new hands Vitest that one flag, through `test:visual`, which has none of its own", () => {
    expect(visualRun(["--update=new", "--project", "workspace-dark"])).toEqual({
      update: true,
      script: "test:visual",
      forwarded: ["--update=new", "--project", "workspace-dark"],
    });
  });

  it("several update flags still hand Vitest exactly one", () => {
    expect(visualRun(["-u", "--update=new", "--update"]).forwarded).toEqual(["--update=new"]);
    expect(visualRun(["--update=all", "--update=new"]).forwarded).toEqual(["--update=new"]);
  });
});

// #367: `--update` takes an optional value in Vitest, so a bare one at the end of the package script made the first
// file filter after it the value of the flag, with an empty filter and every story redrawn. The command line is the
// package script's own, plus what `visualRun` forwards, read by Vitest's own parser: nothing here is a copy of its rules.
describe("the update's Vitest command line reads its filter", () => {
  const updateScript = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts["test:visual:update"];

  /**
   * What Vitest makes of `pnpm test:visual:image --update <args>` inside the container.
   * @param {string[]} args the arguments after `--update`
   * @returns {{ filter: string[], update: unknown }} the file filters and the value of the update option
   */
  const parsed = (args) => {
    const [, ...scriptArgs] = updateScript.split(" ");
    const { filter, options } = parseCLI([
      "vitest",
      ...scriptArgs,
      ...visualRun(["--update", ...args]).forwarded,
    ]);
    return { filter, update: options.update };
  };

  it.each([
    [
      "the filter first",
      ["stories/tokens/radii.stories.ts"],
      ["stories/tokens/radii.stories.ts"],
    ],
    [
      "the filter after a flag",
      ["--project", "workspace-light", "stories/tokens/radii.stories.ts"],
      ["stories/tokens/radii.stories.ts"],
    ],
    [
      "two filters",
      ["stories/ui/button.stories.ts", "stories/tokens"],
      ["stories/ui/button.stories.ts", "stories/tokens"],
    ],
    [
      "no filter",
      [],
      [],
    ],
    [
      "a backslash filter, kept as given",
      ["stories\\ui\\button.stories.ts"],
      ["stories\\ui\\button.stories.ts"],
    ],
  ])("%s", (_name, args, filter) => {
    const result = parsed(args);
    expect(result.filter).toEqual(filter);
    expect([true, "all"]).toContain(result.update);
  });
});

describe("scripts/visual-env.mjs pinnedImage", () => {
  it("is the e2e job's image for the Playwright the repo installs", () => {
    expect(pinnedImage("1.65.0")).toBe("mcr.microsoft.com/playwright:v1.65.0-noble");
  });
});

describe("scripts/visual-env.mjs isCloudContainer", () => {
  it("is true when CLAUDE_CODE_REMOTE is a non-empty string", () => {
    expect(isCloudContainer({ CLAUDE_CODE_REMOTE: "true" })).toBe(true);
  });

  it.each([
    ["unset", {}],
    [
      "empty",
      { CLAUDE_CODE_REMOTE: "" },
    ],
  ])("is false when CLAUDE_CODE_REMOTE is %s", (_case, env) => {
    expect(isCloudContainer(env)).toBe(false);
  });
});

describe("scripts/visual-env.mjs pickRuntime", () => {
  it("is Podman on the human's machine, with every argument kept", () => {
    expect(pickRuntime({ env: {}, args: [] })).toEqual({ runtime: "podman", rest: [] });
  });

  it("is Docker in a cloud container", () => {
    expect(pickRuntime({
      env: { CLAUDE_CODE_REMOTE: "true" },
      args: [],
    })).toEqual({ runtime: "docker", rest: [] });
  });

  it.each([
    [
      "empty",
      { CLAUDE_CODE_REMOTE: "" },
    ],
    ["unset", {}],
  ])("is Podman when CLAUDE_CODE_REMOTE is %s", (_case, env) => {
    expect(pickRuntime({ env, args: [] }).runtime).toBe("podman");
  });

  it("lets a flag name Podman in a cloud container and Docker on the human's machine", () => {
    expect(pickRuntime({
      env: { CLAUDE_CODE_REMOTE: "true" },
      args: ["--runtime=podman"],
    }).runtime).toBe("podman");
    expect(pickRuntime({
      env: {},
      args: ["--runtime=docker"],
    }).runtime).toBe("docker");
  });

  it("takes the last of several flags, as the last --update=<mode> is taken", () => {
    expect(pickRuntime({
      env: {},
      args: ["--runtime=docker", "--runtime=podman"],
    }).runtime).toBe("podman");
    expect(pickRuntime({
      env: {},
      args: ["--runtime=podman", "--runtime=docker"],
    }).runtime).toBe("docker");
  });

  it("takes the flag out of what is forwarded and keeps the order of the rest", () => {
    expect(pickRuntime({
      env: {},
      args: [
        "--update",
        "--runtime=docker",
        "--project",
        "workspace-dark",
      ],
    })).toEqual({
      runtime: "docker",
      rest: ["--update", "--project", "workspace-dark"],
    });
  });

  it("picks no runtime from any other variable", () => {
    expect(pickRuntime({
      env: { DOCKER_HOST: "tcp://x", CONTAINER_HOST: "y", RUNTIME: "docker" },
      args: [],
    }).runtime).toBe("podman");
  });

  it.each([
    [
      "rkt",
      ["--runtime=rkt"],
      "rkt",
    ],
    [
      "an empty value",
      ["--runtime="],
      "",
    ],
    [
      "another case",
      ["--runtime=Docker"],
      "Docker",
    ],
  ])("refuses --runtime with %s, naming both runtimes and the value", (_case, args, value) => {
    expect(() => pickRuntime({ env: {}, args })).toThrow(`\`--runtime\` takes \`podman\` or \`docker\`, not \`${value}\`.`);
  });

  it("refuses a bare --runtime, which has no value", () => {
    expect(() => pickRuntime({
      env: {},
      args: ["--runtime"],
    })).toThrow("`--runtime` takes `podman` or `docker`, not a value.");
  });
});

describe("scripts/visual-env.mjs caBundlePath", () => {
  it("is the container's own bundle when it names one", () => {
    expect(caBundlePath({ NODE_EXTRA_CA_CERTS: "/etc/ssl/own.crt" })).toBe("/etc/ssl/own.crt");
  });

  it.each([
    ["unset", {}],
    [
      "empty",
      { NODE_EXTRA_CA_CERTS: "" },
    ],
  ])("is the proven path when NODE_EXTRA_CA_CERTS is %s", (_case, env) => {
    expect(caBundlePath(env)).toBe(CLOUD_CA_BUNDLE);
  });
});

describe("scripts/visual-env.mjs containerArgs", () => {
  const IMAGE = "mcr.microsoft.com/playwright:v1.65.0-noble";
  const base = {
    root: "/repo",
    checkout: "abcd1234",
    image: IMAGE,
    nodeVersion: "24.15",
    pnpmVersion: "11.10.0",
    script: "test:visual",
    forwarded: ["--project", "workspace-light"],
  };
  const tail = [
    IMAGE,
    "sh",
    "scripts/visual-container.sh",
    "test:visual",
    "--project",
    "workspace-light",
  ];

  // What scripts/visual-podman.mjs passed to `podman` before the runtime was a choice, token by token.
  const podmanToday = [
    "run",
    "--rm",
    "--ipc=host",
    "--init",
    "-v",
    "/repo:/work",
    "-v",
    "winnies-visual-node-modules-abcd1234:/work/node_modules",
    "-v",
    "winnies-visual-pnpm-store:/pnpm-store",
    "--mount",
    "type=tmpfs,destination=/work/.nuxt,notmpcopyup",
    "-w",
    "/work",
    "-e",
    "WINNIES_VISUAL=container",
    "-e",
    "NODE_VERSION=24.15",
    "-e",
    "PNPM_VERSION=11.10.0",
    "-e",
    "CI=true",
    ...tail,
  ];

  // The line a cloud session ran green in #307's fix round (the volume there was named -307).
  const dockerInTheCloud = [
    "run",
    "--rm",
    "--network",
    "host",
    "--ipc=host",
    "--init",
    "-v",
    "/repo:/work",
    "-v",
    "winnies-visual-node-modules-abcd1234:/work/node_modules",
    "-v",
    "winnies-visual-pnpm-store:/pnpm-store",
    "--tmpfs",
    "/work/.nuxt",
    "-w",
    "/work",
    "-e",
    "WINNIES_VISUAL=container",
    "-e",
    "NODE_VERSION=24.15",
    "-e",
    "PNPM_VERSION=11.10.0",
    "-e",
    "CI=true",
    "-e",
    "HTTPS_PROXY",
    "-e",
    "HTTP_PROXY",
    "-e",
    "NO_PROXY=localhost,127.0.0.1",
    "-e",
    "NODE_EXTRA_CA_CERTS=/ca/ca-bundle.crt",
    "-v",
    "/root/.ccr/ca-bundle.crt:/ca/ca-bundle.crt:ro",
    ...tail,
  ];

  it("podman on the human's machine is exactly the call made before the runtime was a choice", () => {
    expect(containerArgs({
      ...base,
      runtime: "podman",
      cloud: false,
      update: false,
    })).toEqual(podmanToday);
  });

  it("an update run leaves CI=true out, and nothing else", () => {
    const ci = podmanToday.indexOf("CI=true");
    const withoutCi = podmanToday.filter((_arg, index) => index !== ci - 1 && index !== ci);
    expect(withoutCi).not.toContain("CI=true");
    expect(containerArgs({
      ...base,
      runtime: "podman",
      cloud: false,
      update: true,
    })).toEqual(withoutCi);
  });

  it("docker in a cloud container is the line #307 ran green", () => {
    expect(containerArgs({
      ...base,
      runtime: "docker",
      cloud: true,
      update: false,
      caBundle: CLOUD_CA_BUNDLE,
    })).toEqual(dockerInTheCloud);
  });

  it("a cloud container without a bundle on disk passes no CA, and still the proxy", () => {
    const args = containerArgs({
      ...base,
      runtime: "docker",
      cloud: true,
      update: false,
    });
    expect(args.join(" ")).not.toMatch(/NODE_EXTRA_CA_CERTS|ca-bundle/);
    expect(args).toContain("HTTPS_PROXY");
    expect(args).toContain("HTTP_PROXY");
    expect(args).toContain("NO_PROXY=localhost,127.0.0.1");
  });

  it("docker outside a cloud container takes --tmpfs and no host network, proxy or CA", () => {
    const args = containerArgs({
      ...base,
      runtime: "docker",
      cloud: false,
      update: false,
      caBundle: CLOUD_CA_BUNDLE,
    });
    expect(args).toContain("--tmpfs");
    expect(args).not.toContain("--network");
    expect(args).not.toContain("--mount");
    expect(args.join(" ")).not.toMatch(/PROXY|NODE_EXTRA_CA_CERTS|ca-bundle/);
  });

  it("podman in a cloud container keeps its own mount form and takes the host network and the proxy", () => {
    const args = containerArgs({
      ...base,
      runtime: "podman",
      cloud: true,
      update: false,
      caBundle: CLOUD_CA_BUNDLE,
    });
    expect(args).toContain("type=tmpfs,destination=/work/.nuxt,notmpcopyup");
    expect(args).not.toContain("--tmpfs");
    expect(args.join(" ")).toContain("--network host");
    expect(args).toContain("HTTPS_PROXY");
    expect(args).toContain("/root/.ccr/ca-bundle.crt:/ca/ca-bundle.crt:ro");
  });

  it("the script and what is forwarded come last, after the image and the container script", () => {
    const args = containerArgs({
      ...base,
      runtime: "podman",
      cloud: false,
      update: false,
      script: "test:visual:update",
      forwarded: ["--project", "x"],
    });
    expect(args.slice(-6)).toEqual([
      IMAGE,
      "sh",
      "scripts/visual-container.sh",
      "test:visual:update",
      "--project",
      "x",
    ]);
  });
});

describe("scripts/visual-env.mjs missingRuntimeMessage", () => {
  it("names Podman, the reason and where the README explains it", () => {
    const line = missingRuntimeMessage("podman", "spawnSync podman ENOENT");
    expect(line).toContain("`podman`");
    expect(line).toContain("spawnSync podman ENOENT");
    expect(line).toContain("README § Tests");
  });

  it("names Docker, the reason, the README and the cloud container's daemon step", () => {
    const line = missingRuntimeMessage("docker", "spawnSync docker ENOENT");
    expect(line).toContain("`docker`");
    expect(line).toContain("spawnSync docker ENOENT");
    expect(line).toContain("README § Tests");
    expect(line).toContain("docs/agents/cloud.md");
  });
});

describe("scripts/visual-env.mjs vitestFilters", () => {
  it.each([
    [
      "none",
      [],
      [],
    ],
    [
      "one",
      ["stories/ui/button.stories.ts"],
      ["stories/ui/button.stories.ts"],
    ],
    [
      "two",
      ["stories/ui/button.stories.ts", "stories/tokens"],
      ["stories/ui/button.stories.ts", "stories/tokens"],
    ],
    [
      "one after a flag with a value",
      ["--project", "workspace-light", "stories/tokens/radii.stories.ts"],
      ["stories/tokens/radii.stories.ts"],
    ],
    [
      "none, when the only values are those of flags",
      [
        "--project",
        "workspace-light",
        "-t",
        "Default",
      ],
      [],
    ],
  ])("%s", async (_name, forwarded, filters) => {
    expect(await vitestFilters(forwarded)).toEqual(filters);
  });
});

describe("scripts/visual-env.mjs changedPaths", () => {
  const nul = (...entries) => `${entries.join("\0")}\0`;

  it("reads modified, untracked and deleted baselines, staged or not", () => {
    expect(changedPaths(nul(
      " M stories/__screenshots__/workspace-light/a-default.png",
      "M  stories/__screenshots__/workspace-dark/a-default.png",
      "?? stories/__screenshots__/workspace-light/b-default.png",
      " D stories/__screenshots__/showcase-light/c-default.png",
    ))).toEqual([
      "stories/__screenshots__/workspace-light/a-default.png",
      "stories/__screenshots__/workspace-dark/a-default.png",
      "stories/__screenshots__/workspace-light/b-default.png",
      "stories/__screenshots__/showcase-light/c-default.png",
    ]);
  });

  it("counts both paths of a rename or a copy, the new one first and the old one in the entry after it", () => {
    expect(changedPaths(nul(
      "R  stories/__screenshots__/workspace-light/new-default.png",
      "stories/__screenshots__/workspace-light/old-default.png",
      " M stories/__screenshots__/workspace-light/a-default.png",
      "C  stories/__screenshots__/workspace-dark/copy-default.png",
      "stories/__screenshots__/workspace-dark/orig-default.png",
      "?R stories/__screenshots__/x/y.png",
      "stories/__screenshots__/x/z.png",
    ))).toEqual([
      "stories/__screenshots__/workspace-light/new-default.png",
      "stories/__screenshots__/workspace-light/old-default.png",
      "stories/__screenshots__/workspace-light/a-default.png",
      "stories/__screenshots__/workspace-dark/copy-default.png",
      "stories/__screenshots__/workspace-dark/orig-default.png",
      "stories/__screenshots__/x/y.png",
      "stories/__screenshots__/x/z.png",
    ]);
  });

  it("is empty for an empty output, and a trailing NUL adds nothing", () => {
    expect(changedPaths("")).toEqual([]);
    expect(changedPaths("\0")).toEqual([]);
    expect(changedPaths(" M a.png")).toEqual(["a.png"]);
  });
});

describe("scripts/visual-env.mjs baselinesOutsideFilter", () => {
  const SHOTS = "stories/__screenshots__";
  // A story file's path and the ids of its stories. `tokens/colors` is titled "Tokens/Colours": the file name is not
  // the id's, which is why a baseline cannot be matched to a file by its name.
  const storyFiles = {
    "stories/tokens/colors.stories.ts": ["tokens-colours--default"],
    "stories/tokens/radii.stories.ts": ["tokens-radii--default"],
    "stories/ui/button.stories.ts": [
      "ui-button--primary",
      "ui-button--ghost",
    ],
    "stories/ui/icon-button.stories.ts": ["ui-icon-button--default"],
  };
  const baseline = (variant, name) => `${SHOTS}/${variant}/${name}.png`;

  it("is empty when every changed baseline is a story of the filter, in any variant", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/tokens/radii.stories.ts"],
      changed: [
        baseline("workspace-light", "tokens-radii-default"),
        baseline("showcase-dark", "tokens-radii-default"),
      ],
      storyFiles,
    })).toEqual([]);
  });

  it("names a baseline of a story outside the filter, matching the id of a file whose name differs from it", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/tokens/radii.stories.ts"],
      changed: [
        baseline("workspace-light", "tokens-colours-default"),
      ],
      storyFiles,
    })).toEqual([
      baseline("workspace-light", "tokens-colours-default"),
    ]);
    expect(baselinesOutsideFilter({
      filters: ["stories/tokens/colors.stories.ts"],
      changed: [
        baseline("workspace-light", "tokens-colours-default"),
      ],
      storyFiles,
    })).toEqual([]);
  });

  it("names only the outside ones of a mixed set, sorted", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/tokens/radii.stories.ts"],
      changed: [
        baseline("workspace-light", "ui-button-primary"),
        baseline("workspace-light", "tokens-radii-default"),
        baseline("broadcast-dark", "tokens-colours-default"),
        baseline("workspace-dark", "ui-button-ghost"),
      ],
      storyFiles,
    })).toEqual([
      baseline("broadcast-dark", "tokens-colours-default"),
      baseline("workspace-dark", "ui-button-ghost"),
      baseline("workspace-light", "ui-button-primary"),
    ]);
  });

  it("is empty with no filter, whatever changed", () => {
    expect(baselinesOutsideFilter({
      filters: [],
      changed: [
        baseline("workspace-light", "tokens-colours-default"),
        baseline("workspace-light", "no-story-default"),
      ],
      storyFiles,
    })).toEqual([]);
  });

  it("takes every story file the filter is a substring of: `button` is also the icon button", () => {
    expect(baselinesOutsideFilter({
      filters: ["button"],
      changed: [
        baseline("workspace-light", "ui-button-primary"),
        baseline("workspace-light", "ui-icon-button-default"),
        baseline("workspace-light", "tokens-radii-default"),
      ],
      storyFiles,
    })).toEqual([
      baseline("workspace-light", "tokens-radii-default"),
    ]);
  });

  it("takes a directory, and two filters together", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/ui", "radii"],
      changed: [
        baseline("workspace-light", "ui-button-primary"),
        baseline("workspace-light", "tokens-radii-default"),
        baseline("workspace-light", "tokens-colours-default"),
      ],
      storyFiles,
    })).toEqual([
      baseline("workspace-light", "tokens-colours-default"),
    ]);
  });

  it.each([
    "stories\\tokens\\radii.stories.ts",
    "./stories/tokens/radii.stories.ts",
    "stories/tokens/radii.stories.ts:12",
    ".\\stories\\tokens\\radii.stories.ts:12",
  ])("reads %s as the path it names", (filter) => {
    expect(baselinesOutsideFilter({
      filters: [filter],
      changed: [
        baseline("workspace-light", "tokens-radii-default"),
        baseline("workspace-light", "tokens-colours-default"),
      ],
      storyFiles,
    })).toEqual([
      baseline("workspace-light", "tokens-colours-default"),
    ]);
  });

  it("names a baseline of a story no file has (deleted or renamed)", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/tokens/radii.stories.ts"],
      changed: [
        baseline("workspace-light", "gone-default"),
      ],
      storyFiles,
    })).toEqual([
      baseline("workspace-light", "gone-default"),
    ]);
  });

  it("ignores what is not a baseline: another folder, or a file in the folder that is not a PNG", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/tokens/radii.stories.ts"],
      changed: [
        ".vitest/x.png",
        `${SHOTS}/workspace-light/notes.txt`,
        "stories/tokens/radii.stories.ts",
      ],
      storyFiles,
    })).toEqual([]);
  });

  it("puts every changed baseline outside a filter that matches no story file", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/nothing"],
      changed: [
        baseline("workspace-light", "tokens-radii-default"),
        baseline("workspace-dark", "tokens-colours-default"),
      ],
      storyFiles,
    })).toEqual([
      baseline("workspace-dark", "tokens-colours-default"),
      baseline("workspace-light", "tokens-radii-default"),
    ]);
  });

  it("is empty when nothing changed", () => {
    expect(baselinesOutsideFilter({
      filters: ["stories/ui"],
      changed: [],
      storyFiles,
    })).toEqual([]);
  });
});

describe("scripts/visual-env.mjs outsideFilterMessage", () => {
  const lines = outsideFilterMessage([
    "stories/__screenshots__/workspace-light/tokens-spacing-default.png",
    "stories/__screenshots__/workspace-dark/tokens-spacing-default.png",
  ]).split("\n");

  it("opens with what happened and closes with what to do", () => {
    expect(lines[0]).toBe("Baselines changed outside your file filter (the update redrew more than you asked for, or a baseline was changed before it):");
    expect(lines.at(-1)).toBe("Restore them with `git restore -- <paths>` before you commit.");
  });

  it("names each path on its own line", () => {
    expect(lines).toContain("stories/__screenshots__/workspace-light/tokens-spacing-default.png");
    expect(lines).toContain("stories/__screenshots__/workspace-dark/tokens-spacing-default.png");
    expect(lines).toHaveLength(4);
  });
});
