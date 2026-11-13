import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, waitFor, within } from "storybook/test";
import { defineComponent, ref } from "vue";
import { resolved } from "../support/html";
import { expectQuietWhenReduced } from "../support/motion-checks";
import { block, page, readout, reset, section } from "../support/motion-kit";
import { clickReplay, live, withMotion } from "../support/motion-play";
import { useMotionStory, withMotionSurface } from "../support/motion-surface";

// Editing (R11, R12, R33, #305): a field that opens, a text that hops when its value is saved, and the shake of a
// refused value. One element each, played by the engine's recipes.

const Edit = defineComponent({
  name: "EditStory",
  setup() {
    const { m } = useMotionStory();
    const field = ref<HTMLElement | null>(null);
    const text = ref<HTMLElement | null>(null);
    const refused = ref<HTMLElement | null>(null);

    const editIn = () => {
      reset(field.value);
      m.editIn(field.value);
    };
    const hop = () => {
      reset(text.value);
      m.hopText(text.value);
    };
    const shake = () => {
      reset(refused.value);
      m.shake(refused.value);
    };

    return () => page("Edit", {
      replay: () => {
        editIn();
        hop();
        shake();
      },
    }, [
      section({
        id: "edit-in",
        title: "Edit in",
        moment: "R11",
        replay: editIn,
      }, [
        block({ ref: field, w: 200, h: 40 }),
        readout("dialect", () => document.body.dataset.dialect ?? "workspace"),
        readout("gain", () => resolved("--motion-gain")),
      ]),
      section({
        id: "hop",
        title: "Hop",
        moment: "R12",
        replay: hop,
      }, [
        block({ ref: text, w: 120, h: 24 }),
      ]),
      section({
        id: "shake",
        title: "Shake",
        moment: "R33",
        replay: shake,
      }, [
        block({
          ref: refused,
          w: 120,
          h: 40,
          tone: "muted",
        }),
      ]),
    ]);
  },
});

const meta = {
  title: "Motion/Edit",
  decorators: [withMotionSurface],
  parameters: { motion: {} },
  render: () => Edit,
} satisfies Meta;

export default meta;

export const Default: StoryObj<typeof meta> = {
  async play({ canvasElement, step }) {
    // The story mounts one tick after the surface has read its tokens, so the first element has to be waited for.
    await within(canvasElement).findByRole("button", { name: "Replay" });

    await step("each section plays one animation on its own block", () => withMotion("full", async () => {
      for (const id of ["edit-in", "hop", "shake"]) {
        await clickReplay(canvasElement, id);
        await waitFor(() => expect(live().length).toBe(1));
        const target = (live()[0]?.effect as KeyframeEffect | null)?.target;
        expect(target).toBeInstanceOf(HTMLElement);
        expect((target as HTMLElement).closest(`[data-section="${id}"]`)).not.toBeNull();
        await waitFor(() => expect(live()).toHaveLength(0));
      }
    }));

    await step("a replay creates no animation when reduced", () => expectQuietWhenReduced(canvasElement));
  },
};
