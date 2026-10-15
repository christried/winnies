# Winnies: functionality inventory

Purpose: an exact, source-cited list of what the app does today and what its open issues ask for. It describes behaviour, data and states only. It contains no design or styling opinions.

## 0. Scope and method

> **Update, 2026-10-10:** `win121` has been merged into `main` (PR #161 into `0.9.2`, then PR #164 into `main`), and #121 is closed. Everything tagged **[win121 only]** below is now on `main`, and the line numbers match `main` as of `c098ab0`.

- Repo: `C:\Users\gilge\Desktop\winnies-workspace\winnies`. All paths below are relative to the repo root and cited as `path:line`.
- Basis: branch `win121` at `1506511`, the branch this run started on (`gitStatus` at session start). Line numbers refer to that state. Seven commits (`e10c4ac` to `1506511`) exist only on `win121`. `git diff --stat d560cb3 1506511` (excluding `docs/`) shows they account for all the functional differences: the theme controller, the theme plugin, the `user.theme` column, `PUT /api/user/theme`, the light variant, the overlay's fixed dark appearance, and the `/changelog` prerender change. Everything tagged **[win121 only]** below is absent from `main`.
- **Mid-run checkout.** Partway through the run, the working tree was switched from `win121` to `main` (`git reflog`: `checkout: moving from win121 to main`, now at `d560cb3`). The files on disk now match `main`: the theme files are gone, and `app/pages/shared/[slug]/index.vue` and `app/pages/shared/[slug]/overlay.vue` have changed. I did not switch the branch back. Every claim in this file was read from `win121` before the switch. The deltas are listed in section 9, item 15.
- Issues: all 41 open GitHub issues on `christried/winnies`, read in full with `gh issue view --comments`. None of them has any comments. Open PR #161 ("add config prerequisites for light mode toggling", closes #121) is not an issue and is not counted in the 41.
- Method: static reading only. Nothing was run, so no dev server, no tests and no database. Behaviour is inferred from code. Anything I could not confirm from source is marked **unverified** (see section 10).
- Documentation: `CONTEXT.md` and `docs/adr/` do not exist. `docs/agents/*.md` describe the agent workflow only. No research folder existed, so this file lives at `docs/research/functionality-inventory.md`.

---

## 1. Product summary

Winnies is a beta web app (version 0.9.0, `package.json:4`) for tracking gaming challenge runs. A **Winnie** is a named list of **challenges**. Each challenge has its own stopwatch and an optional counter, and the Winnie has one total timer. The Winnie completes when every challenge is won (`README.md:3-7`, `CHANGELOG.md:9-24`).

Users sign in with Discord only. They create and run Winnies, and they can share any Winnie read-only through a permanent link. The public shared view refreshes itself. A separate compact stream overlay is meant for OBS browser sources (`CHANGELOG.md:22-23`, `app/pages/shared/[slug]/overlay.vue`). The audience is gaming streamers and their communities, which the issues describe (#130, #138, #145).

---

## 2. Routes and pages

### 2.1 Page routes

| Path                    | File                                  | Layout                                             | Access                                                 | Purpose                                                                 |
| ----------------------- | ------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `/`                     | `app/pages/index.vue`                 | default (`app/layouts/default.vue`)                | Public URL. App content only when signed in.           | Signed out: header and footer only. Signed in: the Winnie workspace.    |
| `/shared/:slug`         | `app/pages/shared/[slug]/index.vue`   | shared (`app/layouts/shared.vue`)                  | Public, no sign-in. `slug` is the Winnie's share UUID. | Read-only live view of one Winnie.                                      |
| `/shared/:slug/overlay` | `app/pages/shared/[slug]/overlay.vue` | none (`definePageMeta({ layout: false })`, line 6) | Public, no sign-in.                                    | Compact, auto-paging view for OBS browser sources.                      |
| `/changelog`            | `app/pages/changelog.vue`             | default                                            | Public.                                                | Renders `CHANGELOG.md` through Nuxt Content (`content.config.ts:4-12`). |

Other route facts:

- `app/middleware/auth.ts:1-5` defines a route middleware that redirects anonymous users to `/`. **No page references it**: the only `definePageMeta` calls set `layout`. The `/` page guards itself by rendering nothing when signed out (`app/components/app-header.vue:65`).
- Any other URL falls back to Nuxt's default error page. There is no `app/error.vue` (see the `app/` listing).
- There is no `/admin`, no settings page, no account page and no landing page. These are open issues (#116, #124, #130, #138).

### 2.2 Per-page detail

#### `/`: workspace (`app/pages/index.vue:1-15`)

The page is `<AppHeader/>`, `<WinnieCard/>`, `<WinnieCompleteBanner/>` and `<ChallengeList/>`. The default layout adds the footer (`app/layouts/default.vue:37`).

- **Access.** Anyone can load the URL. Winnie data is fetched only when a user is present on the server (`app/app.vue:14-16`, `callOnce("winnies:init")`).
- **Signed-out state.** Visible: wordmark, version label, issue-report link, theme control (**[win121 only]**) and a "Sign in with Discord" button (`app/components/app-header.vue:63-65`, `app/components/account-control.vue:29-38`). Hidden: the Winnie summary (`app/components/winnie/winnie-card.vue:21`), the add-challenge row (`app/components/challenge/challenge-list.vue:51`) and the challenge list (`challenge-list.vue:54`). Footer visible. This matches #124.
- **Signed-in, loading.** Winnies load at SSR. After a selection, the store sets `pending` (`app/stores/winnies.ts:85-99`). The add-challenge row shows a skeleton only after a 200 ms delay (`app/components/challenge/challenge-add-row.vue:71-75`, `shared/constants.ts:19-20`). No other loading state exists.
- **Signed-in, no Winnies (empty).** Visible: the "Create new Winnie" button and the account menu. The Winnie picker and the share control are hidden (`app-header.vue:65-82`, `:84`). The body is empty. **No empty-state copy exists for this case.**
- **Signed-in, Winnie with no challenges.** Summary shows "0 / 0 won · 0%". The start/pause control is disabled (`winnie-card.vue:52`). The add row heading reads "Create your first Challenge" (`challenge-add-row.vue:84-85`). The list is hidden (`challenge-list.vue:54`).
- **Signed-in, challenges present.** Add row heading reads "Create your next Challenge" (`challenge-add-row.vue:81-82`). The list is visible.
- **Winnie complete.** The summary shows a completion marker (`winnie-card.vue:28-32`). The start/pause control and every challenge's start control are disabled (`winnie-card.vue:52`, `challenge-row.vue:65`). The completion banner appears (`app/components/winnie/winnie-complete-banner.vue:6-9`). Confetti fires once on the transition, not when reopening a won Winnie (`app/composables/use-completion.ts:7-19`).
- **Error.** A failed `GET /api/winnies` is swallowed: the list becomes empty and the selection cookie is cleared (`app/stores/winnies.ts:50-58`). Failed mutations show an error toast (see section 6.3). Failure of `selectWinnie` is not caught (`winnies.ts:85-99`).
- **Permission denied.** No dedicated screen. A 403 from the API becomes an error toast with the server's message.

#### `/shared/:slug`: shared view (`app/pages/shared/[slug]/index.vue`)

- **Access.** Public, no sign-in. The page is `noindex, nofollow` (line 12). It uses the shared layout (line 2).
- **Data.** `useFetch('/api/share/:slug')` with `lazy: true` (lines 8-10). Polling is covered in section 6.6.
- **Loading.** Neither the error state nor the content renders until data arrives, so the page is blank. No skeleton.
- **Success.** Header with the wordmark and a "View only" label. A theme control also sits in this header (**[win121 only]**, line 72; absent on `main`). Summary panel with name, created date, running count, total timer, won/total and percentage, and a progress indicator (`app/components/shared/shared-winnie-card.vue:33-86`). A "Win-challenge complete" alert when complete (lines 77-80). The challenge list, one `SharedChallengeRow` per challenge (lines 82-90). Footer with a Copy-link control and a freshness line (lines 91-94).
- **Freshness line** (lines 39-52): "Reconnecting…" while failing; "Updated just now" under 5 s; "Updated Ns ago" under 60 s; "Updated Nm ago" otherwise.
- **Gone or invalid.** Shown for any error or 404: "This Winnie doesn't exist. Does it? Did it?" with "The link may have been deleted by its owner." (lines 56-62). Invalid slugs (not UUIDs) also land here, because the API returns 422 and the page treats every error the same.
- **Empty Winnie** (zero challenges). Summary shows "0 / 0 won · 0%". The list is an empty `<ul>`. No message.
- **Page title.** Not set by this page. The global title uses `currentWinnie`, which is null here, so the title is "Winnies" (`app/app.vue:18-31`).

#### `/shared/:slug/overlay`: stream overlay (`app/pages/shared/[slug]/overlay.vue`)

- **Access.** Public, no sign-in, `noindex, nofollow` (line 20). No layout, so no header, footer or controls.
- **Fixed appearance [win121 only].** On `win121` the page ignores the viewer's theme preference and forces the dark variant (lines 21-26). Deliberate, per the comment on line 22 (references #121). On `main` the page sets no forced variant.
- **Hard-coded settings.** Five challenges per page (`CHALLENGES_PER_PAGE`, line 9). Page rotation every 10 s (`PAGE_ROTATION_MS`, line 10). Fireworks every 1.2 s (line 11). Twenty-five particles per burst (line 12). The source comment says "user can config this later" (line 8). Only the owner could configure this (#138).
- **Content.** Winnie name, total timer (lines 190-201). Per challenge: a running indicator when running, a won marker, the game name, "count/target" when a counter exists, and the time when the challenge is running or has accumulated time (lines 203-241). Page dots appear when there is more than one page (lines 244-254). Rotation runs only when there is more than one page (line 69).
- **Loading.** Renders nothing until data arrives.
- **Gone or error.** "This Winnie doesn't exist (anymore)." followed by a text emoticon (lines 170-178).
- **Complete.** Fireworks start, unless the viewer prefers reduced motion (lines 117-119, 158-165). They stop when the Winnie is no longer complete (lines 153-156). Polling stops on completion (`useSharedPoll`, section 6.6).

#### `/changelog`: changelog (`app/pages/changelog.vue`)

- **Access.** Public. It uses the default layout (the page sets no `layout`), so the app header and footer render around it.
- **Data.** Nuxt Content collection `changelog`, built from `CHANGELOG.md` only (`content.config.ts:4-12`).
- **Not found.** Throws 404 "Changelog not found" when the collection is empty (`changelog.vue:2-5`).
- **SEO.** Title "Changelog · Winnies" and the collection description (lines 7-10).
- **Content today.** One entry, `0.9.0 - 2026-09-11`, with a bullet list of features (`CHANGELOG.md:9-24`) and a "What's next?" paragraph that links to the GitHub issues and project board (`CHANGELOG.md`, top).

---

## 3. User flows

Each step cites the code that does it. "Toast" means the notice described in section 6.3.

### F1. First sign-in

1. Visitor opens `/`. Signed out, so the page shows the sign-in button only (`app-header.vue:65`, `account-control.vue:29-38`).
2. Click "Sign in with Discord". The button is disabled and shows a busy indicator while redirecting (`account-control.vue:33-36`). The code calls `authClient.signIn.social({ provider: "discord", callbackURL: "/" })` (`account-control.vue:12-15`).
3. The Discord OAuth round trip runs through Better Auth at `/api/auth/*` (`server/api/auth/[...all].ts:1-3`, `server/utils/auth.ts:16-21`). Only Discord is configured.
4. Back on `/`, the server middleware resolves the session and attaches the user (`server/middleware/auth.ts:3-5`). Winnies load at SSR (`app/app.vue:14-16`).
5. A new user has no Winnies, so flow F3 starts. No onboarding or welcome exists. The user record is created by Better Auth's defaults; the repo does not customise creation (**unverified**, see section 10).

### F2. Sign out

1. Click the avatar (or initials) to open the account menu. It shows "Logged in as {name}" and a "Log out" item (`account-control.vue:40-67`).
2. "Log out" calls `authClient.signOut()`, then `reloadNuxtApp({ path: "/" })` (`account-control.vue:21-25`).
3. The Winnie-selection cookie survives sign-out (`app/stores/winnies.ts:16-20`). On `win121` the theme cookie does too (**[win121 only]**, `app/plugins/theme.ts:8-11`).

### F3. Create a Winnie

1. Click "+" ("Create new Winnie") in the header (`app-header.vue:73-82`). Only shown when signed in.
2. The modal "Create a new Winnie" opens with the name field focused (`app/components/winnie/new-winnie-modal.vue:52-76`). Reopening resets the form (lines 43-47).
3. Enter a name. Validation runs on submit: required after trimming, at most 30 characters (`shared/schemas/winnie.ts:3`, `new-winnie-modal.vue:17-19`).
4. Click "Create". The server checks the body and the daily quota, then inserts the row (`server/api/winnies.post.ts:5-13`).
5. On success the new Winnie is added to the list and becomes the current one (`app/stores/winnies.ts:75-79`). The modal closes (`app-header.vue:81`). **No success toast is shown.**
6. On a 422, field errors show under the field. On a 429 (quota) or any other error, the message shows in the modal (`new-winnie-modal.vue:35-38`). Cancel closes the modal.

### F4. Add a challenge

1. The add row sits above the list. Fields: "Game" (required, at most 30 characters), "Win Condition" (optional, at most 40 characters) (`challenge-add-row.vue:93-127`, `server/db/schema/challenge.ts:43-48`).
2. Optional: click the counter toggle. A "Target" number field appears (`challenge-add-row.vue:136-148`). A blank target is saved as **no counter**, because the schema default is 0 (`challenge-add-row.vue:14-19`, `challenge.ts:23`). **Observed, not stated in the UI.**
3. Submit with the "Add challenge" button, or press Enter in the form. The challenge is appended at the end (`server/db/queries/challenge.ts:13-25`).
4. On success the form resets and focus returns to "Game" (`challenge-add-row.vue:56-59`). Field errors show inline. Other errors show as a toast (`challenge-add-row.vue:61-67`).
5. At 50 challenges, every input and button is disabled and "Limit reached (50 challenges per Winnie)" shows (`challenge-add-row.vue:11`, `:180-182`).

### F5. Start or pause the Winnie's total timer

1. The summary's start/pause button shows "Start Winnie" or "Pause Winnie" (`winnie-card.vue:48-56`). It is disabled while a request is in flight, when the Winnie is complete, or when it has no challenges (`winnie-card.vue:52`).
2. Start: the client shows the timer running at once, then calls `POST /api/winnies/:id/timer` with `start`. The server starts the total only when at least one challenge is not won (`server/db/queries/timer.ts:10-20`).
3. Pause: the client sends `stop`. The server stops the total **and every running challenge** (`timer.ts:27-44`). The client does the same locally (`winnies.ts:176-190`).
4. On failure the store rolls back and a toast shows (`winnies.ts:205-208`).

### F6. Start or pause one challenge's timer

1. Each row has a start/pause control. It is disabled when the challenge is won, the Winnie is complete, or a toggle is already in flight (`challenge-row.vue:61-67`, `winnies.ts:321`).
2. Start: `startChallengeAndWinnieTimers` starts the challenge and also the total, if the total is not running (`timer.ts:88-105`). The challenge's status becomes "active".
3. Pause: stops only that challenge (`timer.ts:66-81`). The total keeps running.
4. A double toggle while one request is pending is ignored (`winnies.ts:328-331`).

### F7. Mark a challenge as won, or un-win it

1. Each row has a "Mark as won" control, which changes to "Mark as not won" once the challenge is won (`challenge-row.vue:69-75`).
2. Won: `PATCH /api/challenges/:id` with `status: "won"`. The server sets status to won, sets the counter to its target if one exists, adds the running time to the accumulated time and stops the timer (`server/db/queries/completion.ts:10-40`).
3. If that was the last unwon challenge, the Winnie completes and all timers stop (`completion.ts:33-37`, `:67-81`). Effects are listed in flow F1 under "Winnie complete".
4. Un-win: `PATCH` with `status: "active"`. The server sets status to "active" when accumulated time exists, otherwise "todo". A counter drops to target minus one (`completion.ts:47-57`).
5. Stepping a counter up to its target also wins the challenge (`server/api/challenges/[id]/counter.patch.ts:25-27`).

### F8. Use a challenge counter

1. The counter control shows "−", a count input, "/ target" and "+" (`app/components/counter-pill.vue:81-121`). Shown only when a target is above 0 (`challenge-row.vue:50-53`).
2. "+" and "−" apply at once. The count is clamped to the range 0 to target on the client (`shared/utils/counter.ts:29-43`, `app/components/challenge/challenge-counter.vue:17-29`).
3. Typing: focus selects the field. Enter or leaving the field commits. Escape reverts (`counter-pill.vue:42-78`). Typed values are clamped to the range (`challenge-counter.vue:35-48`). Non-numeric input reverts (`counter-pill.vue:62-65`).
4. Persistence: writes are debounced to 400 ms and sent as `PATCH /api/challenges/:id/counter` with `op: "set"` (`app/composables/use-counter-persist.ts:42`, `:21-24`). A pending write is flushed on blur or unmount (`use-counter-persist.ts:46`). On error the store refetches and a toast shows (`use-counter-persist.ts:29-31`).
5. Reaching the target wins the challenge (flow F7 effects).

### F9. Edit a challenge inline

1. Overflow menu "Edit" opens inline inputs: Game, Win Condition, Target (number), with Save and Cancel (`challenge-overflow-menu.vue:124-128`, `challenge-name-editor.vue:59-82`).
2. Save: if game or spec changed, `PATCH /api/challenges/:id`. If target changed, `PATCH /api/challenges/:id/counter` with `op: "target"`. These are **two separate requests**, so a partial save is possible (`challenge-name-editor.vue:21-42`).
3. On success the editor closes. On error a toast shows and **the editor stays open** (`challenge-name-editor.vue:46-48`). Cancel or Escape discards the draft (`:54-56`, `:60`).
4. No client-side validation exists here. Server errors come back as toasts (see section 5.6).

### F10. Pin or unpin a challenge

1. Overflow menu "Pin" or "Unpin" (`challenge-overflow-menu.vue:39-53`). Sends `PATCH` with `pinned` only.
2. Pinned challenges sort to the top, keeping their position order. Won challenges sort to the bottom (`shared/utils/sort-challenge.ts:17-36`).

### F11. Reset one challenge's timer

1. Overflow menu "Reset timer" (`challenge-overflow-menu.vue:59-75`). Sends `POST /api/challenges/:id/timer` with `reset`.
2. The server sets accumulated time to 0 and stops the timer (`server/db/queries/timer.ts:112-119`). The toast "Timer reset" shows.
3. The Winnie total is **not** changed.

### F12. Duplicate a challenge

1. Overflow menu "Duplicate" (`challenge-overflow-menu.vue:81-94`).
2. The server copies game, spec and target, places the copy directly below the original and shifts later positions down (`server/db/queries/challenge.ts:82-115`). The copy starts fresh: count 0, status todo, not pinned, no time (`challenge.ts:99-108`).

### F13. Delete a challenge

1. Overflow menu "Delete" (`challenge-overflow-menu.vue:100-110`). **No confirmation.**
2. If the deleted challenge was the last unwon one, the Winnie completes and its timers stop (`server/db/queries/challenge.ts:50-75`). A Winnie cannot be completed by deleting its last challenge.

### F14. Reorder challenges

1. Drag the grip handle on a row (`challenge-row.vue:25-30`, `challenge-list.vue:9-15`). The list uses drag-and-drop with the handle `.drag-grip`.
2. On drop, positions are reassigned and the pinned and won rules are reapplied (`challenge-list.vue:24-29`).
3. `POST /api/winnies/:id/reorder` sends every challenge id in the new order. The server requires the exact set, once each, or it returns 422 (`server/db/queries/reorder.ts:17-21`, `server/utils/schemas.ts:34-38`).
4. On error the list reverts and a toast shows (`challenge-list.vue:43-46`).
5. Keyboard reordering does not exist (#157).

### F15. Rename a Winnie

1. Double-click the Winnie name, or use "Rename" in the overflow menu (`app/components/winnie/winnie-card-overflow-menu.vue:34-39`). An input opens with the name selected (`winnie-card-name.vue:6-14`).
2. Enter saves (`PATCH /api/winnies/:id`). Escape or leaving the field cancels (`winnie-card-name.vue:48-50`).
3. An empty name cancels silently (`winnie-card-name.vue:23-24`). A server error shows a toast and cancels (`:35-38`).

### F16. Delete a Winnie

1. Overflow menu "Delete" opens the modal "Delete Winnie" with the text "Delete {name}? This also deletes its {N} challenges. This cannot be undone." (`app/components/winnie/delete-winnie-modal.vue:48-65`).
2. Click the destructive "Delete" action. `DELETE /api/winnies/:id` runs, and the challenges go with it through the cascade (`server/db/queries/winnie.ts:73-80`).
3. The store drops the Winnie and selects the first remaining one, or shows the empty state if none (`app/stores/winnies.ts:105-116`). The toast "Winnie deleted" shows (`delete-winnie-modal.vue:29`).
4. An error stays in the modal (`delete-winnie-modal.vue:31-33`).

### F17. Switch between Winnies

1. The picker appears only when there is more than one Winnie (`app/components/winnie-picker.vue:44-61`). The trigger shows the current name. The menu lists the others with their created date.
2. Choosing one calls `GET /api/winnies/:id` and makes it current (`app/stores/winnies.ts:85-99`). The choice is stored in the cookie `winnies:current-id` for one year (`winnies.ts:16-20`).
3. On load, the saved Winnie is selected if it still exists, otherwise the first in the list (`winnies.ts:50-69`).
4. There is no manual reorder, search or filter for Winnies.

### F18. Share a Winnie (owner)

1. Header share control opens a menu with "Shared view" and "Stream overlay" (`app-header.vue:84-106`).
2. "Shared view" copies `{origin}/shared/{shareSlug}` and shows "Share view link copied" (`app-header.vue:22-38`).
3. "Stream overlay" copies `{origin}/shared/{shareSlug}/overlay` and shows "Stream overlay link copied" (`app-header.vue:43-59`).
4. A clipboard failure shows "Couldn't copy the link" (`app-header.vue:35-37`, `:56-58`).

### F19. View a shared Winnie (visitor)

1. The visitor opens `/shared/:slug`. No sign-in is needed (section 2.2).
2. The page polls every 10 s. The freshness line updates (section 6.6).
3. "Copy link" copies the current URL. The button reads "Copied!" for 2 s (`app/components/shared/shared-copy-link.vue:7-26`).
4. If the clipboard is unavailable, the field is selected and a toast says "Couldn't copy — the link is selected, press Ctrl+C yourself or don't, whatever." (`shared-copy-link.vue:24`).
5. If the owner deletes the Winnie, the next poll gets 404 and the gone state shows (section 2.2).

### F20. Use the stream overlay (streamer)

1. The streamer puts `/shared/:slug/overlay` into an OBS browser source (section 2.2).
2. Pages rotate every 10 s when there is more than one page.
3. When the Winnie completes, fireworks run until it stops being complete (section 2.2).
4. There are no controls and no configuration. On `win121` the overlay always shows the dark variant (**[win121 only]**).

### F21. Change theme [win121 only]

1. The theme control cycles System, then Light, then Dark, then System (`app/components/theme-controller.vue:13-17`, `:27-32`). The control shows the current choice in its tooltip and accessible name (lines 36-40). Changes apply at once (`app/composables/use-theme.ts:17-19`).
2. Signed out: the cookie `winnies-color-theme` stores the choice for one year (`shared/constants.ts:34-36`, `app/composables/use-theme.ts:21-23`).
3. Signed in: the choice is also saved with `PUT /api/user/theme` (`use-theme.ts:25-26`). On failure the previous choice is restored and the toast "Couldn't save theme." shows (`use-theme.ts:28-33`).
4. "System" follows the operating system's dark-mode setting (`app/assets/css/main.css:3-5`, `app/plugins/theme.ts:17-19`).

### F22. Read the changelog

1. Footer link "Changelog" (`app/components/app-footer.vue:28-33`) opens `/changelog`.

### F23. Report an issue

1. Header bug icon, labelled "Report an issue", opens GitHub's new-issue chooser in a new tab (`app/components/app-wordmark.vue:32-41`).

### F24. Legal and external links

1. Footer links "Imprint" and "Privacy Policy" open `https://christried.me/imprint.html` and `https://christried.me/privacy-winnies.html` in new tabs (`app/components/app-footer.vue:7-26`). The privacy page is outside this repo and is referenced in #131.

---

## 4. Domain entities (as the user experiences them)

The DB column names are given in brackets. The user sees the labels in the middle column.

### 4.1 Winnie (`winnie`, `server/db/schema/winnie.ts:11-34`)

| Field (label users see)                       | Stored as                                          | Rule / behaviour                                                                                              | Source                                                         |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Name                                          | `name`                                             | Trimmed, 1–30 chars. Messages "Name is required", "Name is too long".                                         | `shared/schemas/winnie.ts:3`                                   |
| Created date                                  | `created_at`                                       | Shown as dd.mm.yy (de-DE). Used to order the list, newest first.                                              | `shared/constants.ts:1-7`, `server/db/queries/winnie.ts:11-16` |
| Owner                                         | `owner_id`                                         | Only the owner can read or change the Winnie. Cascade delete.                                                 | `winnie.ts:15`, `server/db/queries/ownership.ts:11-19`         |
| Share link                                    | `share_slug` (UUID)                                | Generated at creation. Public URL is `/shared/{slug}`. Never rotated and never revocable: no route writes it. | `winnie.ts:17`, `:33`                                          |
| Players flag                                  | `players_on`                                       | Exists in the schema and is set false on creation. No UI or API uses it. Marked "out of scope in version 1".  | `winnie.ts:19-20`                                              |
| Total time                                    | `total_accumulated_seconds`, `total_running_since` | Total timer. Running when `total_running_since` is set.                                                       | `winnie.ts:22-24`                                              |
| Challenge count, won count, percent           | derived                                            | Percent = round(won / total × 100), 0 when empty.                                                             | `app/stores/winnies.ts:32-37`                                  |
| Running count                                 | derived                                            | Challenges with a running timer. Shown as "· N running".                                                      | `winnies.ts:34`, `app/components/pulse-indicator.vue:13-15`    |
| Complete                                      | derived                                            | At least one challenge and all won.                                                                           | `shared/utils/winnie-completion.ts:16-21`                      |
| Mode (standard, confirmation, gauntlet, etc.) | none                                               | Not built. Planned in #122, #123, #137, #150, #163.                                                           | n/a                                                            |

Winnie limit: 10 per owner over a rolling 24 hours, counted from existing rows (deleting a Winnie frees quota) (`shared/constants.ts:16`, `server/db/queries/quota.ts:11-40`).

### 4.2 Challenge (`challenge`, `server/db/schema/challenge.ts:11-37`)

| Field (label)     | Stored as                              | Rule / behaviour                                                        | Source                                                      |
| ----------------- | -------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| Game              | `game`                                 | Required, 1–30 chars. "Game is required" / "Game is too long".          | `challenge.ts:45-46`                                        |
| Win Condition     | `spec`                                 | Optional, 0–40 chars. "Spec is too long". Placeholder "Win Condition".  | `challenge.ts:46`, `challenge-add-row.vue:122`              |
| Status            | `status`                               | One of `todo`, `active`, `won`. Shown as: won, running, or idle.        | `shared/constants.ts:9`, `challenge-row.vue:32`             |
| Pinned            | `pinned`                               | Boolean. Pinned challenges sort first.                                  | `challenge.ts:19`, `sort-challenge.ts:17-36`                |
| Position          | `position`                             | Integer order. Assigned by the server on create, duplicate and reorder. | `challenge.ts:20`, `server/db/queries/challenge.ts:13-25`   |
| Target            | `target`                               | Counter goal, integer ≥ 0. 0 means no counter.                          | `challenge.ts:23`, `schemas.ts:47-50`                       |
| Count             | `count`                                | Counter progress. Clamped to 0..target.                                 | `challenge.ts:24`, `server/db/queries/challenge.ts:123-173` |
| Challenge time    | `accumulated_seconds`, `running_since` | Per-challenge timer.                                                    | `challenge.ts:27-28`                                        |
| Created / updated | `created_at`, `updated_at`             | Stored, never shown.                                                    | `challenge.ts:30-31`                                        |

Challenge limit: 50 per Winnie (`shared/constants.ts:17`, `server/db/queries/quota.ts:47-72`).

Derived rules:

- Sort order: pinned first, then open challenges, then won ones. Position breaks ties (`shared/utils/sort-challenge.ts:17-36`).
- Counter behaviour: count steps by ±1 and clamps to 0..target. Reaching target sets status to won. A counter with target 0 ignores steps (`shared/utils/counter.ts:16-43`, `server/db/queries/challenge.ts:123-144`).
- Changing a counter's target clamps the count to the new target and may win the challenge (`server/db/queries/challenge.ts:182-203`).
- Removing a counter (target set to 0) keeps the stored count. Re-adding one clamps it to the new target (`challenge.ts:182-203`). **Observed.**

### 4.3 Timer (embedded in Winnie and Challenge)

- Elapsed time = accumulated seconds plus the time since `runningSince`, computed on the client against the server clock (`shared/utils/timer.ts:19-28`, `app/composables/use-server-clock.ts:6-19`).
- Display: "H:MM:SS" when an hour or more, otherwise "MM:SS" (`shared/utils/timer.ts:35-44`).
- Starting a challenge also starts the total. Stopping the total stops every challenge (section 3, F5-F6).
- Winning, deleting the last open challenge, or completing a Winnie stops all timers (section 3, F7 and F13).

### 4.4 User (`user`, `server/db/schema/auth.ts:13-27`)

| Field            | Stored as                                   | Shown to user                                                                        | Source                                        |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- |
| Display name     | `name`                                      | "Logged in as {name}" (menu). Initials when no avatar: first two letters, uppercase. | `account-control.vue:5-7`, `:58-60`           |
| Avatar           | `image`                                     | Discord avatar when present.                                                         | `account-control.vue:46-49`                   |
| Email            | `email` (unique)                            | **Not shown anywhere in the UI.**                                                    | `app/` search: no match                       |
| Email verified   | `email_verified`                            | Not used.                                                                            | `schema/auth.ts:19`                           |
| Theme preference | `theme` (system/light/dark, default system) | **[win121 only]** through the theme control.                                         | `schema/auth.ts:26`, `shared/constants.ts:22` |

There are no roles and no admin concept. Users are created by Better Auth on first Discord sign-in. Nothing else creates or edits accounts. Account deletion is not offered.

### 4.5 Session, account and verification (`server/db/schema/auth.ts:29-92`)

- `session`: token, expiry, IP address and user agent, cascade-deleted with the user. The cookie cache holds the session for 5 minutes (`server/utils/auth.ts:23-25`, `server/constants.ts:1`).
- `account`: the Discord OAuth link, including access, refresh and ID tokens (`schema/auth.ts:50-74`). Never shown in the UI.
- `verification`: Better Auth's internal table. Unused by the app.

### 4.6 Share view payload (public allow-list)

`findWinnieBySlug` returns only these fields (`server/db/queries/winnie.ts:87-114`):

- Winnie: `name`, `totalAccumulatedSeconds`, `totalRunningSince`, `createdAt`.
- Challenge: `id`, `game`, `spec`, `status`, `pinned`, `position`, `target`, `count`, `accumulatedSeconds`, `runningSince`.

Not exposed: owner, share slug, winnie id, `updatedAt`. Also returned: `serverNow` (`server/api/share/[slug].get.ts:15-16`).

### 4.7 Relationships

- User 1 to N Winnie (cascade delete). User 1 to N Session (cascade). User 1 to N Account (cascade).
- Winnie 1 to N Challenge (cascade delete via `challenge.winnie_id`) (`challenge.ts:13`, `winnie.ts`).
- Challenges are ordered within a Winnie by `position`. Winnies are ordered by `created_at` descending.

---

## 5. Server capabilities

### 5.1 API endpoints

16 handler files are present: 15 explicit operations, plus the Better Auth catch-all. All explicit operations except the share route require a signed-in user. Ownership is checked in each handler. Failed checks return 401, 403 or 404 (see 5.6).

| Method and path                      | Auth       | What it does                                                                                                                                                               | Validation               | Source                                                                              |
| ------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `ALL /api/auth/**`                   | n/a        | Better Auth: Discord sign-in, OAuth callback, sign-out, session.                                                                                                           | Library                  | `server/api/auth/[...all].ts:1-3`                                                   |
| `GET /api/winnies`                   | Signed in  | Lists the user's Winnies, newest first, without challenges.                                                                                                                | none                     | `server/api/winnies.get.ts:3-5`                                                     |
| `POST /api/winnies`                  | Signed in  | Creates a Winnie (`name`). Enforces the 10-per-24h quota.                                                                                                                  | Name rule                | `server/api/winnies.post.ts:5-13`                                                   |
| `GET /api/winnies/:id`               | Owner      | Returns the Winnie with its challenges, ordered by position.                                                                                                               | UUID                     | `server/api/winnies/[id].get.ts:4-17`                                               |
| `PATCH /api/winnies/:id`             | Owner      | Renames the Winnie. Only `name` is accepted.                                                                                                                               | Name rule                | `server/api/winnies/[id].patch.ts:5-19`                                             |
| `DELETE /api/winnies/:id`            | Owner      | Hard-deletes the Winnie and its challenges.                                                                                                                                | UUID                     | `server/api/winnies/[id].delete.ts:4-17`                                            |
| `POST /api/winnies/:id/timer`        | Owner      | `start` or `stop` the total timer. Returns `changed`, the Winnie with challenges, and `serverNow`. **`reset` passes validation but is treated as `stop`** (see section 9). | `start`, `stop`, `reset` | `server/api/winnies/[id]/timer.post.ts:17-36`                                       |
| `POST /api/winnies/:id/challenges`   | Owner      | Creates a challenge (`game`, `spec`, `target`). Enforces the 50-per-Winnie quota.                                                                                          | Challenge rules          | `server/api/winnies/[id]/challenges.post.ts:6-20`                                   |
| `POST /api/winnies/:id/reorder`      | Owner      | Stores the given order. Must list every challenge exactly once.                                                                                                            | ids, unique, non-empty   | `server/api/winnies/[id]/reorder.post.ts:4-18`                                      |
| `PATCH /api/challenges/:id`          | Owner      | Edits `game`/`spec`, or sets `pinned`, or sets `status`. `status: "won"` wins it (and may complete the Winnie). Any other status un-wins.                                  | Update rules             | `server/api/challenges/[id].patch.ts:5-27`                                          |
| `DELETE /api/challenges/:id`         | Owner      | Deletes a challenge. Returns `{ id, complete }`.                                                                                                                           | UUID                     | `server/api/challenges/[id].delete.ts:4-17`                                         |
| `POST /api/challenges/:id/duplicate` | Owner      | Duplicates a challenge's definition.                                                                                                                                       | UUID                     | `server/api/challenges/[id]/duplicate.post.ts:4-17`                                 |
| `PATCH /api/challenges/:id/counter`  | Owner      | `op: step` (±1), `op: set` (count), or `op: target` (target ≥ 0; 0 removes the counter). Reaching target wins.                                                             | Discriminated union      | `server/api/challenges/[id]/counter.patch.ts:5-30`, `server/utils/schemas.ts:40-56` |
| `POST /api/challenges/:id/timer`     | Owner      | `start` (also starts the total), `stop`, or `reset`.                                                                                                                       | `start`, `stop`, `reset` | `server/api/challenges/[id]/timer.post.ts:6-37`                                     |
| `GET /api/share/:slug`               | **Public** | Returns the shared payload (section 4.6) and `serverNow`. 404 if none.                                                                                                     | Slug must be a UUID      | `server/api/share/[slug].get.ts:5-17`                                               |
| `PUT /api/user/theme`                | Signed in  | **[win121 only]** Saves `system`, `light` or `dark` on the user.                                                                                                           | Enum                     | `server/api/user/theme.put.ts:3-9`, `server/utils/schemas.ts:58-60`                 |

### 5.2 Realtime

None. There are no websockets and no server-sent events. The shared view and overlay poll (section 6.6). The owner's view refreshes when the tab becomes visible or gains focus (`app/composables/use-now.ts:31-41`).

### 5.3 Notifications

In-app toasts only (section 6.3). No push notifications, no email and no Discord messages. Discord webhooks are planned (#130).

### 5.4 Email

None. No mail library is in `package.json`. Email verification is not used.

### 5.5 Background jobs

None. No cron, queue or worker. Timer correctness depends on Postgres time: the server reads `select now()` and returns it as `serverNow` (`server/utils/server-time.ts:8-16`), and the client corrects its clock against it (`app/composables/use-server-clock.ts:11-19`).

### 5.6 Errors

| Status | Where                                                 | Message the user sees                                                                                                                          |
| ------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 401    | `server/utils/authenticated-handler.ts:21`            | Not shown. The UI never calls protected routes when signed out.                                                                                |
| 403    | Ownership checks                                      | "Not your Winnie.", "Not your Challenge.", "Not your challenge", "Not your Winnie. You cannot create a Challenge here."                        |
| 404    | Share route, rename, timer, theme (**[win121 only]**) | "Winnie doesn't exist." (share), "That Winnie no longer exists.", "Challenge not found.", "That account no longer exists."                     |
| 422    | Validation (`server/utils/errors.ts:8-21`), reorder   | Field errors, plus a summary message. Reorder: "Order must list every challenge exactly once."                                                 |
| 429    | Quotas (`server/db/queries/quota.ts`)                 | "You can create 10 Winnies per day. Try again tomorrow." / "A Winnie can hold 50 Challenges."                                                  |
| 500    | Failed inserts or updates                             | "The Challenge could not be created.", "The challenge could not be updated.", "Could not read server time", "The Winnie could not be created." |

Client handling: `apiErrorMessage` prefers `data.message`, then `data.statusMessage`, then the fallback text (`app/utils/toast-api-error.ts:18-28`). A 422 with `data.fieldErrors` fills form fields in the Winnie modal and add row (`new-winnie-modal.vue:35-36`, `challenge-add-row.vue:64-65`). Elsewhere it becomes a toast.

### 5.7 Validation rules (server is the source of truth)

| Rule                      | Limit                                         | Message                                                  | Source                                         |
| ------------------------- | --------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| Winnie name               | trimmed, 1–30                                 | "Name is required", "Name is too long"                   | `shared/schemas/winnie.ts:3`                   |
| Challenge game            | 1–30                                          | "Game is required", "Game is too long"                   | `server/db/schema/challenge.ts:45-46`          |
| Challenge spec            | 0–40 (optional)                               | "Spec is too long"                                       | `challenge.ts:46`                              |
| Target                    | integer ≥ 0                                   | "Target cannot be negative"                              | `challenge.ts:46-48`, `schemas.ts:49`          |
| Count (set)               | integer ≥ 0                                   | "Count cannot be negative"                               | `schemas.ts:51-56`                             |
| Counter step              | exactly 1 or −1                               | (schema default)                                         | `schemas.ts:40-46`                             |
| Challenge update          | non-empty; `game`, `spec`, `pinned`, `status` | "Nothing to update"                                      | `schemas.ts:22-32`                             |
| Timer action              | `start`, `stop`, `reset`                      | (schema default)                                         | `schemas.ts:18-20`                             |
| Reorder                   | non-empty, unique, every id                   | "Nothing to reorder", "The same challenge appears twice" | `schemas.ts:34-38`                             |
| Theme (**[win121 only]**) | `system`, `light`, `dark`                     | (schema default)                                         | `shared/schemas/user.ts:3`, `schemas.ts:58-60` |

Client-side rules: the new-Winnie modal and the add row validate on submit with the same Zod schemas (`new-winnie-modal.vue:17-19`, `challenge-add-row.vue:14-23`). The inline editor and the rename input do no client validation. Their errors come back as toasts.

### 5.8 Environment

Six required variables, validated at boot (`server/utils/env.ts:5-13`): `DATABASE_URL`, `BETTER_AUTH_SECRET` (at least 32 characters), `BETTER_AUTH_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `NUXT_PUBLIC_APP_URL`. `.env.example` lists the same six.

### 5.9 External integrations

- Discord OAuth (sign-in only). `server/utils/auth.ts:16-21`.
- Neon Postgres. `server/db/index.ts:1-8`.
- Hosting on Vercel (`README.md`).
- Links to christried.me legal pages and GitHub (`app-footer.vue`, `app-wordmark.vue`).
- No analytics, error-tracking or other third-party runtime calls were found in `package.json` or the app source.

### 5.10 File uploads

None. There are no upload routes. Avatars come from Discord's image URL (`schema/auth.ts:20`).

---

## 6. Cross-cutting features

### 6.1 Authentication

- Discord is the only provider (`server/utils/auth.ts:16-21`). Session cookie with a 5-minute cookie cache (`:23-25`).
- Signed-in state reaches the client through a shared state key, `currentUser` (`app/composables/use-current-user.ts:8-14`). It is set on the server and sent to the client, so it is available on first paint.
- Route middleware exists but is not wired to any page (section 2.1).

### 6.2 Roles and permissions

- No roles. There is no admin, moderator or support role (planned in #116).
- Ownership: every Winnie and challenge route checks that the signed-in user owns the Winnie (`server/db/queries/ownership.ts:5-36`). Non-owners get 403.
- Public access: only through the share UUID, and only the allow-listed fields.
- Share links cannot be revoked. Deleting the Winnie is the only way to kill a link.

### 6.3 Toasts and notices

- Kinds: success (auto-dismiss after 4 s), info (5 s), error (no auto-dismiss) (`app/composables/use-toast.ts:19-41`). Each has a Dismiss control (`app/components/toast-region.vue:20-27`).
- Identical consecutive messages of the same kind are not repeated (`use-toast.ts:22-23`).
- Announced to screen readers through a polite live region (`toast-region.vue:6-9`).
- Toast strings are listed in section 8.

### 6.4 Modals and menus

- Two modals: "Create a new Winnie" and "Delete Winnie" (`app/components/ui/modal.vue:29-59`). Each has a title, a body, Cancel and an action button. The action button shows a busy indicator and is disabled while pending. Backdrop click and Cancel close the modal.
- Menus: a generic popover menu with a trigger and items (`app/components/ui/dropdown.vue`). Used by the Winnie picker, the share control, the account menu, the Winnie overflow menu and the challenge overflow menu. Selecting an item does not close the menu on its own; each item closes it explicitly.

### 6.5 Keyboard

- Enter and Escape in the inline rename input (`winnie-card-name.vue:48-50`).
- Enter commits and Escape reverts the counter field (`counter-pill.vue:42-78`).
- Escape cancels the inline challenge editor (`challenge-name-editor.vue:60`).
- Enter submits the add-challenge form (native form submit).
- No global shortcuts. Reordering is drag-only (#157).

### 6.6 Live updates and polling

- Shared view and overlay (`app/composables/use-shared-poll.ts`):
  - Poll every 10 s (`:3`).
  - On error, back off by doubling up to 60 s (`:4`, `:52`).
  - Skip polling while the tab is hidden, and poll immediately on becoming visible (`:28`, `:66-74`).
  - Stop once the Winnie is complete (`:39-41`).
  - A 404 sets the gone state and stops polling (`:45-48`).
  - Any other error shows "Reconnecting…" and keeps the last data (`:49-53`).
- Owner view: the total and challenge timers tick every second and pause while the tab is hidden (`app/composables/use-now.ts:9-37`). The title ticks every second even when hidden (`app/composables/use-title-now.ts`). Returning to the tab or focusing the window refreshes the current Winnie (`use-now.ts:31-41`).

### 6.7 Timers and clock

- A server clock offset keeps every client's timers aligned with Postgres (`app/composables/use-server-clock.ts`).
- Optimistic updates: starts, stops and wins apply at once, then reconcile with the server. On failure the previous state is restored (`app/stores/winnies.ts:158-212`, `:324-374`).
- Counter writes are debounced (400 ms) (`app/composables/use-counter-persist.ts`).

### 6.8 Celebration and completion

- Confetti fires once when a Winnie becomes complete (`app/composables/use-completion.ts:7-30`). It is skipped when the viewer prefers reduced motion (`:25`).
- The overlay shows fireworks while complete (`overlay.vue:110-165`), also respecting reduced motion.

### 6.9 Browser tab

- Title: "{H:MM:SS} · Winnies" while the total timer runs, otherwise "Winnies". Set in `app/app.vue:18-31`. Only the owner's view has a loaded Winnie.
- Favicon: three variants, idle, running and won, chosen by state (`app/composables/use-favicon.ts:12-30`). Applied on the owner view, the shared view and the overlay.

### 6.10 Internationalisation

- The UI is English only. Labels are hard-coded (`app/components/**`).
- Dates use `de-DE` regardless of browser language: dd.mm.yy (`shared/constants.ts:1-7`).
- No language switch and no i18n library exists (#145).

### 6.11 Theme switching [win121 only]

- Three preferences: System, Light, Dark. Default System (`shared/constants.ts:22`, `shared/schemas/user.ts:3`).
- Cycle order: System, Light, Dark (`app/components/theme-controller.vue:27-32`, `shared/utils/theme.ts:18-21`).
- Persistence: cookie `winnies-color-theme` for one year (`shared/constants.ts:34-36`). Signed-in users also save to the database.
- The overlay ignores the preference and stays dark (`overlay.vue:21-26`).
- Light variant: `winter`; dark variant: `abyss` (`shared/constants.ts:29-32`). The UI names a variant only in source; users see System, Light and Dark.

### 6.12 Offline and PWA

- No service worker, manifest or offline cache. `public/` contains favicons and `robots.txt` only.
- Offline is detected only to change an error message: "You appear to be offline — that change was not saved." (`app/utils/toast-api-error.ts:9`, `:21-23`). Optimistic changes are rolled back.

### 6.13 Settings

- None. The only user-level preference is the theme [win121 only]. No account settings, no profile editing.

### 6.14 Changelog and version

- Version comes from `package.json` (`nuxt.config.ts:31`). It appears in the header label (`app-wordmark.vue:29`) and the footer (`app-footer.vue:42`).
- The changelog page renders `CHANGELOG.md` (section 2.2).

### 6.15 Accessibility labels

- Controls with no visible text have accessible names: "Create new Winnie", "Copy share links", "More actions", "Challenge actions", "Start timer" / "Pause timer", "Mark as won" / "Mark as not won", "Counter target", "Increase {game}", "Decrease {game}", "{game} count", "Dismiss", "Start Winnie" / "Pause Winnie", "Report an issue" (see the files in 2.2 and section 3).
- Counter field: the accessible name carries the game name.
- Toast region: a polite live region. On `win121`, the theme control also announces the selected theme (**[win121 only]**).

### 6.16 SEO and robots

- `robots.txt` allows all (`public/robots.txt`).
- Shared view and overlay send `noindex, nofollow` (`shared/[slug]/index.vue:12`, `overlay.vue:20`).
- No landing page, Open Graph or link preview tags exist (#124, #152).

### 6.17 Analytics, telemetry and error reporting

- None in the app source or `package.json` (#131 is an open request).

### 6.18 Account, data export and deletion

- Not offered. Users cannot delete their account or export data.

---

## 7. Open issues (all 41, plus excluded)

Legend: **New screen** means a new page, modal or settings area is needed. "Existing" names the page or component the change touches. Every requirement is restated in plain words; visual wording is removed.

### 7.1 Planned features (26)

| #    | Title                              | Functional requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Touches                                                                                                                 | New screen?                                    |
| ---- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| #116 | Admin Panel                        | An operator-only area that lists all Winnies and users, opens a Winnie to see its challenges, edits and deletes Winnies and challenges through the same validation, and deletes users (cascade). Every destructive action confirms and names what is removed. Each admin action is logged. The first admin is promoted by hand in the database. Non-admins get 404. Needs a `role` column.                                                                                                                                                                      | New `/admin` area. Shares validation with `server/api/*`.                                                               | **Yes** (admin pages).                         |
| #121 | Add Light Mode                     | Let the user choose System, Light or Dark. System follows the OS and updates live. The choice is stored in a cookie so the first load is correct, and saved to the user for signed-in users. Works signed out and on the shared view. The overlay is exempt. The control must show all three choices at once, keyboard-reachable and announced. **Partly built on `win121`:** the control cycles through three states instead of showing them (`app/components/theme-controller.vue:27-32`). PR #161 is open.                                                   | Header control; shared-view header; `PUT /api/user/theme`.                                                              | No.                                            |
| #122 | Confirmation Winnie (game mode)    | A mode, Standard or Confirmation, set at creation and changeable only while no challenge is won. In Confirmation, one challenge is designated as the confirmation. It is excluded from progress and completion. After each win, a prompt asks Confirmed or Failed. Failed resets the challenge to todo, keeps its time, and gives no retry. The state is stored server-side. The mode shows on the Winnie summary and the shared view.                                                                                                                          | Create modal; Winnie summary; challenge rows; shared view; overlay; completion logic; challenge delete.                 | **Yes**: confirmation prompt and mode setting. |
| #123 | Gauntlet (game mode)               | A Winnie-wide attempt limit (default 1). Each challenge tracks attempts used, shown only in this mode. A "Record a loss" action, separate from the win action, uses one attempt. Losing the last attempt of any challenge resets the whole Winnie atomically: every challenge to todo, all timers, counters and attempts to zero, and the total stopped. A message names the challenge that caused it. Shared view and overlay reflect the reset on their next poll.                                                                                            | Create modal; challenge row; Winnie summary; shared view; overlay; store.                                               | **Yes**: reset announcement.                   |
| #124 | Landing Page                       | A signed-out visitor to `/` sees a landing page: a short introduction, what a Winnie and a challenge are, an example run, and a "Sign in with Discord" button using the same sign-in flow. Signed-in users see the app unchanged. Page title and link-preview tags. Indexable. A personalised dashboard is out of scope.                                                                                                                                                                                                                                        | `/` (signed-out branch).                                                                                                | **Yes**: landing content.                      |
| #125 | "Play this myself!" on shared view | A control on the shared view copies that Winnie into the viewer's account: name, challenges (game, spec, target, order, pinned), with a fresh start (todo, zero time and counts, total stopped) and a new share link. The create modal opens prefilled with the source name, editable and validated. Signed-out visitors sign in and return to the same prompt. Quotas are checked before any write. The copy is atomic. The source owner is not notified and the source is identified only by its share slug.                                                  | Shared view; create modal; sign-in return flow; new copy endpoint.                                                      | No (reuses the create modal).                  |
| #130 | Configurable Discord notifications | An owner can attach one Discord webhook URL to a Winnie. The URL is validated, write-only, shown only as configured with a masked hint, and removable. The owner can send a test message. Events, each individually toggled and all off by default: challenge won, Winnie completed, Gauntlet reset (#123), confirmation failed (#122). Messages name the Winnie, the challenge and the share link. Sending is server-side and asynchronous. Failures never block the action that caused them. Failures are logged and repeated failures surfaced to the owner. | New Winnie settings screen; server event hook on win and complete.                                                      | **Yes**: Winnie settings.                      |
| #134 | Tooltips                           | Desktop users get hover help text on controls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Header controls; challenge row controls; add row (partly exists: `app-header.vue:73`, `challenge-add-row.vue:157,169`). | No.                                            |
| #135 | Loss counter for challenges        | A per-challenge loss count, incremented by the user, optional and off by default. Has no effect on completion.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Challenge row; overflow menu; inline editor.                                                                            | No.                                            |
| #136 | Back-to-back linked challenges     | Link several challenges. A loss on any linked challenge resets all of them to not-won.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Challenge create/edit; challenge row; new link control.                                                                 | Small picker needed.                           |
| #137 | Timeboxed Winnie (game mode)       | The owner sets a time limit. The total counts down while challenge timers still count up. The total can be paused. Reaching zero means the Winnie is lost, irreversibly. Possibly the owner can add time.                                                                                                                                                                                                                                                                                                                                                       | Create modal; Winnie summary timer; shared view; overlay; new lost state.                                               | No.                                            |
| #138 | Configurable stream overlay        | Only the owner configures the overlay, not each viewer. Options: challenges per page, timer display on or off. (Presentation options such as size and theming are omitted here by the no-design rule.)                                                                                                                                                                                                                                                                                                                                                          | Overlay; new owner settings.                                                                                            | **Yes**: overlay settings.                     |
| #139 | Game-mode selection screen         | Once there are three or more modes, a selection screen with names and explanations appears when creating a Winnie. Explicitly future.                                                                                                                                                                                                                                                                                                                                                                                                                           | Create flow.                                                                                                            | **Yes**: future.                               |
| #142 | Challenge autocomplete             | While typing Game, suggestions appear and can be picked. Win Condition suggestions are scoped to the chosen game. Optionally, a hint showing the average time other users spent on that challenge.                                                                                                                                                                                                                                                                                                                                                              | Add row; inline editor.                                                                                                 | No. Needs cross-user data.                     |
| #143 | Generate a whole Winnie            | A one-click generator that builds a full Winnie from a chosen total time, using averaged historic data per challenge. Needs moderated data. Balanced categories are optional.                                                                                                                                                                                                                                                                                                                                                                                   | Create flow; new data layer.                                                                                            | **Yes**: generator input.                      |
| #145 | i18n (en-US and de-DE)             | Switch the UI language between English and German. Dates currently use German format already.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | All UI strings; date formatting; new setting control.                                                                   | **Yes**: language setting.                     |
| #148 | Allow counter overshoot            | Let a counter go above its target instead of clamping back to it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Challenge counter; client clamp; server clamp.                                                                          | No.                                            |
| #150 | Cursed Incremental (game mode)     | Each loss increases the difficulty of every remaining challenge by a set amount. The representation of "difficulty" is not defined.                                                                                                                                                                                                                                                                                                                                                                                                                             | Loss action; challenge rows.                                                                                            | No, but needs a data definition.               |
| #151 | Statistics after completion        | After completion, the completion area shows statistics, for example how the run compared with targets or other runs.                                                                                                                                                                                                                                                                                                                                                                                                                                            | Completion banner; Winnie summary.                                                                                      | Stats panel (new content).                     |
| #152 | Link thumbnails and previews       | When a link is shared (e.g. in Discord), show a title, description and image. The landing page gets generic data. Shared views get Winnie-specific data and an image of that Winnie.                                                                                                                                                                                                                                                                                                                                                                            | Shared view; landing page; new image endpoint.                                                                          | No (server metadata).                          |
| #153 | Players                            | Optional player names per Winnie. A player sits on one challenge at a time, and a challenge takes any number of players. Players are assigned by dragging between rows, and dropping outside a row returns them to a bench. The shared view shows read-only player markers. Uses the existing `players_on` column.                                                                                                                                                                                                                                              | Winnie header toggle; challenge rows; drag-and-drop; shared view.                                                       | **Yes**: bench area.                           |
| #154 | Challenge notes                    | An optional note per challenge, visible on the shared view behind a hover or click. Plain or rich text is undecided.                                                                                                                                                                                                                                                                                                                                                                                                                                            | Challenge row; inline editor; shared row.                                                                               | Note editor (new).                             |
| #155 | Twitch sign-in                     | A second sign-in provider, Twitch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Account control; auth config.                                                                                           | No.                                            |
| #157 | Keyboard reordering                | Reorder challenges from the keyboard, not only by drag.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Challenge list rows.                                                                                                    | No.                                            |
| #160 | Soft delete (archive) Winnies      | Deleting a Winnie archives it instead. First iteration: restorable by an admin. Later: users can restore from their account.                                                                                                                                                                                                                                                                                                                                                                                                                                    | Winnie delete flow; winnie list; admin panel.                                                                           | Later: archive list.                           |
| #163 | Randomizer (game picker)           | A spinning wheel, own or embedded, that picks a game for a challenge. Some constraint so results cover different genres (undecided).                                                                                                                                                                                                                                                                                                                                                                                                                            | Add row or a new action; new wheel screen.                                                                              | **Yes**: wheel.                                |

### 7.2 Bugs (4)

| #    | Title                                          | Functional requirement                                                                                                                                                                                                                                                     | Touches                                                        | New screen?          |
| ---- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------- |
| #147 | Challenge add row behaviour and validation     | (1) The add row closes when focus leaves it, so a user collecting game names elsewhere has to reopen it each time. Should stay open. (2) Required-Game validation shows an API error instead of a field error when the input is empty. (3) Help text for the row controls. | `challenge-add-row.vue`; row controls.                         | No.                  |
| #149 | Allow longer inputs for Game and Win Condition | Game titles and win conditions currently get cut off. Users need to enter long text fully. The issue also notes that correct game titles matter for autocomplete (#142). Current limits are 30 and 40 characters.                                                          | Add row; inline editor; challenge row; shared view.            | No.                  |
| #158 | Win control states                             | The per-challenge win control should be an explicit toggle showing won or not-won, with a clear way to un-win. The completion marker should reflect only Winnie-level completion, not single challenges.                                                                   | Challenge row win control; Winnie summary completion marker.   | No.                  |
| #162 | Share control behaviour                        | Rethink the share control: today it copies the link immediately. Options raised: show the URL (as on the shared view) or copy and open in a new tab.                                                                                                                       | Header share menu (`app-header.vue:84-106`); shared-copy-link. | Maybe (URL display). |

### 7.3 Chores and developer work (9)

| #    | Title                              | Functional requirement                                                                                                                              | Touches                              |
| ---- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| #119 | Use Histoire / Storybook           | Component stories and a CI build of them. No functional change.                                                                                     | Dev tooling.                         |
| #126 | Unit test coverage                 | Tests for queries, handlers, store, composables and components. No functional change.                                                               | Test suite.                          |
| #127 | Integration and end-to-end testing | Cypress with a Postgres container and seeded sessions. Covers sign-out landing, create, timers, win, complete, rename, delete, share and ownership. | Test suite; CI.                      |
| #128 | Revisit project structure          | Audit and move files, enforce conventions via lint. No functional change.                                                                           | Repo layout.                         |
| #129 | Docker for local development       | A compose file for Postgres and a Dockerfile for the app. Explicitly not a supported deployment.                                                    | Dev tooling.                         |
| #131 | Add Sentry                         | Error reporting for client and server, with source maps not publicly served. Privacy policy must name Sentry before release.                        | Config; privacy page (outside repo). |
| #140 | CONTRIBUTING.md                    | A contributing guide. Documentation only.                                                                                                           | Docs.                                |
| #146 | Update dependencies                | Review and update dependencies.                                                                                                                     | `package.json`.                      |
| #156 | CSRF and rate limiting review      | Review CSRF and rate limiting. Labelled "enhancement" but a security chore. The issue claims rate limiting already exists (see section 9).          | Auth; server.                        |

### 7.4 Excluded: purely visual

- \#118 Update Theme and general styling to something more unique
- \#159 Formkit Drag & Drop Animations

---

## 8. Content inventory

Every user-visible string or data item, grouped by place. Quoted strings are verbatim from source.

### 8.1 Chrome (all pages)

- Wordmark "Winnies" (`app/components/app-wordmark.vue:24`).
- Version label "v{version} · beta" (`app-wordmark.vue:29`).
- Issue-report link with tooltip "Report an issue" (`app-wordmark.vue:38`).
- Footer: links "Imprint", "Privacy Policy", "Changelog", tooltip "See on GitHub", credit line "v{version} created with Nuxt using daisyUI" (`app/components/app-footer.vue:7-53`).
- Toast region (`app/components/toast-region.vue`).
- Theme control: tooltip "Theme: {System|Light|Dark}", accessible name "Theme: {X}. Change theme", announcement "{X} theme" (**win121 only**, `theme-controller.vue:30,36,40`).

### 8.2 Account

- "Sign in with Discord" (`account-control.vue:37`).
- Avatar (Discord image) or two-letter initials (`account-control.vue:5-7`, `:46-53`).
- Menu: "Logged in as {name}", "Log out" (`account-control.vue:58-64`).

### 8.3 Header (signed in)

- Winnie picker trigger: current name. Menu: other names with dd.mm.yy dates (`winnie-picker.vue:44-61`).
- Create button, tooltip and accessible name "Create new Winnie" (`app-header.vue:73-79`).
- Share menu, tooltip and accessible name "Copy share links": "Shared view", "Stream overlay" (`app-header.vue:89-103`).
- Share toasts: "Share view link copied", "Stream overlay link copied", "Couldn't copy the link" (`app-header.vue:33,36,54,57`).

### 8.4 Winnie summary (signed in)

- Name (double-click to rename). Created date dd.mm.yy. Running count "· N running" (`pulse-indicator.vue:14`).
- Total timer "H:MM:SS" or "MM:SS".
- Start/Pause control: "Start Winnie" / "Pause Winnie".
- Overflow menu "More actions": "Rename", "Delete".
- Progress text: "{won} / {total} won · {pct}%" (`winnie-card-progress.vue:8`).
- Completion marker (no text), completion banner: "Win-challenge complete — This is a nice space to show interesting statistics." (`winnie-complete-banner.vue:8`).

### 8.5 Challenge list (signed in)

- Add row headings: "Create your first Challenge" (none yet), "Create your next Challenge" (`challenge-add-row.vue:81-85`).
- Placeholders: "Game", "Win Condition", "Target" (`challenge-add-row.vue:101,122,144`).
- Counter toggle tooltip "Add counter" / "Remove counter", accessible name "Counter target" (`challenge-add-row.vue:157-163`).
- Add button tooltip "Add Challenge", accessible name "Add challenge" (`challenge-add-row.vue:169-174`).
- Limit message "Limit reached (50 challenges per Winnie)" (`challenge-add-row.vue:181`).
- Row: grip (drag handle, no text), status indicator (won, running, idle), pin marker, game, win condition, counter control (when target > 0), time, start/pause "Start timer" / "Pause timer", win toggle "Mark as won" / "Mark as not won", overflow "Challenge actions" (`challenge-row.vue:24-76`).
- Overflow menu: "Edit", "Add counter" / "Remove counter", "Pin" / "Unpin", "Reset timer", "Duplicate", "Delete" (`challenge-overflow-menu.vue:124-157`).
- Inline editor: inputs for game, win condition and target, buttons "Save" and "Cancel" (`challenge-name-editor.vue:61-81`).
- Counter control: "Decrease {game}", "Increase {game}", "{game} count", "/ {target}" (`counter-pill.vue:87-116`).

### 8.6 Modals

- "Create a new Winnie". Placeholder "e.g. Kitty vs. the world". Accessible name "Winnie name". Buttons "Create", "Cancel" (`new-winnie-modal.vue:55-66`).
- "Delete Winnie". Body "Delete {name}? This also deletes its {N} challenges. This cannot be undone." Buttons "Delete", "Cancel" (`delete-winnie-modal.vue:50-60`).

### 8.7 Shared view

- "View only" label. Name, created date, running count, total timer, "{won} / {total} won · {pct}%", progress.
- Completion alert "Win-challenge complete".
- Challenge rows: status, game, win condition, "{count} / {target}" when a counter exists, time.
- "Copy link" / "Copied!" (`shared-copy-link.vue:44`).
- Freshness: "Reconnecting…", "Updated just now", "Updated {N}s ago", "Updated {N}m ago".
- Gone: "This Winnie doesn't exist. Does it? Did it?" and "The link may have been deleted by its owner."

### 8.8 Overlay

- Name, total timer, challenge rows (status, game, "{count}/{target}" when a counter exists, time when running or non-zero).
- Gone: "This Winnie doesn't exist (anymore)." and a text emoticon.

### 8.9 Changelog

- Title "Changelog · Winnies". Not-found message "Changelog not found" (404).
- Content: `CHANGELOG.md` (0.9.0 entry and "What's next?" paragraph).

### 8.10 Page titles

- "Winnies" by default. "{H:MM:SS} · Winnies" while the total timer runs (owner view).

### 8.11 Toasts and fallback messages

- "Winnie deleted", "Timer reset", "Couldn't save theme." (**win121 only**)
- "Couldn't copy the link", "Share view link copied", "Stream overlay link copied"
- "Couldn't copy — the link is selected, press Ctrl+C yourself or don't, whatever."
- "Something went wrong. Please try again." (fallback)
- "You appear to be offline — that change was not saved."

### 8.12 Validation and server messages (surfaced)

- "Name is required", "Name is too long", "Game is required", "Game is too long", "Spec is too long", "Target cannot be negative", "Count cannot be negative", "Nothing to update", "Nothing to reorder", "The same challenge appears twice", "Order must list every challenge exactly once".
- "You can create 10 Winnies per day. Try again tomorrow.", "A Winnie can hold 50 Challenges.", "Not your Winnie.", "Not your Challenge.", "Not your challenge", "Not your Winnie. You cannot create a Challenge here.", "Winnie doesn't exist.", "That Winnie no longer exists.", "Challenge not found.", "That account no longer exists.", "The Challenge could not be created.", "The challenge could not be updated.", "The Winnie could not be created.", "Could not read server time", "not signed in!".

### 8.13 Data fields (as stored and shown)

- Winnie: name, created date, total seconds, running state, challenges. Share slug (in the URL only).
- Challenge: game, win condition, status, pinned, position, target, count, seconds, running state.
- User: name, avatar, theme (**win121 only**). Email is stored and not shown.

### 8.14 Formats

- Dates: de-DE, two-digit day, month, year (dd.mm.yy) (`shared/constants.ts:1-7`).
- Timers: "H:MM:SS" or "MM:SS" (`shared/utils/timer.ts:35-44`).
- Percent: rounded integer (`app/stores/winnies.ts:36-37`).
- Counter: "{count} / {target}" in the shared view; "{count}/{target}" in the overlay.

---

## 9. Code versus issue contradictions and inconsistencies

Each item says where the code and an issue disagree, or where an issue is out of date. Nothing here was resolved.

1. **Rate limiting (#156).** #156 says "rate limiting is already in place for nearly everything that's slightly relevant". The app has no rate limiting in its own code. `server/utils/auth.ts:9-44` sets no `rateLimit` option. The only throttle would be a Better Auth library default, which is **unverified**. The 10-per-day and 50-per-Winnie quotas are not rate limits.
2. **Light mode (#121).** The issue asks for three visible choices with the active one marked, plus a control that is not a two-state toggle. On `win121`, the control cycles through three states with one button (`app/components/theme-controller.vue:27-32`). The rest of the issue (cookie, database column, `PUT /api/user/theme`, signed-out use) is built on `win121` only. On `main` none of the theme features exist. The issue is still open and PR #161 is open. The issue describes the feature as not yet built.
3. **Input length (#149).** The issue says long game titles and specs are "cut off". The code does not truncate. The inputs have no length limit in the markup (`challenge-add-row.vue:93-105`, `challenge-name-editor.vue:61-62`). The server rejects anything over 30 (game) or 40 (spec) with "Game is too long" or "Spec is too long" (`server/db/schema/challenge.ts:45-46`). The user sees an error, not a cut-off.
4. **Empty Game (#147 point 2).** The issue reports an API error when the Game input is empty. The add row validates on the client with the same Zod rule ("Game is required", `challenge-add-row.vue:14-23`, `challenge.ts:45`). The reported API error is **not reproducible from source** (**unverified**).
5. **Completion message (#151).** The issue calls the completion message a "modal" that "pops out below the Winnie card". The code renders an inline alert (`winnie-complete-banner.vue:6-9`, `index.vue:11`). Naming mismatch only.
6. **Share control (#162).** The issue speaks of "the link share button". The code has a menu with two copy actions (`app-header.vue:84-106`). The share URL is copied, not displayed.
7. **Tooltips (#134).** The issue asks to add tooltips. Some already exist (`app-header.vue:73,86`, `challenge-add-row.vue:157,169`, `app-footer.vue:36`, `app-wordmark.vue:38`). Partial, not contradictory.
8. **Loose root components (#128).** The issue lists the loose root components. It omits `app-wordmark.vue` and `theme-controller.vue`, which are also at the root (`app/components/`).
9. **Test count (#126).** #126 says "the four suites under `shared/utils`". `main` has four. `win121` adds `theme.test.ts`, which makes five (`shared/utils/*.test.ts`). Branch-dependent, not a true contradiction.
10. **Player data (#153).** The issue says the `playersOn` column and the eight player colours already exist. The column exists (`server/db/schema/winnie.ts:19-20`). The colours exist (`app/assets/css/main.css:37-44`). The drag kind is not built, which the issue also says. Consistent.
11. **Confirmed as consistent:**
    - \#124: signed-out `/` shows wordmark and sign-in only (`app-header.vue:65`).
    - \#117 and #113 (closed): overlay and footer exist.
    - \#160: deletion is a hard delete (`server/db/queries/winnie.ts:73-80`).
    - \#158: the same completion marker is used for single-challenge wins and for Winnie completion (`challenge-row.vue:70-75`, `winnie-card.vue:28-32`).
    - \#148: counter clamps to target (`shared/utils/counter.ts:39-40`, `server/db/queries/challenge.ts:124-125`).
    - \#145: the UI is English-only and dates are German (`shared/constants.ts:1`).
    - \#131: no Sentry dependency.
    - \#119 and #129: no Storybook, no Docker files.
    - \#155: Discord is the only provider.
    - \#116: no `role` column.
12. **Doc gap.** `docs/agents/domain.md` tells agents to read `CONTEXT.md` and `docs/adr/`. Neither exists. Not an issue, but a documentation gap.
13. **Latent code issue.** The winnie timer route accepts `reset` (`server/utils/schemas.ts:18-20`) but treats any non-`start` action as `stop` (`server/api/winnies/[id]/timer.post.ts:17-19`). The UI never sends `reset` to this route, so it is latent.
14. **Unused code.** `app/middleware/auth.ts` is defined but no page references it (section 2.1).
15. **Mid-run checkout (basis change).** The working tree moved from `win121` (`1506511`) to `main` (`d560cb3`) during the run (reflog). Compared with `main`, the `win121` state adds: the theme control in the app header (`app/components/app-header.vue`, `theme-controller.vue`) and in the shared view header (`shared/[slug]/index.vue:72`); the theme plugin and composable (`app/plugins/theme.ts`, `app/composables/use-theme.ts`); `PUT /api/user/theme` and its schema, the `user.theme` column with migration `0002`; the theme constants and utils; the overlay's forced dark appearance (`overlay.vue:21-26`); a `shared/utils/theme.test.ts` suite; and the `/changelog` prerender change. Sections marked **[win121 only]** describe these. Sections not so marked describe both branches. Line numbers refer to `win121`.

---

## 10. Unverified items, observations and gaps

Unverified (could not confirm from source alone):

- Better Auth defaults for user creation, session expiry beyond the 5-minute cookie cache, and any built-in rate limiting (`server/utils/auth.ts`).
- Whether the "API error on empty Game" in #147 reproduces (point 4 above).
- Whether browsers keep the shared-view freshness line and polling correct under throttling. This needs a running app.
- Whether the theme control's "immediate" change is seamless in every browser (**[win121 only]**). This needs a running app.

Observations (behaviour the UI does not state):

- The add row saves a blank target as no counter (`challenge-add-row.vue:14-19`, `challenge.ts:23`). No warning.
- Deleting a challenge has no confirmation (`challenge-overflow-menu.vue:100-110`).
- Editing a challenge's target after a counter is removed keeps the stored count (`challenge.ts:182-203`).
- Renaming a Winnie cancels silently on blur (`winnie-card-name.vue:50`) and discards the draft.
- Creating a Winnie shows no success toast (`new-winnie-modal.vue:23-31`).
- Saving an inline edit can apply the text change but fail on the target change (two requests, `challenge-name-editor.vue:21-42`).
- Resetting a challenge's timer does not change the Winnie total (`server/db/queries/timer.ts:112-119`).
- Deleting the last open challenge completes the Winnie (`server/db/queries/challenge.ts:50-75`). Adding a new open challenge afterwards does not restart the total.
- The shared view and the overlay show "doesn't exist" for any error, including invalid slugs.
- Share links cannot be rotated or revoked (`server/db/schema/winnie.ts:17`; no route writes `share_slug`).
- The Winnie list has no pagination, search or manual order.
- The shared-view page title is always "Winnies", because the shared page does not set one.
- The app stores the full session user, including email, in shared state (`app/composables/use-current-user.ts:9-13`). Nothing renders the email. This matters for the privacy work in #131.
- The Discord avatar and display name come from Discord. No user-editable profile exists.

Gaps:

- No empty state when a signed-in user has no Winnies (section 2.2).
- No 404 page of its own.
- No loading indicator on the Winnie summary or the list while switching Winnies, only the add-row skeleton (section 2.2).
- No confirmation for destructive actions except Winnie deletion.
- No success confirmations for create and rename.

Changelog page, win121 only: commit `2175326` ("stop prerendering /changelog") changes the build so `/changelog` is not prerendered. `nuxt.config.ts` also changes on `win121` (six lines). Neither affects the page's behaviour as described in section 2.2.
