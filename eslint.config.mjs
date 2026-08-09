// @ts-check
import antfu from "@antfu/eslint-config";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import withNuxt from "./.nuxt/eslint.config.mjs";

// A doc block must earn its place: no type tags (TypeScript already has them),
// no restating the name, no empty shells.
const jsdocQuality = {
  "jsdoc/require-param-description": "error",
  "jsdoc/require-returns-description": "error",
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
      "unicorn/filename-case": ["error", { case: "kebabCase" }],

      "vue/max-attributes-per-line": ["error", {
        singleline: { max: 2 },
        multiline: { max: 1 },
      }],

      "node/no-process-env": "error",
    },

    ignores: [
      "design/**",
      ".nuxt/**",
      ".output/**",
      "**/migrations/**",
      ".pnpm-store/**",
    ],
  }),
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
    },
  },
  {

    name: "jsdoc-public-api",
    files: ["app/utils/**/*.ts", "app/composables/**/*.ts", "server/utils/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": ["error", {
        enableFixer: false,
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          ArrowFunctionExpression: true,
          FunctionExpression: true,
        },
        contexts: ["TSTypeAliasDeclaration", "TSInterfaceDeclaration"],
      }],
      ...jsdocQuality,
    },
  },
  {
    name: "jsdoc-vue-props",
    files: ["**/*.vue"],
    rules: {
      "jsdoc/require-jsdoc": ["error", {
        enableFixer: false,
        contexts: ["TSPropertySignature"],
      }],
      ...jsdocQuality,
      ...jsdocCorrectness,
    },
  },
);
