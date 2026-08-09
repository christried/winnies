<script setup lang="ts">
// Most of the file is AI-generated, enjoy with caution

// Swatch page for design-system sign-off — WT-B01 colour, WT-B02 type,
// WT-B03 icons, WT-B04 components. Not production: it exists so those stories
// can be answered by looking rather than guessing, and it goes away (or gets
// gated) before release.
//
// Class names are written out in full on purpose. Tailwind scans source files
// for complete class strings, so `bg-${slot}` would compile to nothing — the
// utility is never generated because that literal never appears anywhere.

// WT-B02 shipped browser-synthesised bold once already, because @nuxt/fonts
// defaults to weights: [400] and says nothing about it. Rendering all four
// adjacent is how that stays caught: a faked weight smears next to a real one.

import type { IconName } from "~/utils/icons";
import { ICONS } from "~/utils/icons";

const weights = [
  { klass: "font-normal", name: "400 · normal" },
  { klass: "font-medium", name: "500 · medium" },
  { klass: "font-semibold", name: "600 · semibold" },
  { klass: "font-bold", name: "700 · bold" },
];

// Every key UiIcon accepts, read from the source of truth rather than copied —
// a new entry in app/utils/icons.ts shows up here with no edit. A name that
// fails to resolve renders as nothing at all, so the only way to know they are
// all real is to look at them all.
const icons = Object.keys(ICONS) as IconName[];

// TimerDisplay boundaries. Every pair here is a place the format changes shape,
// which is where formatter bugs live: the minute rollover, the width change at
// ten minutes, and 3599 → 3600 where the hours segment appears at all.
const timerSeconds = [0, 9, 59, 60, 599, 600, 3599, 3600, 3661, 36000];

// D17 proof. A dot mounted at page load is in phase with its siblings whether
// or not usePulseDelay() works, so the test needs one that arrives late.
const showLateDot = ref(false);

// One live CounterPill, so the disabled edges can be walked into rather than
// only read about.
const liveCount = ref(2);

const galleryModal = useTemplateRef("galleryModal");

const surfaces = [
  { klass: "bg-base-100", name: "base-100", use: "page background", lightness: "20%" },
  { klass: "bg-base-200", name: "base-200", use: "raised surface — cards", lightness: "15%" },
  { klass: "bg-base-300", name: "base-300", use: "borders, dividers", lightness: "10%" },
];

const semantics = [
  { klass: "bg-primary text-primary-content", name: "primary", use: "running timer, new winnie button" },
  { klass: "bg-secondary text-secondary-content", name: "secondary", use: "unassigned" },
  { klass: "bg-accent text-accent-content", name: "accent", use: "unassigned" },
  { klass: "bg-neutral text-neutral-content", name: "neutral", use: "quiet controls" },
  { klass: "bg-info text-info-content", name: "info", use: "unassigned" },
  { klass: "bg-success text-success-content", name: "success", use: "won challenge, complete winnie" },
  { klass: "bg-warning text-warning-content", name: "warning", use: "unassigned" },
  { klass: "bg-error text-error-content", name: "error", use: "destructive actions" },
];

const buttons = [
  { klass: "btn", name: "btn" },
  { klass: "btn btn-primary", name: "btn-primary" },
  { klass: "btn btn-secondary", name: "btn-secondary" },
  { klass: "btn btn-accent", name: "btn-accent" },
  { klass: "btn btn-neutral", name: "btn-neutral" },
  { klass: "btn btn-info", name: "btn-info" },
  { klass: "btn btn-success", name: "btn-success" },
  { klass: "btn btn-warning", name: "btn-warning" },
  { klass: "btn btn-error", name: "btn-error" },
  { klass: "btn btn-ghost", name: "btn-ghost" },
  { klass: "btn btn-outline", name: "btn-outline" },
];

// Deferred feature (see BACKLOG scope) — rendered only to confirm the tokens
// resolve and stay distinguishable from each other.
const players = [
  "bg-player-1",
  "bg-player-2",
  "bg-player-3",
  "bg-player-4",
  "bg-player-5",
  "bg-player-6",
  "bg-player-7",
  "bg-player-8",
];
</script>

<template>
  <main class="min-h-screen bg-base-100 p-6 text-base-content sm:p-10">
    <header class="mb-10 max-w-2xl">
      <h1 class="text-2xl font-bold">
        Design tokens — theme <span class="text-primary">abyss</span>
      </h1>
      <p class="mt-2 text-sm opacity-70">
        Not a production page. Open it beside
        <code class="rounded bg-base-300 px-1">design/wintool3.dc.html</code>
        to sign off colour (WT-B01), type (WT-B02), icons (WT-B03) and
        components (WT-B04).
      </p>
    </header>

    <!-- The question that would hurt to discover late, so it goes first. -->
    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        1 · Running vs won
      </h2>
      <p class="mb-4 max-w-2xl text-sm opacity-70">
        These two sit side by side in every challenge row and must not be confusable at a glance.
        In <code>abyss</code> they are only ~27° apart in hue — <code>primary</code> is lime
        (hue 125), <code>success</code> is green (hue 152).
      </p>

      <!-- Rows use the real StatusDot and TimerDisplay. Until WT-B04 these were
           hand-rolled spans, which meant the page proving D17 was itself the only
           place applying animate-pulse-run without usePulseDelay() — permanently
           out of phase with every real dot. Never demonstrate a component with a
           copy of it. -->
      <div class="max-w-xl overflow-hidden rounded-box border border-base-300">
        <div class="flex items-center gap-3 border-b border-base-300 bg-base-200 p-3">
          <StatusDot status="running" />
          <span class="grow text-sm">Beat the tutorial boss</span>
          <TimerDisplay :seconds="257" status="running" />
        </div>
        <div class="flex items-center gap-3 border-b border-base-300 bg-base-200 p-3">
          <StatusDot status="won" />
          <span class="grow text-sm line-through opacity-60">Find the hidden shrine</span>
          <TimerDisplay :seconds="723" status="won" />
        </div>
        <div class="flex items-center gap-3 bg-base-200 p-3">
          <StatusDot status="idle" />
          <span class="grow text-sm opacity-60">No-hit the second area</span>
          <TimerDisplay :seconds="0" status="idle" />
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-6">
        <div class="flex items-center gap-2">
          <StatusDot status="running" />
          <span class="text-sm">
            <code>animate-pulse-run</code> — 1.5s, respects reduced motion.
            Kept in sync by hand with <code>PULSE_MS</code> in
            <code>use-pulse.ts</code>; the comment in each file is the only thing
            holding them together.
          </span>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        2 · Typography
      </h2>
      <p class="mb-4 max-w-2xl text-sm opacity-70">
        Chivo and Chivo Mono, self-hosted via <code>@nuxt/fonts</code>. Both are variable fonts,
        so every weight comes out of the same file.
      </p>

      <div class="grid max-w-4xl gap-4 sm:grid-cols-2">
        <div class="rounded-box border border-base-300 bg-base-200 p-4">
          <div class="mb-2 font-mono text-xs opacity-50">
            --font-sans · Chivo
          </div>
          <p class="text-lg">
            Sphinx of black quartz, judge my vow
          </p>
        </div>
        <div class="rounded-box border border-base-300 bg-base-200 p-4">
          <div class="mb-2 font-mono text-xs opacity-50">
            --font-mono · Chivo Mono
          </div>
          <p class="font-mono text-lg">
            Sphinx of black quartz, judge my vow
          </p>
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        Weight ladder
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        All four weights must be real files. A synthetic weight — the browser smearing 400 to fake
        700 — reads as slightly blurred and unevenly spaced next to a genuine one.
      </p>
      <div class="grid max-w-4xl gap-4 sm:grid-cols-2">
        <div class="rounded-box border border-base-300 bg-base-200 p-4">
          <div
            v-for="w in weights"
            :key="w.klass"
            class="flex items-baseline justify-between gap-4 py-1"
          >
            <span class="text-lg" :class="w.klass">Hamburgefonstiv</span>
            <span class="font-mono text-xs opacity-50">{{ w.name }}</span>
          </div>
        </div>
        <div class="rounded-box border border-base-300 bg-base-200 p-4">
          <div
            v-for="w in weights"
            :key="w.klass"
            class="flex items-baseline justify-between gap-4 py-1"
          >
            <span class="font-mono text-lg" :class="w.klass">Hamburgefons</span>
            <span class="font-mono text-xs opacity-50">{{ w.name }}</span>
          </div>
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        The four roles
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        Defined in <code>main.css</code>. Nothing else should set a font size by hand.
      </p>
      <div class="max-w-xl space-y-4 rounded-box border border-base-300 bg-base-200 p-5">
        <div>
          <div class="type-wordmark">
            wintool
          </div>
          <div class="mt-1 font-mono text-xs opacity-40">
            .type-wordmark
          </div>
        </div>
        <div>
          <div class="type-timer-total">
            01:23:45
          </div>
          <div class="mt-1 font-mono text-xs opacity-40">
            .type-timer-total — fluid 24→40px, resize to check
          </div>
        </div>
        <div>
          <div class="type-meta">
            3 of 7 won · 43% · 12:03
          </div>
          <div class="mt-1 font-mono text-xs opacity-40">
            .type-meta
          </div>
        </div>
        <div>
          <div class="type-label">
            view only
          </div>
          <div class="mt-1 font-mono text-xs opacity-40">
            .type-label
          </div>
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        Tabular numerals
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        Timers tick every second. Without tabular figures the digits change width and the whole
        row twitches. Every colon below must sit on one vertical line.
      </p>
      <div class="inline-block rounded-box border border-base-300 bg-base-200 px-5 py-4">
        <div class="type-timer-total leading-tight">
          11:11
        </div>
        <div class="type-timer-total leading-tight">
          00:00
        </div>
        <div class="type-timer-total leading-tight">
          88:88
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        3 · Icons
      </h2>
      <p class="mb-4 max-w-2xl text-sm opacity-70">
        Tabler via <code>@nuxt/icon</code>, wrapped in <code>&lt;UiIcon&gt;</code> so names are a
        typed, closed list. Stroke stays at Tabler's shipped 2 rather than the mockup's 1.75.
        An icon whose name fails to resolve renders as blank space — count eighteen.
      </p>

      <div class="grid max-w-4xl grid-cols-3 gap-3 sm:grid-cols-6">
        <div
          v-for="n in icons"
          :key="n"
          class="flex flex-col items-center gap-2 rounded-box border border-base-300 bg-base-200 p-3"
        >
          <UiIcon :name="n" :size="22" />
          <span class="font-mono text-xs opacity-50">{{ n }}</span>
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        Colour inheritance
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        Icons carry <code>currentColor</code>, so they take the semantic slot of whatever contains
        them — no per-icon fill.
      </p>
      <div class="flex flex-wrap items-center gap-6">
        <span class="flex items-center gap-2 text-primary">
          <UiIcon name="play" :size="20" /> <span class="text-sm">text-primary</span>
        </span>
        <span class="flex items-center gap-2 text-success">
          <UiIcon name="trophy" :size="20" /> <span class="text-sm">text-success</span>
        </span>
        <span class="flex items-center gap-2 text-error">
          <UiIcon name="trash" :size="20" /> <span class="text-sm">text-error</span>
        </span>
        <span class="flex items-center gap-2 opacity-50">
          <UiIcon name="eye" :size="20" /> <span class="text-sm">inherited, dimmed</span>
        </span>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        Optical centring in buttons
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        D16. Look for a glyph sitting off-centre in its square — <code>play</code> is the usual
        offender, since a triangle's visual centre is left of its bounding box.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-square btn-primary">
          <UiIcon name="plus" :size="20" />
        </button>
        <button type="button" class="btn btn-square">
          <UiIcon name="share" :size="20" />
        </button>
        <button type="button" class="btn btn-square btn-ghost">
          <UiIcon name="more" :size="20" />
        </button>
        <button type="button" class="btn btn-square btn-ghost btn-sm">
          <UiIcon name="edit" />
        </button>
        <button type="button" class="btn btn-square btn-ghost btn-sm">
          <UiIcon name="grip" />
        </button>
        <button type="button" class="btn btn-circle btn-lg btn-primary">
          <UiIcon name="play" :size="26" />
        </button>
        <button type="button" class="btn btn-circle btn-lg btn-primary">
          <UiIcon name="pause" :size="26" />
        </button>
        <button type="button" class="btn btn-sm">
          <UiIcon name="reset" /> Reset
        </button>
        <button type="button" class="btn btn-error btn-sm">
          <UiIcon name="trash" /> Delete
        </button>
      </div>
    </section>

    <!-- WT-B04. Everything DaisyUI had no equivalent for, plus the two wrappers
         whose behaviour is worth being able to poke at. -->
    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        4 · Components
      </h2>
      <p class="mb-4 max-w-2xl text-sm opacity-70">
        The four custom components from WT-B04 in every state, plus
        <code>UiModal</code> and <code>UiDropdown</code>. Everything else on the
        page above comes from DaisyUI — see
        <code>docs/reference/daisyui-components.md</code> in the planning repo.
      </p>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        TimerDisplay — format boundaries
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        Minutes are always two digits, hours never are —
        <code>00:00</code> … <code>59:59</code>, then <code>1:00:00</code>. The pair that
        matters is 3599 → 3600, where the hours segment appears and the string grows by two
        characters. Colons align within a shape but not across shapes; that is arithmetic, not
        a font failure. What <code>tabular-nums</code> buys is that no digit is wider than
        another, so a ticking timer never shifts.
      </p>
      <div class="flex max-w-md flex-col gap-1 rounded-box border border-base-300 bg-base-200 p-4 text-right">
        <TimerDisplay
          v-for="s in timerSeconds"
          :key="s"
          :seconds="s"
          status="running"
        />
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        TimerDisplay — sizes and states
      </h3>
      <div class="flex flex-wrap items-end gap-6 rounded-box border border-base-300 bg-base-200 p-4">
        <TimerDisplay
          :seconds="3661"
          size="total"
          status="running"
        />
        <TimerDisplay
          :seconds="3661"
          size="total"
          status="won"
        />
        <TimerDisplay
          :seconds="3661"
          size="total"
          status="idle"
        />
        <div class="flex flex-col gap-1">
          <TimerDisplay :seconds="257" status="running" />
          <TimerDisplay :seconds="257" status="won" />
          <TimerDisplay :seconds="257" status="idle" />
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        CounterPill
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        Emits <code>increment</code> / <code>decrement</code> rather than a new value — the count
        is server-authoritative (<code>D3</code>), so the pill never invents a number. Minus
        disables at zero, plus at target, and <code>disabled</code> covers the read-only shared
        view. <code>1 / 100</code> stays on this page permanently: it is what caught the value
        wrapping onto three lines.
      </p>
      <div class="flex flex-wrap items-center gap-4 rounded-box border border-base-300 bg-base-200 p-4">
        <CounterPill
          :value="0"
          :target="3"
          label="wins for Find the hidden shrine"
        />
        <CounterPill
          :value="2"
          :target="5"
          label="wins for Beat the tutorial boss"
        />
        <CounterPill
          :value="1"
          :target="100"
          label="wins for the grind"
        />
        <CounterPill
          :value="1"
          :target="3"
          label="wins"
          disabled
        />
        <div class="flex items-center gap-2">
          <CounterPill
            :value="liveCount"
            :target="3"
            label="wins, live"
            @increment="liveCount++"
            @decrement="liveCount--"
          />
          <span class="text-xs opacity-60">live — walk it into both edges</span>
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        StatusDot, PulseIndicator, and the D17 beat
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        A CSS animation starts when its element starts animating, so a dot that appears ten
        seconds after its neighbours would be permanently out of phase.
        <code>usePulseDelay()</code> anchors every pulse to one shared origin with a negative
        <code>animation-delay</code>, so a late arrival joins the beat already in progress.
        <strong>Mount the fourth dot well after the page loads</strong> — dots that all mount
        together are in phase whether or not any of this works, so that button is the only real
        test on this page.
      </p>
      <div class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-200 p-4">
        <div class="flex flex-wrap items-center gap-4">
          <StatusDot status="idle" />
          <StatusDot status="running" />
          <StatusDot status="won" />
          <span class="text-xs opacity-60">idle · running · won</span>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          <StatusDot status="running" />
          <StatusDot status="running" />
          <StatusDot status="running" />
          <PulseIndicator :count="3" />
          <StatusDot v-if="showLateDot" status="running" />
          <button
            type="button"
            class="btn btn-xs"
            @click="showLateDot = !showLateDot"
          >
            {{ showLateDot ? "remove" : "mount" }} a late dot
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-6">
          <PulseIndicator :count="0" empty-label="nothing running" />
          <PulseIndicator :count="1" />
          <PulseIndicator :count="12" />
          <span class="text-xs opacity-60">
            <code>:count="0"</code> with no <code>empty-label</code> renders nothing at all —
            the owner header, versus the shared view's "nothing running"
          </span>
        </div>
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        UiIconButton
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        <code>label</code> is required, not optional, so a missing accessible name is a type
        error rather than an audit finding at WT-J03. The icon itself is
        <code>aria-hidden</code>, which is why the button — not the icon — has to be the
        component.
      </p>
      <div class="flex flex-wrap items-center gap-2 rounded-box border border-base-300 bg-base-200 p-4">
        <UiIconButton
          icon="plus"
          label="New win-challenge"
          class="btn-primary"
        />
        <UiIconButton
          icon="share"
          label="Open shared view"
          class="btn-ghost"
        />
        <UiIconButton
          icon="more"
          label="More actions"
          class="btn-ghost btn-sm"
        />
        <UiIconButton
          icon="trash"
          label="Delete Winnie"
          class="btn-error btn-sm"
        />
      </div>

      <h3 class="mt-8 mb-1 text-sm font-semibold">
        UiModal and UiDropdown
      </h3>
      <p class="mb-3 max-w-2xl text-sm opacity-70">
        Both lean on the platform. The modal is a native <code>&lt;dialog&gt;</code> opened with
        <code>showModal()</code>, so focus trapping, Escape, background-inert and top-layer
        rendering are free. The dropdown uses the <code>[popover]</code> variant, which is the
        only one of DaisyUI's three that closes on Escape and on an outside click — the other two
        have no Escape handling at all, because CSS cannot listen for a key. Arrow-key navigation
        is deliberately absent and <code>role="menu"</code> deliberately unset: the role promises
        navigation the CSS does not implement, which would be worse than plain buttons.
      </p>
      <div class="flex flex-wrap items-center gap-4 rounded-box border border-base-300 bg-base-200 p-4">
        <button
          type="button"
          class="btn btn-sm"
          @click="galleryModal?.open()"
        >
          Open modal
        </button>
        <UiModal
          ref="galleryModal"
          title="New Winnie"
          action-label="Create"
        >
          <p class="text-sm opacity-70">
            Tab — focus stays inside. Escape — closes. Focus returns to the trigger.
          </p>
        </UiModal>

        <UiDropdown label="Row actions" trigger-class="btn btn-square btn-ghost btn-sm">
          <template #trigger>
            <UiIcon name="more" />
          </template>
          <template #default="{ close }">
            <li>
              <button type="button" @click="close()">
                Edit
              </button>
            </li>
            <li>
              <button type="button" @click="close()">
                Duplicate
              </button>
            </li>
            <li>
              <button type="button" @click="close()">
                Pin
              </button>
            </li>
          </template>
        </UiDropdown>
        <span class="text-xs opacity-60">
          icon-only trigger — passes <code>label</code>, because
          <code>aria-label</code> replaces visible text and so cannot be required
        </span>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        5 · Surfaces
      </h2>
      <p class="mb-4 max-w-2xl text-sm opacity-70">
        Note the direction: in <code>abyss</code>, <code>base-100</code> is the
        <em>lightest</em> of the three. Raised surfaces recede rather than lift.
      </p>
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="s in surfaces"
          :key="s.name"
          class="rounded-box border border-base-300 p-4"
          :class="s.klass"
        >
          <div class="font-mono text-sm">
            {{ s.klass }}
          </div>
          <p class="mt-1 text-xs opacity-70">
            {{ s.use }} · L {{ s.lightness }}
          </p>
        </div>
      </div>
      <p class="mt-3 text-sm">
        <code>text-base-content</code> is this paragraph — a warm off-white, not pure grey.
      </p>
    </section>

    <section class="mb-12">
      <h2 class="mb-4 text-lg font-semibold">
        6 · Semantic slots
      </h2>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="c in semantics"
          :key="c.name"
          class="rounded-box p-4"
          :class="c.klass"
        >
          <div class="font-mono text-sm font-semibold">
            {{ c.name }}
          </div>
          <p class="mt-2 text-xs opacity-90">
            Sample text in <code>{{ c.name }}-content</code>.
          </p>
          <p class="mt-2 text-xs opacity-75">
            {{ c.use }}
          </p>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="mb-4 text-lg font-semibold">
        7 · Buttons
      </h2>
      <div class="flex flex-wrap gap-3">
        <button
          v-for="b in buttons"
          :key="b.name"
          type="button"
          :class="b.klass"
        >
          {{ b.name }}
        </button>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="mb-4 text-lg font-semibold">
        8 · Card
      </h2>
      <div class="card max-w-sm border border-base-300 bg-base-200">
        <div class="card-body">
          <h3 class="card-title text-base">
            Elden Ring
          </h3>
          <p class="text-sm opacity-70">
            3 of 7 challenges won · 1 running
          </p>
          <div class="card-actions justify-end">
            <button type="button" class="btn btn-ghost btn-sm">
              Details
            </button>
            <button type="button" class="btn btn-primary btn-sm">
              Resume
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        9 · Player palette
      </h2>
      <p class="mb-4 max-w-2xl text-sm opacity-70">
        Deferred feature. Defined now because DaisyUI has no categorical palette — rendered here
        only to confirm the tokens resolve and stay separable.
      </p>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="(p, i) in players"
          :key="p"
          class="flex size-14 items-center justify-center rounded-box font-mono text-sm text-base-300"
          :class="p"
        >
          {{ i + 1 }}
        </div>
      </div>
    </section>

    <section class="mb-4">
      <h2 class="mb-4 text-lg font-semibold">
        10 · Spacing scale
      </h2>
      <div class="flex flex-wrap items-end gap-4">
        <div
          v-for="[cls, px] of [['h-1', '4px'], ['h-1.5', '6px'], ['h-2', '8px'], ['h-2.5', '10px'], ['h-3', '12px'], ['h-3.5', '14px'], ['h-4', '16px']]"
          :key="cls"
          class="text-center"
        >
          <div class="w-12 bg-primary" :class="cls" />
          <div class="mt-2 font-mono text-xs opacity-70">
            {{ cls }}
          </div>
          <div class="font-mono text-xs opacity-40">
            {{ px }}
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
