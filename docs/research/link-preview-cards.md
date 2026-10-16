# Link-preview cards on Nuxt 4 and Vercel

**Ticket:** #188 "Tooling for link-preview cards on Nuxt 4 and Vercel" (child of map #166). Feeds #189 "What each link-preview card shows" (product decision, not made here). Old request: #152 "[FEAT] Thumbnails".
**Scope:** how to produce `og:image` plus meta on this stack; font loading with the handoff fonts; caching and staleness per platform; Vercel cost and limits; image sizes and tags for Discord, X and Bluesky.
**Commit:** `e2b7484` (HEAD when the ticket started; tree was clean). This file is new and uncommitted.
**Date:** 2026-10-16.

**Method.** Read-only. No app code, lockfile or package changed; nothing was installed; nothing was written to GitHub by this file. Repo facts come from the files named below. Versions come from the npm registry (`registry.npmjs.org`, queried 2026-10-16). Upstream source facts come from `gh api` reads of `vercel/satori` and `bluesky-social/atproto` / `social-app`. Vendor claims come from the official docs pages named in Sources.

Two gaps matter. X's developer docs returned HTTP 402 or redirected to the docs index, and web.archive.org was unavailable, so X claims below come from search snippets and forum threads and are marked **unverified**. The nuxt-og-image docs site describes v6 while npm's `latest` is 7.0.7, so the two disagree (see section 2A).

Labels: **[verified]** = read from a primary source in this session. **[unverified]** = secondary source, snippet only, or inference. **[measured]** = not measured; this file gives estimates only.

---

## Answer in brief

- **Static cards (Landing, Changelog):** prerender a PNG at build time, or check one in. The response can be cached for a year, immutable. No runtime cost. This is the simplest part.
- **Dynamic per-Winnie card:** feasible on Vercel. `nuxt-og-image` with the **Takumi** renderer is the option with the least custom code. A hand-rolled `@vercel/og` route is the fallback, but it needs the handoff fonts converted to TTF/OTF/WOFF, and it is less documented for Nitro.
- **Live state cannot reach the platforms.** Discord caches a preview for about 30 minutes. X keeps card content for about 7 days **[unverified]**. Bluesky copies the card into the post record when the post is made, so it never refreshes. A Winnie's `won / total` and Live/Paused state can only show as a snapshot.
- **Cost:** low at expected traffic. Each cache miss costs Active CPU; CDN caching keeps misses rare. Hobby includes 4 Active CPU hours a month. Estimate in section 5 is arithmetic on list prices, not a measurement.
- **Blockers found:**
  - The current `nuxt-og-image` (7.0.7) needs Nuxt `^4.6.1 || ^5`. The repo pins `nuxt` 4.5.1, so a Nuxt bump is needed first, or use `nuxt-og-image` 6.10.4 with Nuxt 4.5.2 or later.
  - The handoff OG copy conflicts with settled constraints: "Free for streamers" (copy must never say "free"), and "{owner}'s Winnie" on the Winnie card (no Owner name on public surfaces). Flagged for #189; not decided here.

---

## 1. Repo facts

| Item | Value | Source |
|---|---|---|
| Nuxt pinned | `nuxt` 4.5.1 (`pnpm-lock.yaml`, `nuxt@4.5.1`); `package.json` says `^4.5.1` | `package.json`, `pnpm-lock.yaml` |
| Nuxt latest on npm | `latest` 4.6.2, `4x` 4.6.1 | npm dist-tags, [verified] |
| Nitro | `nitropack` 2.13.4 (lock) | `pnpm-lock.yaml` |
| Modules | `@nuxt/fonts` 0.14.0, `@nuxt/content` 3.16.0, `@nuxt/icon`, `@pinia/nuxt` | `nuxt.config.ts`, `package.json` |
| Font defaults | `fonts.defaults.weights: [400, 500, 600, 700]`; **800 is not listed** but the handoff OG copy uses weight 800 | `nuxt.config.ts`, `OGCard.dc.html` |
| SSR | No `ssr` key in `nuxt.config.ts`, so SSR is on by default. Meta must be server-rendered (Discord needs it in the HTML; see 4A) | `nuxt.config.ts` |
| OG tags today | None. `grep` for `og:image`, `twitter:card`, `useSeoMeta` finds only `changelog.vue` (`useSeoMeta`) and the Shared View's `robots: noindex, nofollow` | `app/` |
| Shared View route | `app/pages/shared/[slug]/index.vue`; Overlay at `.../overlay.vue` | `app/pages/` |
| Database | Neon serverless (`@neondatabase/serverless` 1.1.0) with Drizzle | `server/db/index.ts` |
| Node | engines `^24.11.0`; `.nvmrc` 24 | `package.json`, `.nvmrc` |
| robots.txt | `User-agent: *`, empty `Disallow:` (everything allowed) | `public/robots.txt` |
| Hosting | Vercel (per the ticket); plan (Hobby or Pro) not checked | ticket |

---

## 2. Options

### 2A. `nuxt-og-image` (Satori, Takumi or browser renderer)

**Versions [verified].** npm dist-tags: `latest` 7.0.7, `latest-6` 6.10.4, `beta` 6.0.0.
- `nuxt-og-image@7.0.7` peer: `nuxt` `^4.6.1 || ^5.0.0`. Renderer peers: `satori` `^0.47.1`, `@resvg/resvg-js` `^2.6.2`, `@takumi-rs/core` and `@takumi-rs/wasm` `^2.15.0`, `playwright-core` `^1.64.0` and `chrome-launcher` `^1.2.2` (browser renderer). Engines: Node `^22.22.3 || ^24.15.0 || >=26.0.0`.
- `nuxt-og-image@6.10.4` depends on `@nuxt/kit` `^4.5.2` (devDependency `nuxt` `^4.5.2`). Engines Node `>=18.0.0`.
- The docs site (`nuxtseo.com/docs/og-image/...`) pages I read describe v6 ("v6 is here"); a search result labels the docs as "v6 beta". Treat the docs and npm 7.x as possibly inconsistent and re-read the 7.x docs before implementing.

**Renderers [verified, docs].**
- **Takumi** (recommended): Rust renderer that rasterises straight to PNG, JPEG or WebP. Claims 2-10x faster than Satori+Resvg. Broad CSS: flexbox, CSS grid, gradients, box and text shadows, transforms, filters, masks, blend modes, `object-fit`. Fonts: variable fonts, WOFF2, COLR emoji. No SVG output. Source: `https://nuxtseo.com/docs/og-image/renderers/takumi`.
- **Satori** (SVG-based): produces SVG, then Resvg makes PNG. Font formats depend on the Satori version (see section 3).
- **Browser**: full CSS via screenshots. The docs say "prerender only". It needs `playwright-core` and `chrome-launcher`. Not a fit for on-demand Vercel functions.
- Enable with `npx nuxt-og-image enable takumi` (CLI, not a config key). Pick the renderer per template by filename, e.g. `components/OgImage/MyTemplate.takumi.vue`. Disable Takumi with `ogImage.compatibility.runtime.takumi: false`. A production build fails if a template's renderer is not installed. Source: `https://nuxtseo.com/docs/og-image/getting-started/installation`, `.../renderers/takumi`.

**Nuxt 4 and Vercel [verified, partial].**
- Install page: the CLI auto-detects edge targets (Cloudflare, Vercel Edge) and installs Wasm variants; `--edge` forces it. Runtime (Node vs Edge) for Vercel is not detailed. Takumi on Vercel Edge uses `@takumi-rs/wasm`; on Node it uses the native `@takumi-rs/core`.
- Nitro's Vercel preset deploys to Vercel Functions. Its `entryFormat` defaults to `"web"` and can be `"node"` (`https://nitro.build/deploy/providers/vercel`).

**Caching [verified, runtime-cache guide].**
- Default runtime cache TTL: `cacheMaxAgeSeconds`, default `60 * 60 * 24 * 3` (72 hours), set globally or per image.
- Default store: in-memory LRU under `cache/nuxt-og-image`, capped at 64 MiB of entries. Lost on restart or redeploy. Persistent storage: `nitro.storage.cache` (recommended), or `ogImage.runtimeCacheStorage`. The guide has Cloudflare KV, Redis and NuxtHub examples and **no Vercel storage example**.
- Cache keys: the image URL encodes all options; query strings give separate entries. `cacheKey` overrides the key. `cacheVersion` defaults to the module version, so upgrading the module invalidates the cache.
- Headers: dynamic routes `public, max-age=259200, s-maxage=259200, immutable` (259200 s = 3 days, equal to the default TTL). Prerendered `/_og/s/**`: `public, max-age=31536000, immutable`.
- Purge: `?purge=<token>` on the image URL, where the token is derived from the server secret (`deriveSecret('nuxt-og-image:url-signing')`). Purging does **not** clear CDN edge caches; redeploy or purge via the CDN.
- Build cache (`buildCache: true`) only stores images between CI builds. It is not Vercel's ISR store (`https://nuxtseo.com/docs/og-image/guides/build-cache`).

**Trade-off in one line:** least code and best-documented path for Nuxt, but the module is on a fast-moving major version with a Nuxt peer the repo does not yet meet, and its default CDN max-age (3 days) works against live state unless lowered.

### 2B. Hand-rolled `@vercel/og` route

**[verified, Vercel docs]** `https://vercel.com/docs/og-image-generation`.
- Uses Satori and Resvg to convert HTML/CSS to PNG. Recommended size 1200x630.
- Supported: basic flexbox layouts, absolute positioning, custom fonts, text wrapping, nested images. Grid is not supported ("Advanced layouts (`display: grid`) will not work") in the page's own wording; this contradicts current Satori (grid supported in 0.47.1 README), so treat the Vercel page as the older reference.
- Fonts: **only `ttf`, `otf` and `woff`** (not WOFF2). TTF or OTF preferred for parse speed.
- Bundle: **maximum 500 KB**, including JSX, CSS, fonts and images.
- Runtime: Node.js is supported. The Vercel doc's Next.js examples use `ImageResponse` from `next/og` or `@vercel/og`. Nitro/Nuxt usage is not documented there; treat it as a spike.
- Caching: "`@vercel/og` automatically adds the correct headers to cache computed images on the CDN". The exact header is not stated **[unverified]**.
- Recommends `Allow: /api/og/*` in robots.txt so social crawlers can fetch it (the repo's robots.txt already allows everything).

**Trade-off:** no module upgrade risk and fewer moving parts, but you own the font conversion, the 500 KB budget, the cache headers and the Nuxt wiring.

### 2C. Static images

- Prerendered (`prerender` route or build-time generation) or a checked-in PNG, referenced by an absolute `og:image` URL. Prerendering needs the site URL; without it `og:image` becomes relative and the build warns **[verified, nuxt-og-image installation page]**.
- Right for Landing and Changelog. Cannot show a Winnie's state.

### 2D. Vercel CDN and ISR for the dynamic route

**Cache-Control on a function [verified, Vercel CDN cache docs].** Only responses with `s-maxage` (or `CDN-Cache-Control` / `Vercel-CDN-Cache-Control`) are cached at the CDN. Limits: max 1 year TTL; cacheable response up to 10 MB (non-streaming); GET/HEAD with status 200, 404, 410, 301, 302, 307 or 308; no `set-cookie`, `private`, `no-cache` or `no-store`. Cache times are best effort.

**ISR [verified, Vercel ISR docs and Nitro docs].**
- Nuxt enables ISR with `routeRules` `isr`. Options: `expiration` (seconds; `false` = never), `group`, `allowQuery`, `passQuery`, `exposeErrBody`. `isr: true` never expires. Do not combine `isr` and `prerender` on one route.
- On-demand revalidation: send `x-prerender-revalidate: <bypassToken>` to the path. Vercel says revalidation updates all regions within 300 ms.
- ISR cache persists until revalidated or unaccessed for 31 days. On a failed revalidation, Vercel serves stale content and retries after 30 s.
- **Why it matters:** ISR is the only Vercel mechanism here that can invalidate a card from the app when a Winnie's state changes, instead of waiting for a TTL. Cost: ISR writes and reads are billed.

### 2E. Summary

| Option | Nuxt 4 fit | Dynamic | Fonts | Cache control | Main risk |
|---|---|---|---|---|---|
| `nuxt-og-image` + Takumi | Module, Nuxt bump needed for 7.x | Yes | WOFF2 native | Module TTL + CDN headers; purge needs a CDN step | Version churn, docs/npm mismatch |
| `nuxt-og-image` + Satori | Same | Yes | Satori 0.47.1: TTF/OTF/WOFF; module converts WOFF2 | Same | Satori version pinned by the module, less CSS |
| Hand-rolled `@vercel/og` | Nitro not documented by Vercel | Yes | TTF/OTF/WOFF only; 500 KB bundle | You set `s-maxage` | More code, font conversion, budget |
| Static PNG (prerender or checked in) | Yes | No | Irrelevant | Immutable 1 year | Cannot show state |
| ISR `routeRules` on the image route | Supported by Nuxt on Vercel | Yes | Depends on renderer | Expiration and API revalidation | Write cost; one more mechanism |

---

## 3. Font loading with the handoff fonts

**Handoff fonts** (`docs/design_handoff_winnies/assets/fonts/fonts.css`, `02-tokens.md`): Mochiy Pop One 400 (display; all digits), M PLUS Rounded 1c 500, 700, 800 (body). Latin and Latin-Extended subsets only, which covers English and German; Japanese is not included. Licences: OFL-1.1 (`assets/fonts/licences/`), so embedding in generated images is allowed.

**Sizes [measured, file sizes only]:** woff2 Latin subsets 18.3 KB (Mochiy), 22.0 to 22.7 KB (M PLUS 500/700/800); Latin-Ext subsets 36.9 to 37.7 KB. TTF/OTF conversions are not measured here. Four TTF faces could approach the 500 KB `@vercel/og` budget; measure before choosing.

**Format support per renderer:**

| Format | Takumi (`@takumi-rs/*` 2.15+) | Satori 0.47.1 (pinned by nuxt-og-image 7) | Satori main (0.62.0, 2026-10-16) | `@vercel/og` |
|---|---|---|---|---|
| TTF | yes | yes | yes | yes |
| OTF | yes | yes | yes | yes |
| WOFF | yes (converted per module docs) | yes | yes | yes |
| WOFF2 | yes | **no** | yes | **no** |

Sources: Satori 0.47.1 README (`gh api repos/vercel/satori/readme?ref=0.47.1`: "Satori currently supports three font formats: TTF, OTF and WOFF. Note that WOFF2 is not supported at the moment."); Satori main README ("Satori supports four font formats: TTF, OTF, WOFF and WOFF2"); nuxt-og-image fonts page (WOFF2 converted to TTF for Satori); Vercel OG limitations page.

**Practical path:**
- Declare the fonts through `@nuxt/fonts` (`fonts.families` in `nuxt.config.ts`, with `name`, `weights`, `global: true`, `src` for local files) or add them to the module config. `@nuxt/fonts` already runs in this repo. Local `src` paths are supported; `@font-face` in global CSS and manual CDN links are not **[verified, nuxt-og-image fonts page]**.
- **Add weight 800** to the list. The repo's defaults are 400/500/600/700, and 600 is not in the handoff.
- **Non-Latin Winnie names:** the handoff subsets have no CJK, Cyrillic-only or Arabic glyphs; the Latin-Ext subset covers many European accents only. A name in another script would render as missing-glyph boxes. Needs a fallback font decision; not specified by the handoff.

**Satori CSS compatibility (0.47.1 README, [verified]):** box-shadow, text-shadow, CSS variables, grid, `lineClamp`, `overflowWrap`, `backgroundImage` (except `image-set` and `cross-fade`), transforms, `filter` (SVG-filter `url()` only) are supported. The handoff card's `var(--…)` values need resolving to plain values for the renderer chosen; check the `--grain` and `--fingerprint` textures, which may rely on unsupported filters **[unverified]**.

---

## 4. Caching and staleness

### 4A. Discord

- **Cache: about 30 minutes per link [verified, `https://docs.discord.com/developers/link-previews/overview`]:** "Discord caches previews for about 30 minutes." Editing tags and resharing the same URL shows the old card until the cache expires.
- **Cache busting: works [verified, same page]:** share the URL with a new query string such as `?v=2`. The Share Link is permanent and cannot be rotated (`CONTEXT.md`), so a busted URL is a second URL, not the canonical link. Decide with #189 whether that is acceptable.
- **Image cache:** the docs do not say how images are cached. Forum sources say the image is cached by URL **[unverified]**.
- **Must be in server HTML:** tags added by client-side scripts are never seen. Page must return 2xx `text/html`, at most 5 redirects, at most 50 MB, and the fetch including image measurement must finish within 10 s.
- **Debugger:** `https://discord.com/developers/embeds` shows the tags Discord read and the layout chosen.

### 4B. X (Twitter)

- **Cache: about 7 days [unverified].** The quote "Content is cached by Twitter for 7 days after a link to a page with card markup has been published in a Tweet" appears in a search snippet attributed to the Getting Started page. Not fetched. Forum staff say images are cached for up to 7 days; an older thread cites 24 hours for files.
- **Cache busting [unverified]:** forum reports say a new unique query string on the link forces a re-crawl; the Card Validator preview was removed in August 2022 (per a forum post), and previews now live in the Tweet Composer. X staff say new metadata may still take time to show.
- **Changing an image later does not update an existing tweet [unverified]**, consistent with the 7-day cache and with how posts work.

### 4C. Bluesky

- **Card built at post time [verified, `bluesky-social/social-app`].** `src/lib/link-meta/link-meta.ts` fetches metadata from `https://cardyb.bsky.app/v1/extract?url=…` (`src/lib/constants.ts`). The composer (`src/lib/api/index.ts`) downloads the thumbnail, resizes it with `IMAGE_SIZE_CONFIG_2K_1MB` (`maxDimension: 2000`, `maxSize: 1000000`), uploads it with `uploadBlob`, and writes the result into the `app.bsky.embed.external` record.
- **Consequence [inference from the code]:** the card is stored in the post record. Changing the page later does not change existing posts. A new post fetches fresh metadata. The cardyb service's own cache TTL is not public **[unverified]**, and cardyb's source is not in the atproto repo.
- Cache busting: not applicable to a stored post; a new post is the only refresh.

### 4D. What this means for "live"

No platform reflects a Winnie's state live. Discord shows what was fetched within about the last 30 minutes. X and Bluesky show a snapshot taken at share time (X's cache about 7 days, unverified; Bluesky permanent for that post). Vercel's own image cache adds up to the CDN `max-age` on top (nuxt-og-image default: 3 days). Lowering `cacheMaxAgeSeconds` or revalidating via ISR shortens the Vercel side only; it cannot change Discord's or X's caches. The grilling ticket (#189) should decide whether the card is a snapshot ("as of share") rather than a live readout.

---

## 5. Vercel cost and limits

**Plan limits [verified, `vercel.com/docs/limits` and `/docs/functions/limitations`]:**

| Limit | Hobby | Pro / Enterprise |
|---|---|---|
| Function max duration | 300 s default and max | 300 s default; 800 s max; 1800 s extended max (beta) |
| Function memory and CPU | 2 GB / 1 vCPU | default 2 GB / 1 vCPU; up to 4 GB / 2 vCPU |
| Function bundle size (uncompressed) | 250 MB | 250 MB |
| Request or response body (functions) | 4.5 MB | 4.5 MB |
| CDN cacheable function response | 10 MB (non-streaming) | 10 MB |
| Cache TTL max (CDN) | 1 year | 1 year |

**Included usage and prices [verified, `vercel.com/docs/functions/usage-and-pricing`, `vercel.com/docs/manage-cdn-usage`]:**

| Resource | Hobby (included) | Pro |
|---|---|---|
| Active CPU | 4 hours / month | on demand; e.g. `iad1` $0.128 per CPU-hour (cle1, pdx1 same; sfo1 $0.177) |
| Provisioned memory | 360 GB-hours / month | e.g. `iad1` $0.0106 per GB-hour |
| Invocations | 1,000,000 / month | $0.60 per 1M (from the page's example) |
| Fast Origin Transfer | first 10 GB | usage-based |
| Fast Data Transfer | first 100 GB | flat-rate CDN (per page) |
| CDN Requests | first 1,000,000 | flat-rate CDN (per page) |

Active CPU bills only while code runs; memory bills while an instance has requests in flight (page text).

**Estimate [measured: no; arithmetic on the list prices above; assumes 150 ms Active CPU per render, which is not measured]:**
- Hobby: 4 hours = 14,400 s; at 150 ms per render that is about 96,000 renders a month before CPU is exhausted.
- Pro, `iad1`: CPU about $0.0053 per 1,000 renders; invocations $0.0006 per 1,000; memory roughly $0.0009 per 1,000 if one 2 GB instance renders serially. Total about $0.007 per 1,000 renders. The CDN cache, not the renderer, sets the bill: the expensive case is every share preview missing cache.
- ISR adds writes and reads per revalidation (see Vercel ISR pricing, not fetched).

**Operational limits to plan for:** cold starts (not covered by any source read; measure), Neon queries on each miss (Neon pricing not checked), and purging the CDN after a design change (nuxt-og-image purge does not clear edge caches).

---

## 6. Image sizes and meta tags per platform

**Open Graph baseline [verified, `https://ogp.me/`]:** required `og:title`, `og:type`, `og:image`, `og:url`; optional `og:description`, `og:site_name`; image structured properties `og:image:width`, `og:image:height`, `og:image:alt` (alt "if the page specifies an og:image it should specify og:image:alt"). The spec gives no recommended pixel size.

**Discord [verified, docs.discord.com link-previews]:**
- Reads `og:title` (70 bytes, 3 lines), `og:description` (350 bytes, 20 lines), `og:site_name`, `og:image` (+`:url`, `:secure_url`), `twitter:image`, `og:image:width` / `og:image:height` (declare them; otherwise Discord fetches to measure), `og:image:alt`, `og:type`, `twitter:card` (`summary_large_image` changes layout), `theme-color`.
- Example size: `og:image` at **1200x630**. No formal recommendation or byte limit stated.
- Formats: `.png`, `.gif`, `.jpg`, `.jpeg`, `.webp`, `.avif`. Relative URLs must start with `/`. Up to 4 images; 2 or more form a gallery. Alt text up to 4,096 characters.

**X [unverified: developer docs not reachable]:**
- `twitter:card` = `summary_large_image`; `twitter:title`, `twitter:description`, `twitter:image` (must be publicly reachable; staging and private hosts show no image).
- Image per search snippets quoting X docs: 2:1 aspect; min 300x157; max 4096x4096; under 5 MB; JPG, PNG, WEBP, GIF (first frame only); SVG not supported. Plain `summary` card: 1:1, min 144x144.
- Third-party guides give 1200x628 (1.91:1) or 1200x675 (16:9); they disagree with the 2:1 quote. Title and description limits conflict (70 and 200 in one source). Needs checking against the live X docs before design.
- Discord's example and X's 2:1 differ; a 1200x630 image is 1.905:1, so keep text inside a centred safe area until X's ratio is confirmed.

**Bluesky [verified lexicon; tags read by cardyb unverified]:**
- `app.bsky.embed.external` (`packages/api/lexicons/app/bsky/embed/external.json`): required `uri`, `title`, `description` (no length limit in the lexicon). `thumb` is a **blob** with `accept: ["image/*"]` and **`maxSize: 1000000`** (1,000,000 bytes).
- The client resizes to at most 2000 px and 1,000,000 bytes before upload (`IMAGE_SIZE_CONFIG_2K_1MB`).
- No official pixel size found in the sources read. Third-party guides say 1200x627 or 1200x630 **[unverified]**.
- Which OG tags cardyb reads: not verified (cardyb source is not public). Use the standard OG tags and `twitter:image`.

**Recommended single asset for all three [inference]:** one 1200x630 PNG kept under 1 MB (Bluesky's thumb limit; the client resizes larger images), with `og:image:width=1200`, `og:image:height=630`, `og:image:alt`, `twitter:card=summary_large_image` and `twitter:image` set to the same URL. Keep essential text inside a centred safe area.

---

## 7. Comparison and trade-offs

| Concern | nuxt-og-image + Takumi | nuxt-og-image + Satori | Hand-rolled `@vercel/og` | Static PNG |
|---|---|---|---|---|
| Fit with Nuxt 4 | Module, needs Nuxt >= 4.6.1 for 7.x | Same | Vercel docs cover Next.js; Nitro is a spike | Trivial |
| Handoff fonts (woff2) | Native | Converted to TTF (module) | Must convert to TTF/OTF/WOFF | n/a |
| CSS coverage | Broadest | Good (0.47.1 supports shadows, vars, grid) | Satori subset (same as Satori) | n/a |
| Caching control | Module TTL, CDN headers, purge needs CDN | Same | You set `s-maxage` | Immutable 1 yr |
| Live state | Possible, bounded by 30 min (Discord) and snapshot (X/Bluesky) | Same | Same | Not possible |
| Vercel cost | Renders per miss; estimate in section 5 | Similar; lower CPU likely | Similar | None |
| Maintenance risk | Fast-moving major versions; docs/npm mismatch | Satori pinned to 0.47.1 by module | Low dependency surface; more own code | None |

**Recommendation for a spike (not a decision):**
1. Use static PNGs for Landing and Changelog, prerendered, immutable.
2. For the dynamic card, prototype `nuxt-og-image` with Takumi after bumping Nuxt to 4.6.x (the 4.5.1 pin is below the 7.x peer), and measure CPU per render, TTF-free font loading and cold starts on a Vercel preview.
3. Keep `@vercel/og` as the fallback if the module's Nitro/Vercel path fails.

---

## 8. Conflicts with settled constraints (for #189, not decided here)

- **"Free for streamers"** appears in the handoff OG copy (`docs/design_handoff_winnies/copy/strings-by-surface.md` line 445; `OGCard.dc.html`). Settled rule: copy never says "free". Do not ship that line.
- **Owner name on the Winnie card.** The OG Winnie variant renders `{{ owner }}’s Winnie`; the prototype defaults the owner to `kittyspeedruns`. Settled rule: no Owner name on any public surface. The Shared View is public. Conflict.
- **Snapshot vs live.** The handoff shows live-looking states ("Live now · watch along", a running timer). Section 4 shows no platform can keep this live. #189 must define what the card claims at the moment of unfurl.
- **Cache duration vs state:** nuxt-og-image defaults to 3 days at the CDN, which would keep a stale state for up to 3 days unless lowered.
- **Nuxt pin:** 7.x needs Nuxt 4.6.1+. Repo is on 4.5.1. Bumping Nuxt is a human decision.
- **Font weight 800** is used by the handoff card but is not in the repo's font weights.
- **Non-Latin Winnie names** need a fallback font; the handoff does not define one.

---

## 9. Open checks before implementation

- Read the live X docs (developer.x.com or docs.x.com) for the `summary_large_image` spec and cache statement; the current results are unverified.
- Read the nuxt-og-image 7.x docs (the docs site I read says v6).
- Spike a render of the handoff OG card on a Vercel preview: CPU per render, TTF size against the 500 KB budget (if using `@vercel/og`), cold start, and CDN headers.
- Check whether `robots: noindex` on the Shared View affects unfurlers (not verified; test with the Discord embed debugger and the X/Bluesky tools).
- Confirm ISR `expiration` behaviour for image responses on Vercel (not verified).

---

## Sources

Vendor and standards (verified in this session):
- Discord link previews: https://docs.discord.com/developers/link-previews/overview (and the Discord message embed reference, https://docs.discord.com/developers/resources/message, which gives embed limits)
- Open Graph protocol: https://ogp.me/
- nuxt-og-image: https://nuxtseo.com/docs/og-image/getting-started/introduction ; `.../getting-started/installation` ; `.../integrations/fonts` ; `.../renderers/takumi` ; `.../guides/runtime-cache` ; `.../guides/build-cache`
- nuxt-og-image on npm (registry): https://registry.npmjs.org/nuxt-og-image/latest ; `.../6.10.4` ; dist-tags at https://registry.npmjs.org/-/package/nuxt-og-image/dist-tags
- Nuxt on Vercel: https://nuxt.com/deploy/vercel ; Nuxt upgrade notes: https://nuxt.com/docs/4.x/getting-started/upgrade ; npm dist-tags https://registry.npmjs.org/-/package/nuxt/dist-tags
- Nitro Vercel preset and ISR: https://nitro.build/deploy/providers/vercel
- Vercel OG: https://vercel.com/docs/og-image-generation
- Vercel ISR: https://vercel.com/docs/incremental-static-regeneration
- Vercel CDN cache: https://vercel.com/docs/caching/cdn-cache
- Vercel limits: https://vercel.com/docs/limits ; https://vercel.com/docs/functions/limitations
- Vercel Functions pricing: https://vercel.com/docs/functions/usage-and-pricing
- Vercel CDN pricing: https://vercel.com/docs/manage-cdn-usage
- Satori README (0.47.1, pinned by nuxt-og-image 7): `gh api repos/vercel/satori/readme?ref=0.47.1` (https://github.com/vercel/satori/tree/0.47.1)
- Satori README (main, 0.62.0 release 2026-10-16): https://github.com/vercel/satori
- Bluesky lexicon: https://github.com/bluesky-social/atproto/blob/main/packages/api/lexicons/app/bsky/embed/external.json
- Bluesky client (link meta, composer, constants): https://github.com/bluesky-social/social-app/blob/main/src/lib/link-meta/link-meta.ts ; `.../src/lib/api/index.ts` ; `.../src/lib/constants.ts`

Unverified (secondary or snippet only):
- X Getting Started cache statement and cards specs, as quoted in search results of developer.x.com / developer.twitter.com (pages returned 402 or redirected to docs.x.com; Wayback unavailable): https://developer.x.com/en/docs/x-for-websites/cards/guides/getting-started ; https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/summary-card-with-large-image
- X forum threads on card caching and the Card Validator: https://devcommunity.x.com/t/twitter-summary-cards-are-they-cached/18345 ; https://devcommunity.x.com/t/twitter-card-image-cache/16321 ; https://devcommunity.x.com/t/card-validator-preview-removal/175006
- Bluesky thumb pixel guidance (third-party): https://socialpilot.co/blog/bluesky-image-sizes-guide (search result, not fetched)
- Discord image caching by URL (forum): https://opengraphplus.com/consumers/discord/caching (search result, not fetched)

Repo files read: `CLAUDE.md`, `CONTEXT.md`, `nuxt.config.ts`, `package.json`, `pnpm-lock.yaml`, `docs/design_handoff_winnies/02-tokens.md`, `docs/design_handoff_winnies/copy/strings-by-surface.md` (Link-preview cards section), `docs/design_handoff_winnies/01-screen-index.md` (19d), `docs/design_handoff_winnies/reference/prototype/OGCard.dc.html`, `docs/design_handoff_winnies/assets/fonts/fonts.css`, `docs/design_handoff_winnies/assets/fonts/licences/`, `server/db/index.ts`, `public/robots.txt`, `app/pages/`. Handoff OG frames: `docs/design_handoff_winnies/screenshots/core/landing/19d-og-*.jpg` (not opened).
