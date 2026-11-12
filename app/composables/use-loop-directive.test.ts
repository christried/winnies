import type { DirectiveBinding, ObjectDirective } from "vue";
import type { LoopSpec } from "../utils/motion/loop-sync";
import type { WinniesMotion } from "../utils/motion/types";
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h, ref, withDirectives } from "vue";
import { renderToString } from "vue/server-renderer";
import { fakeElement } from "../../tests/support/fake-motion";
import { useLoopDirective } from "./use-loop-directive";
import { provideWinniesMotion } from "./use-winnies-motion";

type LoopDirective = ObjectDirective<HTMLElement, LoopSpec>;

// A layout as a surface has one, and a component below it that calls `useLoopDirective()` in its setup, as
// `<script setup>` does. `seen` collects the directive the component got.
function surface(seen: { directive?: LoopDirective; m?: WinniesMotion }, body: (v: LoopDirective) => ReturnType<typeof h>) {
  const child = defineComponent({
    setup() {
      const vLoop = useLoopDirective();
      seen.directive = vLoop;
      return () => body(vLoop);
    },
  });
  return defineComponent({
    setup() {
      seen.m = provideWinniesMotion({
        root: ref(null),
      });
      return () => h("div", h(child));
    },
  });
}

async function render(component: ReturnType<typeof defineComponent>) {
  return renderToString(createSSRApp(component));
}

// Calls a hook the way Vue would, with a binding that carries the values and nothing else.
function mounted(dir: LoopDirective, el: HTMLElement, value: LoopSpec) {
  dir.mounted?.(el, { value } as DirectiveBinding<LoopSpec>, null as never, null as never);
}
function updated(dir: LoopDirective, el: HTMLElement, value: LoopSpec, oldValue: LoopSpec) {
  dir.updated?.(el, { value, oldValue } as DirectiveBinding<LoopSpec>, null as never, null as never);
}
function unmounted(dir: LoopDirective, el: HTMLElement) {
  dir.unmounted?.(el, {} as DirectiveBinding<LoopSpec>, null as never, null as never);
}

describe("on the server", () => {
  it("renders the same HTML with the directive as without, and touches no browser global", async () => {
    const withLoop = await render(surface({}, v => withDirectives(h("div", { id: "x", class: "a" }, "hi"), [
      [v, "breathe"],
    ])));
    const without = await render(surface({}, () => h("div", { id: "x", class: "a" }, "hi")));

    // The test runs in node: a stray `document`, `window` or `IntersectionObserver` access would have thrown.
    expect(typeof document).toBe("undefined");
    expect(withLoop).toBe(without);
    expect(withLoop).toContain("<div id=\"x\" class=\"a\">hi</div>");
  });
});

describe("the hooks", () => {
  // The directive is made once per component, at setup, so the hooks below are the ones a template would reach.
  async function directive() {
    const seen: Parameters<typeof surface>[0] = {};
    await render(surface(seen, () => h("span")));
    return seen.directive as LoopDirective;
  }

  it("mounted starts the loop on the element", async () => {
    const dir = await directive();
    const el = fakeElement();

    mounted(dir, el as unknown as HTMLElement, "breathe");

    expect(el.calls).toHaveLength(1);
    expect(el.calls[0]?.options.iterations).toBe(Infinity);
    expect(el.animations[0]?.startTime).toBe(0);
  });

  it("mounted reads the object form with its delay", async () => {
    const dir = await directive();
    const el = fakeElement();

    mounted(dir, el as unknown as HTMLElement, { name: "bob", delay: -220 });

    expect(el.calls[0]?.options.delay).toBe(-220);
  });

  it("updated switches the loop when the name changes", async () => {
    const dir = await directive();
    const el = fakeElement();
    mounted(dir, el as unknown as HTMLElement, "breathe");

    updated(dir, el as unknown as HTMLElement, "glow", "breathe");

    expect(el.animations).toHaveLength(2);
    expect(el.animations[0]?.cancelled).toBe(true);
    expect(el.animations[1]?.cancelled).toBe(false);
  });

  it("updated does nothing when the value is unchanged, in either form", async () => {
    const dir = await directive();
    const el = fakeElement();
    mounted(dir, el as unknown as HTMLElement, { name: "bob", delay: 110 });

    updated(dir, el as unknown as HTMLElement, { name: "bob", delay: 110 }, { name: "bob", delay: 110 });
    updated(dir, el as unknown as HTMLElement, "ring", "ring");

    expect(el.animations).toHaveLength(1);
    expect(el.animations[0]?.cancelled).toBe(false);
  });

  it("updated starts a loop that a falsy value had stopped, and stops one a falsy value replaces", async () => {
    const dir = await directive();
    const el = fakeElement();
    mounted(dir, el as unknown as HTMLElement, false);
    expect(el.calls).toHaveLength(0);

    updated(dir, el as unknown as HTMLElement, "ring", false);
    expect(el.animations).toHaveLength(1);

    updated(dir, el as unknown as HTMLElement, false, "ring");
    expect(el.animations[0]?.cancelled).toBe(true);
  });

  it("unmounted cancels the loop", async () => {
    const dir = await directive();
    const el = fakeElement();
    mounted(dir, el as unknown as HTMLElement, "breathe");

    unmounted(dir, el as unknown as HTMLElement);

    expect(el.animations[0]?.cancelled).toBe(true);
  });

  it("keeps two elements' loops apart and in one phase", async () => {
    const first = await directive();
    const a = fakeElement();
    const b = fakeElement();

    mounted(first, a as unknown as HTMLElement, "ring");
    mounted(first, b as unknown as HTMLElement, "ring");
    unmounted(first, a as unknown as HTMLElement);

    expect(a.animations[0]?.cancelled).toBe(true);
    expect(b.animations[0]?.cancelled).toBe(false);
    expect(b.animations[0]?.startTime).toBe(0);
  });
});

describe("outside a surface", () => {
  // Vitest does not set import.meta.dev, so this runs as in production: the inert engine, which animates nothing. In
  // development the call throws, as every component's does (`use-winnies-motion.test.ts`).
  it.skipIf(import.meta.dev)("creates no animation in production", async () => {
    const seen: { directive?: LoopDirective } = {};
    await render(defineComponent({
      setup() {
        seen.directive = useLoopDirective();
        return () => h("span");
      },
    }));
    const el = fakeElement();

    mounted(seen.directive as LoopDirective, el as unknown as HTMLElement, "breathe");

    expect(el.calls).toHaveLength(0);
  });
});
