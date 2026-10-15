# Redesign from zero; drop daisyUI, keep Tailwind

Winnies' entire visual layer is being replaced by a new design created in Claude Design. Behaviour stays fixed; design is treated as greenfield. Nothing from the current look carries over: daisyUI themes, the `main.css` tokens and `type-*` classes, the player colours, the fonts. Claude Design is fed only the functionality inventory (`docs/research/functionality-inventory.md`) and trend references, never the current UI, so the old look can't leak back in.

We are removing daisyUI entirely. The aesthetics under exploration (claymorphism, liquid chrome, kawaii, cyberdelia, skeuo/neumorphism) depend on layered shadows, gradients and lighting per component. daisyUI's component classes and theme model would mostly have to be overridden, so keeping it would cost more than writing our own components. Tailwind v4 (CSS-first `@theme` tokens) stays, unless the final design needs something it blocks.

The old design is deleted as the **first implementation ticket**, immediately followed by the new tokens. It is not deleted before the new design exists, because that would leave the live app unstyled.

## Considered options

- **Keep daisyUI and write custom themes.** Rejected. Its themes only cover colour, radius and border tokens, not the shadow, material or motion systems these styles need.
- **Delete the old design right away.** Rejected. It ships a broken site and gains nothing, because the prompt pack doesn't depend on the old design being gone.
- **Strangler (old and new side by side).** Rejected. Two design systems in one app during the migration add complexity for no gain at this app's size.

## Consequences

- The light/dark theme switching shipped in 0.9.2 (#121) stays as _functionality_. The new design provides a light and a dark variant of one signature look. User-selectable "skins" are deferred, but the token structure must allow them.
- Motion is a first-class part of the design. `prefers-reduced-motion` turns off all animation.
- The design is desktop-only at first. Mobile is a separate, later effort.
