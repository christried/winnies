// What a phone does with a hover (#349, the R2 review's P5). A tap puts `:hover` on a button and leaves it there until the
// next tap, so a hover look that is not inside `@media (hover: hover)` sticks. The check reads the stylesheets, not a device:
// Chromium's touch emulation would turn the media query off, but it is page-wide, and the runner mounts several story files
// in one page at once, so it would take the hover from a story that is running beside this one.
import { expect } from "storybook/test";

// The pseudo-class, not a class that has the letters in its name: `.showcase\:hovering` is escaped with a backslash.
// Not global, so `test` keeps no position between calls.
const HOVER = /(?<!\\):hover(?![\w-])/;

/** A rule that a hover starts, and whether it sits in a media query for devices that can hover. */
interface HoverRule {
  selector: string;
  guarded: boolean;
}

/**
 * Every rule of the page's stylesheets that has `:hover` in its selector and would otherwise match the element.
 *
 * @param el the element
 * @returns the rules, each with whether a `(hover: hover)` media query contains it
 */
function hoverRulesOf(el: HTMLElement): HoverRule[] {
  const found: HoverRule[] = [];
  // Layers, media and supports blocks hold rules; so does a style rule, with native nesting.
  const walk = (rules: CSSRuleList, guarded: boolean) => {
    for (const rule of rules) {
      const here = guarded || (rule instanceof CSSMediaRule && /\(hover:\s*hover\)/.test(rule.conditionText));
      if (rule instanceof CSSStyleRule && HOVER.test(rule.selectorText)) {
        // The same selector with the hover always true: whether the element is one the rule is for.
        if (el.matches(rule.selectorText.replace(new RegExp(HOVER, "g"), ":is(*)")))
          found.push({ selector: rule.selectorText, guarded: here });
      }
      if ("cssRules" in rule)
        walk(rule.cssRules as CSSRuleList, here);
    }
  };
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules, false);
    }
    catch {
      // A sheet from another origin cannot be read, and holds no rule of the kit's.
    }
  }
  return found;
}

/**
 * Expects every hover look of an element to be for a device that can hover: each rule a `:hover` starts sits inside
 * `@media (hover: hover)`, so a tap on a phone leaves no lift. The forced `.is-hover` look of the stories is a class, not a
 * `:hover`, and is not in question here.
 *
 * @param el an idle, enabled control with a hover look
 */
export function expectHoverGuarded(el: HTMLElement) {
  const rules = hoverRulesOf(el);
  // Not vacuous: an element without a hover look would pass for nothing.
  expect(rules.length, "the rules a hover starts on the element").toBeGreaterThan(0);
  for (const rule of rules)
    expect(rule.guarded, rule.selector).toBe(true);
}
