<script lang="ts" setup>
import type { ThemePreference } from "~~/shared/constants";
import type { IconName } from "~/utils/icons";

/** How one preference is presented. */
interface ThemeOption {
  /** Tooltip, accessible name and screen-reader announcement */
  label: string;
  /** Shown while this preference is active */
  icon: IconName;
}

const OPTIONS: Record<ThemePreference, ThemeOption> = {
  system: { label: "System", icon: "themeSystem" },
  light: { label: "Light", icon: "themeLight" },
  dark: { label: "Dark", icon: "themeDark" },
};

const { preference, setPreference } = useTheme();

// Filled only after a click, so nothing is announced on page load
const announcement = ref("");

/**
 * Advances to the next preference: system → light → dark → system.
 */
async function cycle() {
  const next = nextThemePreference(preference.value);

  announcement.value = `${OPTIONS[next].label} theme`;
  await setPreference(next);
}
</script>

<template>
  <div class="tooltip tooltip-bottom" :data-tip="`Theme: ${OPTIONS[preference].label}`">
    <button
      type="button"
      class="swap swap-active swap-rotate"
      :aria-label="`Theme: ${OPTIONS[preference].label}. Change theme`"
      @click="cycle()"
    >
      <UiIcon
        v-for="(option, value) in OPTIONS"
        :key="value"
        :name="option.icon"
        :size="40"
        :class="value === preference ? 'swap-on' : 'swap-off'"
      />
    </button>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
