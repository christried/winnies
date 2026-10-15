# Winnies · full process archive (NOT the handoff)

**This folder is the complete design process, not the implementation handoff.** If you're building Winnies, start in **`design_handoff_winnies/`** (also inside this folder as a copy, and shipped on its own). The handoff is curated, final and self-sufficient.

Look in here only for niche situations: tracing why a decision was made, recovering a direction or variant that was dropped, checking an earlier token value, reusing an exploration, or reading the reasoning behind a component. Lots of things in here are **superseded**. When anything here disagrees with the handoff, **the handoff wins**.

Everything was copied as-is, so there's deliberate duplication: screens, tokens, assets and the handoff itself show up more than once.

## How to open files
`.dc.html` files are HTML prototypes that run on the bundled runtime (`support.js`). Serve the folder (`npx serve .`) and open any file in a browser. Board files lay out many frames on a pan/zoom canvas.

## Map of the process
| Phase | Files | Status |
|---|---|---|
| 1 · Seven directions | `01 Pure Clay` … `07 Neumorphic Kawaii`, `Winnies Directions Board.dc.html`, `Gameplay.dc.html` (gameplay stand-in), `winnies-core.js` (shared motion helpers of that phase), `shots/` (comparison screenshots) | Exploration. 04 Kawaii Clay was the one carried forward. |
| 2a · Remixes | `Remix A Clay Gadget` … `Remix E Pocket Pet`, `Winnies Remix Board.dc.html`, `P2 brief.md` | Exploration. |
| 2b · Narrow + push | `P2b Kawaii Clay`, `P2b Pocket Pet`, `P2b Pocket Pet Variants`, `KawaiiScreens`, `KawaiiScreensP2b`, `PetScreens`, `ClayFace` (faces + Nini) | Kawaii Clay chosen; Pocket Pet dropped. `ClayFace` is still used by final screens. |
| 2c · Lock | `Winnies Kawaii Clay Lock.dc.html` | Genome, dialects, wordmark, Nini locked. |
| 3 · Design system | `readme.md`, `SKILL.md`, `styles.css`, `tokens/winnies-tokens.css` (v1.1, superseded by the handoff’s v1.2), `components/` (reference CSS + specimen cards), `guidelines/` (foundation cards), `assets/faces/`, `Winnies Design System.dc.html` | Final foundations. The handoff has the updated token file. |
| 4 · Motion | `motion/winnies-motion.js`, `motion/motion-spec.js`, `Winnies Motion Spec.dc.html`, `Winnies Motion Playground.dc.html` | Final (engine copied into the handoff). |
| 5 · Core screens | Boards: `Workspace States`, `Modals and Sign-in`, `Shared View`, `Overlay`, `Landing`, `Changelog`. Screens: `WinniesWorkspace`, `SharedView`, `OverlayFrame`, `LandingPage`, `ChangelogPage`, `OGCard`. `image-slot.js` = placeholder image slots. | Final. |
| 6a · Planned features | `P6a Planned Features` board; `WorkspaceP6`, `WinnieSettings`, `CompletionStats`, `SharedViewP6`, `OverlayFrameP6` | Final designs for planned features. |
| 6b · Future features | `P6b Future Features` board; `P6bWorkspace`, `P6bShared`, `P6bOverlay` | Proposals. |
| 7 · Handoff | `design_handoff_winnies/` | **Start here for implementation.** |

## Known quirks
- Frame IDs restart per board: the Changelog board labels its frames 18a/18b, which clash with the Overlay board’s 18a–18i (the handoff calls them CL-a/CL-b).
- Phase 1–2 files use their own inline colours and fonts (each direction had its own palette); they don’t read the token file.
- Image slots keep any image dropped into them in the browser’s local storage, so they appear empty on a fresh machine.
