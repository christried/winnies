import mainCss from "../../app/assets/css/main.css?raw";
import tokensCss from "../../app/assets/css/winnies-tokens.css?raw";

// Token names are read from the two files the app ships, so a token added there shows up in the stories
// without a second list to keep.

function unique(names: string[]) {
  return [
    ...new Set(names),
  ];
}

/** Names with a registration in `main.css` `@theme inline` (the ones that have a Tailwind utility). */
export function registered(prefix: string) {
  const matches = mainCss.matchAll(new RegExp(`^\\s*(--${prefix}-[\\w-]+):\\s*var\\(`, "gm"));
  return unique([...matches].map(match => match[1]!));
}

/** Names the token file declares, in the order it first declares them. */
export function declared(prefix: string) {
  const matches = tokensCss.matchAll(new RegExp(`(--${prefix}-[\\w-]+)\\s*:`, "g"));
  return unique([...matches].map(match => match[1]!));
}
