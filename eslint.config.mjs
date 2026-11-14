// @ts-check
import antfu from "@antfu/eslint-config";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import withNuxt from "./.nuxt/eslint.config.mjs";

// A doc block must earn its place: no type tags (TypeScript already has them),
// no restating the name, no empty shells.
const jsdocQuality = {
  // Fixers left on: these scaffold the tag, then the -description rules below
  // make you fill it in. `pnpm lint:fix` writes the placeholders.
  "jsdoc/require-param": "error",
  // require-param's fixer is on by default; require-returns' is not.
  "jsdoc/require-returns": [
    "error",
    { enableFixer: true },
  ],

  "jsdoc/require-param-description": "error",
  "jsdoc/require-returns-description": "error",
  // A block of bare @param/@returns tags says nothing the signature does not.
  "jsdoc/require-description": "error",
  "jsdoc/no-types": "error",
  "jsdoc/informative-docs": "error",
  "jsdoc/no-blank-blocks": "error",
};

// antfu ships these, but only for TS files. Repeated here for .vue.
const jsdocCorrectness = {
  "jsdoc/check-alignment": "error",
  "jsdoc/check-param-names": "error",
  "jsdoc/check-property-names": "error",
  "jsdoc/check-types": "error",
  "jsdoc/empty-tags": "error",
  "jsdoc/multiline-blocks": "error",
  "jsdoc/no-multi-asterisks": "error",
  "jsdoc/require-param-name": "error",
  "jsdoc/require-property-description": "error",
  "jsdoc/require-property-name": "error",
  "jsdoc/require-returns-check": "error",
  "jsdoc/require-yields-check": "error",
};

export default withNuxt(
  antfu({
    vue: true,
    typescript: true,

    stylistic: {
      semi: true,
      quotes: "double",
    },

    formatters: {
      css: true,
      html: true,
      markdown: "prettier",
    },
    rules: {
      "unicorn/filename-case": [
        "error",
        { case: "kebabCase" },
      ],

      "vue/max-attributes-per-line": [
        "error",
        {
          singleline: { max: 2 },
          multiline: { max: 1 },
        },
      ],

      "node/no-process-env": "error",

      // A test that branches asserts nothing on some of its rows: Before R0's review found a `describe.each` whose
      // tests returned early for three of four Winnies (#251).
      "test/no-conditional-in-test": "error",
      "test/no-conditional-expect": "error",
    },

    ignores: [
      "design/**",
      // Exported design-tool output, kept as reference, not maintained source.
      "docs/design_handoff_winnies/**",
      "docs/winnies_full_process/**",
      // Agent-written research notes, read once, not maintained.
      "docs/research/**",
      ".nuxt/**",
      ".output/**",
      // The static Storybook build (`pnpm build-storybook`): generated, never committed.
      "storybook-static/**",
      "**/migrations/**",
      ".pnpm-store/**",
      // Vendored skills, kept byte for byte as their source ships them (.claude/skills/README.md).
      ".claude/**",
      // Verbatim copies of the handoff, kept equal by scripts/handoff-sync.test.mjs: Prettier must not reformat them.
      "app/assets/css/winnies-tokens.css",
      "app/assets/fonts/fonts.css",
    ],
  }),
  {
    // Command-line tools for agents and hooks: they print, and they read the environment they run in.
    name: "scripts",
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
      "node/no-process-env": "off",
    },
  },
  {
    // Test harness: it reports to the console, and tests/support/env.ts is the only place that reads the
    // environment (the Playwright config only asks whether it runs in CI, the screenshot config whether it runs in
    // the container).
    name: "tests",
    files: ["tests/**", "playwright.config.ts", "vitest.storybook.config.ts"],
    rules: {
      "no-console": "off",
      "node/no-process-env": "off",
    },
  },
  {
    // Stories (`.storybook/main.ts` picks up `../stories/**/*.stories.ts`). `no-restricted-syntax` is ONE rule: antfu sets it
    // for every file, and the options of a later block replace its list instead of adding to it. So the two selectors antfu
    // ships are restated here, and every restriction on stories goes into this array, never into a second block
    // (#361 adds its `iterations` selector here).
    name: "stories",
    files: ["stories/**/*.stories.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        "TSEnumDeclaration[const=true]",
        "TSExportAssignment",
        {
          // Any "!test" string in a story file: a tag in the meta or in one story, a const the tag is read from, a template
          // literal. A story kept off needs a ticket (docs/agents/delivery.md § A flake at a required check).
          selector: ":matches(Literal[value=\"!test\"], TemplateElement[value.cooked=\"!test\"])",
          message: "A story kept off needs a ticket, not a \"!test\" tag: fix the story, or open the ticket (docs/agents/delivery.md § A flake at a required check).",
        },
      ],
    },
  },
  {
    name: "better-tailwindcss",
    files: ["**/*.vue"],
    plugins: { "better-tailwindcss": betterTailwindcss },
    settings: {
      "better-tailwindcss": {
        entryPoint: "app/assets/css/main.css",
      },
    },
    rules: {
      "better-tailwindcss/enforce-consistent-class-order": "error",
      // Refuses a class the Tailwind entry doesn't define, so no class of the removed look survives.
      // drag-grip is the exception: a JS selector hook for the drag handle (challenge-list.vue), with no CSS.
      "better-tailwindcss/no-unknown-classes": [
        "error",
        {
          ignore: ["drag-grip"],
        },
      ],
    },
  },
  {

    name: "jsdoc-public-api",
    files: [
      "app/utils/**/*.ts",
      "app/composables/**/*.ts",
      "server/utils/**/*.ts",
      "server/db/**/*.ts",
      "shared/**/*.ts",
    ],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          enableFixer: true,
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
          },
          contexts: ["TSTypeAliasDeclaration", "TSInterfaceDeclaration"],
        },
      ],
      ...jsdocQuality,
    },
  },
  {
    name: "jsdoc-vue-props",
    files: ["**/*.vue"],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          enableFixer: true,
          contexts: ["TSPropertySignature"],
        },
      ],
      ...jsdocQuality,
      ...jsdocCorrectness,
    },
  },
);
