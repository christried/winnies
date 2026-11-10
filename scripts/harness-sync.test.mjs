import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HARNESS_ENV } from "../tests/support/env";
import { proxyAddress } from "../tests/support/neon-local.mjs";

// The test harness is written down in four places that must say the same thing: HARNESS_ENV in
// tests/support/env.ts, the job-level `env:` and the `services:` of the `api-tests` and `e2e` jobs in
// ci.yml, compose.test.yaml (the same two images locally) and `.env.example`. This test fails
// `pnpm test` (the `check` job) when they drift, with a message that names both places and the fix.
//
// Not compared, on purpose: the health checks (compose has a YAML list, CI an `options` string) and the
// `container`, `options` and `steps` of the jobs; they are not part of the harness's contract.

const CI = ".github/workflows/ci.yml";
const COMPOSE = "compose.test.yaml";
const HARNESS = "HARNESS_ENV in tests/support/env.ts";
const SERVICES = ["postgres", "neon-proxy"];
const DIGEST = /@sha256:[0-9a-f]{64}$/;
const FIX = `Change them together: HARNESS_ENV, the \`env:\` and the \`services:\` of every job in ${CI} that sets TEST_DATABASE_URL, and ${COMPOSE} (scripts/harness-sync.test.mjs).`;

// No YAML library is a dependency. These read only what ci.yml and compose.test.yaml hold at the spots
// below: mappings, scalars and lists of scalars. A file that is restructured fails loudly here and never
// passes on nothing.
const restructured = what => new Error(`${CI} or ${COMPOSE} was restructured (${what}): update the helpers at the top of scripts/harness-sync.test.mjs.`);
const indent = line => line.length - line.trimStart().length;
const unquote = value => value.replace(/^(["'])(.*)\1$/, "$2");

/** The meaningful lines of a YAML text: no blank lines, no comments (the checkout may be CRLF). */
function lines(text) {
  return text.split(/\r?\n/).filter(line => line.trim() !== "" && !line.trim().startsWith("#"));
}

const smallest = block => Math.min(...block.map(indent));
const isKey = (line, key) => new RegExp(`^${key}:\\s*$`).test(line.trim());

/** Whether `key:` (with children) is a direct child of `block`. */
function has(block, key) {
  return block.some(line => indent(line) === smallest(block) && isKey(line, key));
}

/** The lines nested under the direct child `key:` of `block`. */
function child(block, key) {
  const top = smallest(block);
  const start = block.findIndex(line => indent(line) === top && isKey(line, key));
  if (start === -1) {
    throw restructured(`no \`${key}:\` at indentation ${top}`);
  }
  const nested = [];
  for (const line of block.slice(start + 1)) {
    if (indent(line) <= top) {
      break;
    }
    nested.push(line);
  }
  if (nested.length === 0) {
    throw restructured(`\`${key}:\` is empty`);
  }
  return nested;
}

/** The direct `key: value` pairs of `block`; a key without a value, or with `>-`, is skipped. */
function entries(block) {
  const top = smallest(block);
  const pairs = block
    .filter(line => indent(line) === top)
    .map(line => line.trim().match(/^([^:\s]+): (\S.*)$/))
    .filter(match => match && match[2] !== ">-");
  return Object.fromEntries(pairs.map(match => [
    match[1],
    unquote(match[2]),
  ]));
}

/** The direct `- item` entries of `block`. */
function list(block) {
  const top = smallest(block);
  return block.filter(line => indent(line) === top && line.trim().startsWith("- ")).map(line => unquote(line.trim().slice(2)));
}

/** The direct keys of `block` that have children (the jobs of `jobs:`, the services of `services:`). */
function keys(block) {
  const top = smallest(block);
  return block.filter(line => indent(line) === top).map(line => line.trim().match(/^([\w-]+):\s*$/)?.[1]).filter(Boolean);
}

function readService(block, envKey) {
  const service = {
    image: entries(block).image,
    env: entries(child(block, envKey)),
    ports: has(block, "ports")
      ? list(child(block, "ports"))
      : undefined,
  };
  if (!service.image || Object.keys(service.env).length === 0) {
    throw restructured("a service has no image or no environment");
  }
  return service;
}

function readServices(block, envKey) {
  return Object.fromEntries(SERVICES.map(name => [
    name,
    readService(child(block, name), envKey),
  ]));
}

/** What the three YAML-ish sources say, in one shape. The suite jobs are every job whose `env:` has TEST_DATABASE_URL. */
function read(sources) {
  const compose = lines(sources.compose);
  const composeName = entries(compose).name;
  const jobs = child(lines(sources.ci), "jobs");
  const suites = {};
  for (const name of keys(jobs)) {
    const job = child(jobs, name);
    if (has(job, "env") && "TEST_DATABASE_URL" in entries(child(job, "env"))) {
      suites[name] = {
        env: entries(child(job, "env")),
        container: has(job, "container"),
        services: readServices(child(job, "services"), "env"),
      };
    }
  }
  const exampleUrl = sources.envExample.match(/^TEST_DATABASE_URL="?([^"\r\n]+)"?$/m)?.[1];
  return {
    composeName,
    composeServices: readServices(child(compose, "services"), "environment"),
    suites,
    exampleUrl,
  };
}

const where = job => `the env of the \`${job}\` job in ${CI}`;

function composeUrl(model, host) {
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = model.composeServices.postgres.env;
  return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${host}:5432/${POSTGRES_DB}`;
}

/** Parts of two connection URLs that differ, as problems. */
function urlProblems(actual, expected, place) {
  let a;
  try {
    a = new URL(actual);
  }
  catch {
    return [`${place} has "${actual}", which is not a URL. ${FIX}`];
  }
  const e = new URL(expected);
  return [
    "protocol",
    "username",
    "password",
    "hostname",
    "port",
    "pathname",
  ]
    .filter(part => a[part] !== e[part])
    .map(part => `${place} has the ${part} "${a[part]}", but ${COMPOSE} says "${e[part]}" (expected ${expected}). ${FIX}`);
}

// Rules 1 and 2
function envProblems(sources) {
  const { suites } = read(sources);
  const problems = [];
  const expectedKeys = [
    ...Object.keys(sources.harness),
    "TEST_DATABASE_URL",
    "DATABASE_URL",
  ];
  for (const [job, { env }] of Object.entries(suites)) {
    for (const key of Object.keys(env).filter(key => !expectedKeys.includes(key))) {
      problems.push(`${key} is set in ${where(job)}, but HARNESS_ENV, TEST_DATABASE_URL and DATABASE_URL do not name it. ${FIX}`);
    }
    for (const key of expectedKeys.filter(key => !(key in env))) {
      problems.push(`${key} is missing from ${where(job)}; ${HARNESS} or the other jobs have it. ${FIX}`);
    }
    for (const [key, value] of Object.entries(sources.harness)) {
      if (key in env && env[key] !== value) {
        problems.push(`${key} differs: ${HARNESS} has "${value}", ${where(job)} has "${env[key]}". ${FIX}`);
      }
    }
  }
  return problems;
}

// Rules 3 and 4
function databaseUrlProblems(sources) {
  const model = read(sources);
  const problems = [];
  for (const [job, { env, container }] of Object.entries(model.suites)) {
    if (env.DATABASE_URL !== undefined) {
      if (!URL.canParse(env.DATABASE_URL)) {
        problems.push(`DATABASE_URL in ${where(job)} is "${env.DATABASE_URL}", which does not parse as a URL (\`nuxt prepare\` needs one). ${FIX}`);
      }
      if (env.DATABASE_URL === env.TEST_DATABASE_URL) {
        problems.push(`DATABASE_URL and TEST_DATABASE_URL are both "${env.DATABASE_URL}" in ${where(job)}; the harness refuses to run then. DATABASE_URL is a placeholder that differs from the test database's.`);
      }
    }
    // The job decides the host: a container job reaches its services by name, a runner job the published port.
    const host = container ? "neon-proxy" : "localhost";
    problems.push(...urlProblems(env.TEST_DATABASE_URL, composeUrl(model, host), `TEST_DATABASE_URL in ${where(job)} (${container ? "it has a `container:`, so the host is the service name" : "no `container:`, so the host is localhost"})`));
  }
  if (model.exampleUrl === undefined) {
    problems.push(`.env.example has no TEST_DATABASE_URL line. ${FIX}`);
  }
  else {
    problems.push(...urlProblems(model.exampleUrl, composeUrl(model, "localhost"), "TEST_DATABASE_URL in .env.example"));
  }
  return problems;
}

// Rule 5
function serviceProblems(sources) {
  const model = read(sources);
  const problems = [];
  const sides = [
    [COMPOSE, model.composeServices],
    ...Object.entries(model.suites).map(([job, { services }]) => [`the \`${job}\` job in ${CI}`, services]),
  ];
  for (const [place, services] of sides) {
    const { image } = services["neon-proxy"];
    if (!DIGEST.test(image)) {
      problems.push(`The neon-proxy image in ${place} is "${image}", which is not pinned by digest (@sha256: and 64 hex characters). The proxy publishes no versioned tags. ${FIX}`);
    }
    const { POSTGRES_USER: user, POSTGRES_PASSWORD: password, POSTGRES_DB: db } = services.postgres.env;
    const connection = `postgres://${user}:${password}@postgres:5432/${db}`;
    if (services["neon-proxy"].env.PG_CONNECTION_STRING !== connection) {
      problems.push(`PG_CONNECTION_STRING of the neon-proxy in ${place} is "${services["neon-proxy"].env.PG_CONNECTION_STRING}", but its postgres service says ${connection}. ${FIX}`);
    }
  }
  for (const [job, { services }] of Object.entries(model.suites)) {
    for (const name of SERVICES) {
      const mine = services[name];
      const theirs = model.composeServices[name];
      const place = `the ${name} service of the \`${job}\` job in ${CI}`;
      if (mine.image !== theirs.image) {
        problems.push(`The ${name} image differs: ${COMPOSE} has "${theirs.image}", ${place} has "${mine.image}". ${FIX}`);
      }
      for (const key of new Set([
        ...Object.keys(theirs.env),
        ...Object.keys(mine.env),
      ])) {
        if (mine.env[key] !== theirs.env[key]) {
          problems.push(`${key} of the ${name} service differs: ${COMPOSE} has ${JSON.stringify(theirs.env[key])}, ${place} has ${JSON.stringify(mine.env[key])}. ${FIX}`);
        }
      }
    }
  }
  return problems;
}

// Rules 6 and 7
function portAndNameProblems(sources) {
  const model = read(sources);
  const problems = [];
  const port = proxyAddress("localhost").split(":")[1];
  const published = [`${port}:${port}`];
  const proxyPorts = model.composeServices["neon-proxy"].ports;
  if (JSON.stringify(proxyPorts) !== JSON.stringify(published)) {
    problems.push(`The neon-proxy of ${COMPOSE} publishes ${JSON.stringify(proxyPorts)}, but the harness dials ${proxyAddress("localhost")} (proxyAddress in tests/support/neon-local.mjs), so it must publish ${JSON.stringify(published)}.`);
  }
  for (const [job, { container, services }] of Object.entries(model.suites)) {
    const jobPorts = services["neon-proxy"].ports;
    if (container && jobPorts !== undefined) {
      problems.push(`The neon-proxy of the \`${job}\` job in ${CI} publishes ${JSON.stringify(jobPorts)}, but that job has a \`container:\` and reaches the proxy by its service name: it must publish nothing.`);
    }
    if (!container && JSON.stringify(jobPorts) !== JSON.stringify(published)) {
      problems.push(`The neon-proxy of the \`${job}\` job in ${CI} publishes ${JSON.stringify(jobPorts)}, but the job has no \`container:\` and the harness dials ${proxyAddress("localhost")}: it must publish ${JSON.stringify(published)}.`);
    }
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(model.composeName ?? "")) {
    problems.push(`${COMPOSE} has no valid top-level \`name:\` (found ${JSON.stringify(model.composeName)}). Without it the project is named after the directory: every worktree gets its own project, all publish port ${port}, and \`pnpm test:db:down\` misses another checkout's containers. Add \`name: winnies-test\` above \`services:\`.`);
  }
  return problems;
}

/** The span [start, end) of the README text from `### Environment variables` to the next `## ` heading, or undefined. */
function environmentSpan(readme) {
  const heading = /^### Environment variables\s*$/m.exec(readme);
  if (!heading) {
    return undefined;
  }
  const after = heading.index + heading[0].length;
  const next = readme.slice(after).search(/^## /m);
  return [
    heading.index,
    next === -1
      ? readme.length
      : after + next,
  ];
}

function environmentSection(readme) {
  const span = environmentSpan(readme);
  return span && readme.slice(...span);
}

// Rule 8
function readmeProblems(sources) {
  const section = environmentSection(sources.readme);
  if (section === undefined) {
    return ["README.md has no `### Environment variables` section, which must name the jobs that set TEST_DATABASE_URL."];
  }
  return Object.keys(read(sources).suites)
    .filter(job => !section.includes(`\`${job}\``))
    .map(job => `README.md, section "Environment variables", does not name the \`${job}\` job, which sets TEST_DATABASE_URL in ${CI}. Name every job that does, each in backticks.`);
}

function real() {
  return {
  // The checkout may be CRLF; the plants below match on LF.
    ci: readFileSync(CI, "utf8").replace(/\r\n/g, "\n"),
    compose: readFileSync(COMPOSE, "utf8").replace(/\r\n/g, "\n"),
    readme: readFileSync("README.md", "utf8").replace(/\r\n/g, "\n"),
    envExample: readFileSync(".env.example", "utf8").replace(/\r\n/g, "\n"),
    harness: HARNESS_ENV,
  };
}

const noProblems = problems => expect(problems, problems.join("\n")).toEqual([]);

describe("the test harness is written the same everywhere", () => {
  it("finds the api-tests and e2e jobs by their TEST_DATABASE_URL", () => {
    // A renamed job must not make every rule pass on nothing.
    expect(Object.keys(read(real()).suites)).toEqual(expect.arrayContaining(["api-tests", "e2e"]));
  });

  it("the env of every suite job is HARNESS_ENV plus the two database URLs", () => {
    noProblems(envProblems(real()));
  });

  it("the database URLs differ only in the host the job reaches the proxy by", () => {
    noProblems(databaseUrlProblems(real()));
  });

  it("the services and images of every suite job are those of compose.test.yaml", () => {
    noProblems(serviceProblems(real()));
  });

  it("the proxy's ports and the compose project name", () => {
    noProblems(portAndNameProblems(real()));
  });

  it("the README names every suite job", () => {
    noProblems(readmeProblems(real()));
  });

  it("stays green on the difference that is meant: a host per job, and no published port in the container job", () => {
    const { suites } = read(real());
    expect(new URL(suites["api-tests"].env.TEST_DATABASE_URL).hostname).toBe("localhost");
    expect(new URL(suites.e2e.env.TEST_DATABASE_URL).hostname).toBe("neon-proxy");
    expect(suites.e2e.services["neon-proxy"].ports).toBeUndefined();
    expect(suites["api-tests"].services["neon-proxy"].ports).toEqual(["4444:4444"]);
  });
});

// Each plant changes one thing in a copy of the real texts and expects exactly the problem it should cause.
// `plant` asserts the text changed, so a plant that matched nothing cannot pass.
function plant(text, change) {
  const mutated = change(text);
  expect(mutated, "the planted change matched nothing").not.toBe(text);
  return mutated;
}

/** Applies `change` to the block of one job of ci.yml only; the two suite jobs are identical bar a few lines. */
function inJob(ci, job, change) {
  const start = ci.indexOf(`\n  ${job}:\n`);
  expect(start, `ci.yml has no job ${job}`).toBeGreaterThan(-1);
  const after = ci.slice(start + 1).search(/\n {2}[\w-]+:\n/);
  const end = after === -1
    ? ci.length
    : start + 1 + after;
  return ci.slice(0, start) + plant(ci.slice(start, end), change) + ci.slice(end);
}

function inReadmeSection(readme, change) {
  const [start, end] = environmentSpan(readme);
  return readme.slice(0, start) + plant(readme.slice(start, end), change) + readme.slice(end);
}

describe("catches drift", () => {
  it("one character of BETTER_AUTH_SECRET in the e2e job only", () => {
    const sources = {
      ...real(),
      ci: inJob(real().ci, "e2e", text => text.replace("0123456789", "012345678X")),
    };
    const problems = envProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("BETTER_AUTH_SECRET differs");
    expect(problems[0]).toContain("the `e2e` job");
    expect(problems[0]).not.toContain("the `api-tests` job");
  });

  it("another port in HARNESS_ENV's BETTER_AUTH_URL: both jobs", () => {
    const problems = envProblems({
      ...real(),
      harness: { ...HARNESS_ENV, BETTER_AUTH_URL: "http://localhost:3102" },
    });
    expect(problems).toHaveLength(2);
    expect(problems.filter(p => p.includes("BETTER_AUTH_URL differs") && p.includes("the `api-tests` job"))).toHaveLength(1);
    expect(problems.filter(p => p.includes("BETTER_AUTH_URL differs") && p.includes("the `e2e` job"))).toHaveLength(1);
  });

  it("one hex character of the proxy digest in compose.test.yaml: both jobs", () => {
    const sources = {
      ...real(),
      compose: plant(real().compose, text => text.replace(/(sha256:[0-9a-f]{63})[0-9a-f]/, "$1x")),
    };
    const problems = serviceProblems(sources);
    expect(problems.filter(p => p.includes("The neon-proxy image differs") && p.includes("the neon-proxy service of the `api-tests` job"))).toHaveLength(1);
    expect(problems.filter(p => p.includes("The neon-proxy image differs") && p.includes("the neon-proxy service of the `e2e` job"))).toHaveLength(1);
  });

  it("postgres:16 in the e2e job only", () => {
    const sources = {
      ...real(),
      ci: inJob(real().ci, "e2e", text => text.replace("image: postgres:17", "image: postgres:16")),
    };
    const problems = serviceProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("The postgres image differs");
    expect(problems[0]).toContain("\"postgres:16\"");
    expect(problems[0]).toContain("the `e2e` job");
  });

  it("a seventh variable in the api-tests env", () => {
    const sources = {
      ...real(),
      ci: inJob(real().ci, "api-tests", text => text.replace("      NUXT_PUBLIC_APP_URL: http://localhost:3101\n", "      NUXT_PUBLIC_APP_URL: http://localhost:3101\n      EXTRA_VARIABLE: 1\n")),
    };
    const problems = envProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("EXTRA_VARIABLE is set");
    expect(problems[0]).toContain("the `api-tests` job");
  });

  it("a variable missing from the e2e env", () => {
    const sources = {
      ...real(),
      ci: inJob(real().ci, "e2e", text => text.replace("      DISCORD_CLIENT_ID: test-discord-client-id\n", "")),
    };
    const problems = envProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("DISCORD_CLIENT_ID is missing");
  });

  it("the other job's database host: localhost in e2e, neon-proxy in api-tests", () => {
    const e2e = databaseUrlProblems({
      ...real(),
      ci: inJob(real().ci, "e2e", text => text.replace("@neon-proxy:5432", "@localhost:5432")),
    });
    expect(e2e).toHaveLength(1);
    expect(e2e[0]).toContain("the `e2e` job");
    expect(e2e[0]).toContain("hostname \"localhost\"");
    const apiTests = databaseUrlProblems({
      ...real(),
      ci: inJob(real().ci, "api-tests", text => text.replace("@localhost:5432/winnies_test", "@neon-proxy:5432/winnies_test")),
    });
    expect(apiTests).toHaveLength(1);
    expect(apiTests[0]).toContain("the `api-tests` job");
    expect(apiTests[0]).toContain("hostname \"neon-proxy\"");
  });

  it("another database name in a job's TEST_DATABASE_URL", () => {
    const sources = {
      ...real(),
      ci: inJob(real().ci, "api-tests", text => text.replace("@localhost:5432/winnies_test", "@localhost:5432/winnies_other")),
    };
    const problems = databaseUrlProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("pathname");
  });

  it("dATABASE_URL equal to TEST_DATABASE_URL in a job", () => {
    const sources = {
      ...real(),
      ci: inJob(real().ci, "api-tests", text => text.replace(/\n {6}DATABASE_URL: .*/, "\n      DATABASE_URL: postgres://postgres:postgres@localhost:5432/winnies_test")),
    };
    const problems = databaseUrlProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("DATABASE_URL and TEST_DATABASE_URL are both");
    expect(problems[0]).toContain("the `api-tests` job");
  });

  it("another TEST_DATABASE_URL in .env.example", () => {
    const sources = {
      ...real(),
      envExample: plant(real().envExample, text => text.replace("@localhost:5432/winnies_test", "@localhost:5433/winnies_test")),
    };
    const problems = databaseUrlProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(".env.example");
  });

  it("name: removed from compose.test.yaml", () => {
    const sources = {
      ...real(),
      compose: plant(real().compose, text => text.replace(/^name: .*\n/m, "")),
    };
    const problems = portAndNameProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("no valid top-level `name:`");
  });

  it("the container job publishing the proxy port, and the runner job not", () => {
    const published = portAndNameProblems({
      ...real(),
      ci: inJob(real().ci, "e2e", text => text.replace("@postgres:5432/winnies_test\n", "@postgres:5432/winnies_test\n        ports:\n          - 4444:4444\n")),
    });
    expect(published).toHaveLength(1);
    expect(published[0]).toContain("must publish nothing");
    const unpublished = portAndNameProblems({
      ...real(),
      ci: inJob(real().ci, "api-tests", text => text.replace("        ports:\n          - 4444:4444\n", "")),
    });
    expect(unpublished).toHaveLength(1);
    expect(unpublished[0]).toContain("the `api-tests` job");
  });

  it("`e2e` removed from the README section", () => {
    const sources = {
      ...real(),
      readme: inReadmeSection(real().readme, text => text.replaceAll("`e2e`", "e2e")),
    };
    const problems = readmeProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`e2e`");
  });

  it("the README section as it was: only api-tests", () => {
    const sources = {
      ...real(),
      readme: inReadmeSection(real().readme, () => "### Environment variables\n\nThe one exception is `TEST_DATABASE_URL`, which lives in the `api-tests`\njob of the CI workflow.\n\n"),
    };
    const problems = readmeProblems(sources);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("`e2e`");
  });

  it("the proxy digest replaced by a tag in compose.test.yaml", () => {
    const sources = {
      ...real(),
      compose: plant(real().compose, text => text.replace(/@sha256:[0-9a-f]{64}/, ":main")),
    };
    const problems = serviceProblems(sources);
    expect(problems.filter(p => p.includes("not pinned by digest"))).toHaveLength(1);
    expect(problems.filter(p => p.includes("The neon-proxy image differs"))).toHaveLength(2);
  });

  it("a restructured file fails loudly instead of passing on nothing", () => {
    const sources = {
      ...real(),
      ci: real().ci.replace("\njobs:\n", "\nworkflows:\n"),
    };
    expect(() => envProblems(sources)).toThrow(/restructured/);
  });
});
