# 06 · Copy changes

Voice: playful and a little unhinged at the edges (empty states, gone states, Nini, Complete, the clipboard failure); plain and specific when something went wrong (“Couldn’t save the new order. It’s back where it was.”). Speaks to **you**. Product nouns capitalised: Winnie, Challenge, Win Condition, Counter, Target, Total Timer, Challenge Timer, Won, Complete, Pinned, Overlay, Shared View, Owner, Viewer, Game Mode. **Won** is a Challenge state, **Complete** is the Winnie state — never swapped. No emoji in UI copy. Typographic apostrophes and quotes (’ “ ”), real ellipsis (…), middle dot separators ( · ). Every label has ~30 % headroom for German (proved in 6a · 11).

`copy/strings-by-surface.md` lists **every** string in the final prototypes (generated). This file lists what changed against the functionality brief, and the important new strings with their exact templates.

## A. Strings from the brief: old → new
| # | Where | Brief (old) | Final (new) | Type |
|---|---|---|---|---|
| A1 | Account menu | “Logged in as {name}” | “Signed in as {name}” | Rewrite: matches “Sign in with Discord”. |
| A2 | Account menu | “Log out” | “Sign out” | Rewrite: same reason. |
| A3 | Theme picker | “System / Light / Dark” | “Light / Dark / Match system” | Rewrite: “System” alone read as a setting category. Order puts the explicit choices first. |
| A4 | Winnie summary | “N running” | A state pill: “Running” (`timer`) / “Paused” (`pause`) / “Complete” (`emoji_events`); no pill before the first start | Structural rewrite: the count was redundant (the running rows already carry the pink ring + word). See open question Q1. |
| A5 | Add row at 50 | “Limit reached” | “This Winnie is full: 50 / 50 Challenges. Delete one to add another, or [start a new Winnie].” | Rewrite: says why and what to do; “start a new Winnie” opens Create Winnie. |
| A6 | Shared View · gone | “This Winnie doesn’t exist. Does it? Did it?” | Kept, split into three lines that hop in turn: “This Winnie doesn’t exist.” / “Does it?” / “Did it?” — plus new “The link may have been deleted by its owner.” and button “Make your own Winnie”. | Kept + new |
| A7 | Overlay · gone | (same as A6) | “This Winnie doesn’t exist (anymore).” + “Streamer: paste a fresh Overlay link into OBS.” | Rewrite: the Overlay audience can’t act; the line is for the Streamer looking at OBS. |
| A8 | Clipboard failure | “Couldn't copy, the link is selected, press Ctrl+C yourself or don't, whatever.” | “Couldn’t copy, the link is selected, press Ctrl+C yourself or don’t, whatever.” | Kept (typographic apostrophes only). Sticky error toast. Proposal (not in the prototypes): show “⌘C” on macOS. |
| A9 | Freshness line | “Updated just now” · “Updated 12s ago” · “Reconnecting…” | Kept. New: “Back live”, “Retry now”, “Last update 0:42 ago”, “Fetching the latest from {owner}.”, “Catching you up on what you missed.” | Kept + new |
| A10 | Summary | “{won} / {total} won · {pct}%” | Kept exactly. No Challenges: “No Challenges yet”. | Kept |
| A11 | Summary | “Start / Pause Winnie” | “Start Winnie” / “Pause Winnie” | Kept |
| A12 | Delete Winnie | “confirm modal naming how many Challenges die with it” | Title “Delete {name}?” · body “This also deletes its {n} Challenge(s). This cannot be undone.” (0 Challenges: “This cannot be undone.”) · buttons “Cancel” / “Delete Winnie” · busy “Deleting…” · error “Couldn’t delete this Winnie. Nothing was removed. Check your connection and try again.” + “Try again” | New |
| A13 | Shared View marker | “View only” | “View only” | Kept |
| A14 | Copy control | “Copy link” | “Copy link” → “Copied!” (2 s) | Kept + new |

## B. New strings with templates (Workspace)
| Key | String |
|---|---|
| nav.report | Report an issue |
| nav.create | Create Winnie |
| nav.share | Share |
| nav.wordmark.label | winnies, go to your Workspace |
| picker.label | Switch Winnie · menu title “Your Winnies” · item meta “{dd.mm.yy}” · running marker label “Running” |
| share.title | Share this Winnie |
| share.sub | Both links update live while you play. |
| share.shared | Shared View — “A read-only page for chat, mods and friends.” |
| share.overlay | Overlay — “Add it to OBS as a Browser Source. Keep this link private.” |
| share.copy | Copy → Copied · “Open in a new tab” |
| account.label | Account, {name} |
| account.items | Signed in as {name} · Theme · Language · Settings · Sign out |
| welcome.title | Welcome, {name}! |
| welcome.body | A Winnie is your list of gaming Challenges, up to 50 of them, with one Total Timer that runs while you play. Name your first one and let’s get winning. |
| welcome.steps | Name your Winnie · Add your Challenges · Put the Overlay on stream |
| rename.hint | Enter saves · Esc cancels |
| rename.error | Give your Winnie a name. |
| summary.created | created {dd.mm.yy} |
| winnie.menu | More Winnie options · Rename · Duplicate Winnie · Reset all timers · Delete Winnie |
| duplicate.toast | Duplicated. Fresh timers, same Challenges. |
| complete.title | Complete · “Every Challenge Won!” |
| complete.body | {n} Challenges Won in {time} on the Total Timer. Share it, or line up the next run. |
| complete.actions | Share the win · Run it again |
| add.placeholders | Game · Win Condition (optional) · Target (optional) · counter switch hint “Add a number to count progress” / “Shows a counter like 0 / {target}” |
| add.cta | Add Challenge |
| add.error | Type a game first, then add it. |
| list.empty | Create your first Challenge — “Type a game in the field above. Add a win condition if you like, such as “All stars” or “No deaths”. Every Challenge gets its own timer.” · “Add your first Challenge” |
| row.labels | Drag to reorder · Pinned · Decrease · Counter · Increase · Challenge Timer · Start / Pause / Won · Mark Won / Won · undo · More options for {game} |
| row.menu | Edit · Add counter / Remove counter · Pin / Unpin · Reset timer · Duplicate · Delete |
| edit.placeholders | e.g. No deaths · No counter |
| edit.errors | Add a game name to save this Challenge. · Use a whole number from 1 to 9999. |
| delete.challenge | Delete {game}? — “Its timer and counter go with it.” · Delete |
| reorder.errors | Won Challenges stay in the Won group. · Pinned Challenges stay on top. Unpin to move it. · Couldn’t save the new order. It’s back where it was. · Saved. The new order is in. |
| toasts (examples) | {game} marked Won. {won} / {total} done. · Your Overlay updates live. No need to refresh OBS. · You appear to be offline, that change was not saved. · We’ll keep trying in the background. · Stays until you close it. · Opening GitHub Issues in a new tab. · Deleted {name}. · {name} is ready. Add your first Challenge. |
| offline | Offline. Changes won’t save until you’re back. · Last saved {m:ss} ago |
| create.modal | Create Winnie · “Name it after the run. You can rename it any time.” · label “Winnie name” · placeholder “e.g. Kitty vs. the world” · Cancel / Create Winnie · busy “Creating…” · new Winnie default name “My first Winnie” / “New Winnie” |
| create.errors | Give your Winnie a name. · Keep it to 30 characters. This one has {n}. |
| create.quota | You can create 10 Winnies per day. Try again tomorrow. · Today’s 10 are in the Winnie picker. The count resets at midnight. · Got it (see Q4) |
| signin | Sign in with Discord · Redirecting to {provider}… · Twitch “Soon” |
| signedout.body | Track every Challenge, live on stream. · A Winnie is your list of up to 50 gaming Challenges with one Total Timer. Sign in to make one, then put it on stream with the Overlay. · Watching someone’s run? Shared Views and Overlays work without an account. |
| 404 | This page wandered off. · There’s nothing at this address. The link might have a typo, or the Winnie it pointed to was deleted. · Go to your Workspace |
| 500 | Something broke on our side. · Your Winnies and timers are safe. Give it another try, and if it keeps happening, tell us. · Error 500 · ref {ref} · Try again · Trying again… |
| loading | Loading… · Loading your Winnie (screen readers) |
| footer | Imprint · Privacy Policy · Changelog · GitHub · winnies v{version} · beta |
| tab title | “▶ {total} · {winnie}” running · “❚❚ {total} · {winnie}” paused · “✿ Complete · {winnie}” · Shared View “● Live · {winnie}” |

## C. New strings (Shared View, Overlay)
| Key | String |
|---|---|
| sv.empty | Nothing to watch yet — “{owner} hasn’t added any Challenges to this Winnie. Leave this tab open and they’ll pop up here on their own. Snacks are optional but recommended.” |
| sv.created | {owner} · created {dd.mm.yy} · “1 Challenge” / “{n} Challenges” |
| sv.update.chips | {old} → {new} · Started · Paused · Won |
| sv.home | winnies home · Make your own Winnie |
| ov.won | WON! · “WON · {game}” |
| ov.complete | Complete! · “Every Challenge Won · {total}” |
| ov.pinned | Pinned · |
| ov.paging | {page} / {pages} (sidebar) |

## D. Landing and Changelog
All copy is new (the brief had none): every headline, pitch, legend, stage note, OBS step, CTA, footer line, toast, release names and bullets, “What’s next?”, 404 body and retry line, and both link-preview cards. Full list in `copy/strings-by-surface.md` under “Landing”, “Changelog” and “Link-preview cards”. Placeholder facts to replace before launch: demo share link `winnies.app/shared/k1tty-vs-world`, GitHub repo `winnies-app/winnies`, issue numbers, release dates/versions.

Link preview meta: `og:title` “{winnie} · {owner} on Winnies” · `og:description` “{won} / {total} won · {pct}%. Total Timer {total}. Watch along live.”

## E. Planned and future features
- 6a: Settings, Discord, Overlay settings, Play this myself!, statistics, losses, overshoot, Players, notes, keyboard reorder announcements, and the complete **German** string set (6a · 11) — all in `copy/strings-by-surface.md` under “P6a”. German strings live in the `L` tables of `WorkspaceP6.dc.html`, `WinnieSettings.dc.html`, `CompletionStats.dc.html`.
- 6b: Game Mode names and one-line rules, e.g. “Win every Challenge. That’s it.” (Standard), “One special Challenge has to confirm every win.” (Confirmation), “Shared attempts. Run out and everything resets.” (Gauntlet), “Beat it all before the clock hits zero.” (Timeboxed), “Every loss makes what’s left harder.” (Cursed). Archive changes the Delete modal body to “Moves to the Archive for 30 days.” All under “P6b”.
