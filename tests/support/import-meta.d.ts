// This project's server/db/index.ts reads `import.meta.dev`, which Nitro defines and the `node` types do not.
// tests/api/dev-reset.test.ts imports server code through it (with the database replaced), and this tsconfig
// does not have Nuxt's types.
interface ImportMeta {
  readonly dev: boolean;
}
