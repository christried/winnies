// Most of the file is AI-generated, enjoy with caution

// Swatch page for design-system sign-off — WT-B01 colour, WT-B02 type,
// WT-B03 icons. Not production: it exists so those stories can be answered by
// looking rather than guessing, and it goes away (or gets gated) before release.
//
// Class names are written out in full on purpose. Tailwind scans source files
// for complete class strings, so `bg-${slot}` would compile to nothing — the
// utility is never generated because that literal never appears anywhere.

// WT-B02 shipped browser-synthesised bold once already, because @nuxt/fonts
// defaults to weights: [400] and says nothing about it. Rendering all four
// adjacent is how that stays caught: a faked weight smears next to a real one.

<script setup lang="ts">
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

const surfaces = [
  { klass: "bg-base-100", name: "base-100", use: "page background", lightness: "20%" },
  { klass: "bg-base-200", name: "base-200", use: "raised surface — cards", lightness: "15%" },
  { klass: "bg-base-300", name: "base-300", use: "borders, dividers", lightness: "10%" },
];

const semantics = [
  { klass: "bg-primary text-primary-content", name: "primary", use: "running timer, new-run button" },
  { klass: "bg-secondary text-secondary-content", name: "secondary", use: "unassigned" },
  { klass: "bg-accent text-accent-content", name: "accent", use: "unassigned" },
  { klass: "bg-neutral text-neutral-content", name: "neutral", use: "quiet controls" },
  { klass: "bg-info text-info-content", name: "info", use: "unassigned" },
  { klass: "bg-success text-success-content", name: "success", use: "won challenge, complete run" },
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
        to sign off colour (WT-B01), type (WT-B02) and icons (WT-B03).
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

      <div class="max-w-xl overflow-hidden rounded-box border border-base-300">
        <div class="flex items-center gap-3 border-b border-base-300 bg-base-200 p-3">
          <span class="size-2.5 shrink-0 animate-pulse-run rounded-full bg-primary" />
          <span class="grow text-sm">Beat the tutorial boss</span>
          <span class="font-mono text-sm text-primary">04:17</span>
        </div>
        <div class="flex items-center gap-3 border-b border-base-300 bg-base-200 p-3">
          <span class="size-2.5 shrink-0 rounded-full bg-success" />
          <span class="grow text-sm line-through opacity-60">Find the hidden shrine</span>
          <span class="font-mono text-sm text-success">12:03</span>
        </div>
        <div class="flex items-center gap-3 bg-base-200 p-3">
          <span class="size-2.5 shrink-0 rounded-full bg-base-300" />
          <span class="grow text-sm opacity-60">No-hit the second area</span>
          <span class="font-mono text-sm opacity-40">--:--</span>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-6">
        <div class="flex items-center gap-2">
          <span class="size-3 animate-pulse-run rounded-full bg-primary" />
          <span class="text-sm">
            <code>animate-pulse-run</code> — 1.6s, respects reduced motion
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

    <section class="mb-12">
      <h2 class="mb-1 text-lg font-semibold">
        4 · Surfaces
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
        5 · Semantic slots
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
        6 · Buttons
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
        7 · Card
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
        8 · Player palette
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
        9 · Spacing scale
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
