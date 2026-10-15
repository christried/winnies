# Motion is a hand-rolled Web Animations engine

All motion in the redesign runs through a port of the handoff's framework-free engine (`docs/design_handoff_winnies/reference/motion/winnies-motion.js`) to TypeScript: plain Web Animations API, recipes kept under their spec names, with a thin `useWinniesMotion()` composable that each surface's layout creates once and provides. No animation library. The springs are already written out as CSS `linear()` curves in the tokens, the engine is about 320 lines, and every kilobyte also lands on the Overlay, which runs for hours in an OBS browser source.

## Considered options

- **Vue-native rewrite (directives and `<Transition>` presets, no engine object).** Rejected: it scatters the recipes across components and loses the one-to-one mapping to the spec's moment IDs. Vue is only the adapter: a loop directive, `<Transition :css="false">` hooks for enter and leave, template refs for one-shots.
- **Motion (`motion.dev`, `motion-v`) or GSAP.** Rejected: a dependency for what WAAPI already does, and their spring physics drift from the spec's exact `linear()` curves.
- **Remotion or HyperFrames.** Not applicable: they render video files, not live interface motion. They remain candidates for Landing video.

## Consequences

- Components call recipes imperatively. List moves use the engine's FLIP, not `<TransitionGroup>`.
- One clock per surface, a second-aligned timer instead of a rAF loop; ambient loops never touch it because they run on the compositor.
- The server always renders the reduced-motion end state. Moments that play on load start from a CSS pose that applies only while motion is allowed.
- New moments are written as engine recipes, so the engine is the one place that knows about tiers, reduced motion and the token-driven knobs.
