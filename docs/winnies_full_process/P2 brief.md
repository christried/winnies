# Phase 2a: Remix (brief, condensed)
5 remix candidates. Each of 6 layers (Material, Palette, Type, Backdrop, Motion, Ornament/mascot) taken from a named P1 direction or a blend of two; must read as ONE product.
- A (user): Material #1, Palette #1, Type #6, Backdrop #1+6, Motion #1+6, Ornament #1+6. "Love Clay + bounciness, also like the techiness."
- B–E: my wildcards, clay-centric (pure clay or clay mixed). Kawaii Clay needs more exploration; keep pure-clay and kawaii-clay lines for side comparison. One-line recipe rationale each. Research what others do with clay.
Per candidate: Workspace mid-run + Overlay (P1 specs/sample data); genome card with each layer annotated with source direction(s); dialect sketch (Workspace / Broadcast / Showcase vignette each — material+motion lean, palette/type/mascot shared); motion sketch (per-second tick + Won) running. Then a comparison board of all 5.

## Phase 2b (narrow + push)
Kept: 04 Kawaii Clay → `P2b Kawaii Clay` (K+), Remix E → `P2b Pocket Pet` (E+, Rich + Simple) + `P2b Pocket Pet Variants`. Others dropped for now.
Shared: `ClayFace` (moods: new, snooze, fresh/focus/sweat/tired/grumpy/fuming by run secs [20m,1h,2h,3h,4h], won star/happy/relief by duration; shape mochi = Nini). Screens: `KawaiiScreens` (mode, base, bg, wordmark, live), `PetScreens` (mode, density, header, shell, bg, wordmark, live). Overlay = simple card, no mascot/toy. Toy header = Pet option only. Perf: frozen minis (live=false); face amb only when visible.

## Research notes (clay, 2025-26)
- Claymation look: matte plasticine, visible fingerprints/tool marks, slight imperfection; motion "on twos" (stepped ~12fps) is the stop-motion signature.
- Solid "lip" shadow buttons (Duolingo-style) = tactile clay in product UI.
- Dark claymorphism: clay on off-black, soft rim light.
- Inflated / puffy 3D chrome (balloon type, Y2K revival).
- Toy-electronics (Teenage Engineering / Tamagotchi): soft plastic + LCD + pixel pets.

## Core API (winnies-core.js)
mount(this, M). M: wonDelay, amb{name:[kf,opts]}, tick(kind,el,W), beat(name,el,W), won(el,W,isOv), land(el,W,isOv), complete(root,W).
DOM hooks: data-amb(+data-ad delay ms), data-chg="{{d.chg}}"+data-kind, data-beat (non-empty), data-row / data-orow, data-demo, data-nini etc custom.
vals(): rows/ovRows [{id,n,game,cond,hasCounter,count,target,countStr,full,time,td[{k,c,sep,num,chg}],running,won,idle,untouched,pinned,hover,menu,status,statusWord,playIcon,playLabel,winLabel,menuItems[{k,icon,label,first,danger}],onWin,onPlay,onMenu,onInc,onDec}], pageDots[{k,on}], pageLabel, totalDigits, wonCount,totalCount,pct,pctStr,summary,runningLabel,live,paused,totalBtnLabel,totalBtnIcon,onTotal,complete,onReplayWon,onReplayComplete.
W.burst(el,{n,shapes:circle|square|star|bar|text:X,colors,size,spread,gravity,dur,ox,oy,up,cone,spin,font,easing,endScale,style}).
File pattern: root ref, width 3584, padding 80, flex-wrap gap 64; view prop full|workspace|overlay; ws artboard 1440x1400 at (80,80); overlay 1920x1080 with <dc-import name="Gameplay" style="position:absolute;inset:0" hint-size="100%,100%">. Board crops via scale + translate(-80px,-80px).
