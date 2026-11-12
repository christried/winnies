/**
 * The opening tag of an element in served HTML: what the server rendered on it, before any script runs. Fails the
 * test when the page has none, so a check on the tag's attributes cannot pass on an empty string (an error body, a
 * redirect, a page that is not HTML).
 *
 * @param html the served HTML
 * @param tag the element
 * @returns the tag with its attributes, e.g. `<html lang="en" data-theme="dark">`
 */
export function openingTag(html: string, tag: "html" | "body") {
  const found = new RegExp(`<${tag}\\b[^>]*>`).exec(html)?.[0];
  if (found === undefined) {
    throw new Error(`The served HTML has no opening <${tag}> tag. It starts: ${JSON.stringify(html.slice(0, 200))}`);
  }
  return found;
}
