// What `#components` is in Storybook. In the app it exports every component, `Icon` of `@nuxt/icon` among them; that one
// cannot render without the Nuxt app (`useNuxtApp`, `#build/nuxt-icon-svg`). This stub draws the same `<svg>` from the
// tabler set on disk. It goes when `UiIcon` stops using `@nuxt/icon` (#308).
import { defineComponent, h } from "vue";
import { iconBody } from "./icons.ts";

export const Icon = defineComponent({
  name: "Icon",
  props: {
    /** Iconify name, `tabler:plus`. */
    name: { type: String, required: true },
    /** Size in px, set as the `font-size` the 1em svg takes, like `@nuxt/icon`. */
    size: {
      type: [Number, String],
      default: undefined,
    },
  },
  setup(props) {
    return () => h("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      width: "1em",
      height: "1em",
      style: props.size === undefined
        ? undefined
        : {
            fontSize: typeof props.size === "number"
              ? `${props.size}px`
              : props.size,
          },
      innerHTML: iconBody(props.name),
    });
  },
});
