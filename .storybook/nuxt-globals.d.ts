// This project's tsconfig does not have Nuxt's types, and the motion stories (stories/support/motion-surface.ts) import
// composables that mention three of its globals. The stories never reach those calls: `provideSurfaceClock` is handed a
// source and a ref, and `useMotionStory` throws before `import.meta.dev` could matter. Precedent:
// tests/support/import-meta.d.ts. A global script on purpose: no top-level import.
interface ImportMeta {
  readonly dev: boolean;
}
declare function useServerClock(): { now: () => number };
declare function useState<T>(key: string, init: () => T): import("vue").Ref<T>;
