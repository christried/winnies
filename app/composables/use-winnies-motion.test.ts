import type { WinniesMotion } from "../utils/motion/types";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import ParticleLayer from "../components/particle-layer.vue";
import { provideWinniesMotion, resolveSurface, useWinniesMotion } from "./use-winnies-motion";

// A layout as a surface has one: it provides the instance, then renders its slot. `seen` collects what the provider
// and what a component below it get.
function layout(seen: { provided?: WinniesMotion; injected?: WinniesMotion[] }) {
  return defineComponent({
    setup(_props, { slots }) {
      seen.provided = provideWinniesMotion({
        root: ref(null),
      });
      return () => h("div", slots.default?.());
    },
  });
}

function child(seen: { injected?: WinniesMotion[] }) {
  return defineComponent({
    setup() {
      (seen.injected ??= []).push(useWinniesMotion());
      return () => h("span");
    },
  });
}

async function render(component: ReturnType<typeof defineComponent>) {
  return renderToString(createSSRApp(component));
}

describe("a surface", () => {
  it("gives every layout its own instance, and its components that layout's instance", async () => {
    const one: Parameters<typeof layout>[0] = {};
    const two: Parameters<typeof layout>[0] = {};
    const a = layout(one);
    const b = layout(two);

    await render(defineComponent({
      render: () => h(a, () => h(child(one))),
    }));
    await render(defineComponent({
      render: () => h(b, () => h(child(two))),
    }));

    expect(one.provided).toBeDefined();
    expect(two.provided).toBeDefined();
    expect(one.provided).not.toBe(two.provided);
    expect(one.injected).toHaveLength(1);
    expect(one.injected?.[0]).toBe(one.provided);
    expect(two.injected?.[0]).toBe(two.provided);
  });

  it("runs no animation and touches no browser global when it is rendered on the server", async () => {
    // The test runs in node: a stray `window`, `document` or `matchMedia` access would throw. `onMounted` does not run
    // in a server render, so the instance is never started.
    const seen: Parameters<typeof layout>[0] = {};

    await render(defineComponent({
      render: () => h(layout(seen), () => h(child(seen))),
    }));

    expect(typeof document).toBe("undefined");
    expect(seen.provided?.on("resp")).toBe(true);
    expect(seen.provided?.T().C.gain).toBe(1);
  });
});

describe("outside a surface", () => {
  // Vitest does not set import.meta.dev, so the component-level call runs as in production here; the development
  // behaviour is pinned through resolveSurface below.
  it.skipIf(import.meta.dev)("useWinniesMotion() gives an inert engine in production", async () => {
    const seen: { injected?: WinniesMotion[] } = {};

    await render(child(seen));

    expect(seen.injected?.[0]?.on("resp")).toBe(false);
  });

  it("resolveSurface throws when strict and gives an inert engine when not", () => {
    expect(() => resolveSurface(null, true)).toThrow(/outside a surface/);

    const first = resolveSurface(null, false);
    expect(first.m.on("resp")).toBe(false);
    expect(first.m.on("amb")).toBe(false);
    expect(first.layer.value).toBeNull();
    // A new one on every call: an engine holds subscribers, and sharing one between requests would leak.
    expect(resolveSurface(null, false).m).not.toBe(first.m);
  });

  it("resolveSurface hands back the surface it was given", () => {
    const found = resolveSurface(null, false);

    expect(resolveSurface(found, true)).toBe(found);
  });
});

describe("<ParticleLayer>", () => {
  it("renders one empty, hidden, click-through, full-viewport layer at the confetti z-index", async () => {
    const html = await render(defineComponent({
      setup() {
        provideWinniesMotion({
          root: ref(null),
        });
        return () => h(ParticleLayer);
      },
    }));

    expect(html).toMatch(/^<div\b[^>]*><\/div>$/);
    expect(html).toContain("data-particle-layer");
    expect(html).toContain("aria-hidden=\"true\"");
    expect(html).toContain("class=\"pointer-events-none fixed inset-0\"");
    expect(html).toContain("z-index:var(--z-confetti)");
  });
});
