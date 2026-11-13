<script lang="ts" setup>
import type { ThemePreference } from "~~/shared/constants";
import type { MaterialIconName } from "~/utils/material-icons";

/** How one preference is presented. */
interface ThemeOption {
  /** Tooltip, accessible name and screen-reader announcement */
  label: string;
  /** Shown while this preference is active */
  icon: MaterialIconName;
}

const OPTIONS: Record<ThemePreference, ThemeOption> = {
  system: { label: "System", icon: "contrast" },
  light: { label: "Light", icon: "light_mode" },
  dark: { label: "Dark", icon: "dark_mode" },
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
  <div>
    <UiIconButton
      variant="ghost"
      :icon="OPTIONS[preference].icon"
      :label="`Theme: ${OPTIONS[preference].label}. Change theme`"
      @click="cycle()"
    />
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
