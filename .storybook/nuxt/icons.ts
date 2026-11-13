import icons from "@iconify-json/tabler/icons.json";

/**
 * The SVG body of an icon of the tabler set, which the app's `ICONS` names as `tabler:<name>`. The set is a
 * devDependency read from disk, so Storybook draws icons without a request.
 *
 * @param name the Iconify name, `tabler:plus`
 * @returns the markup inside the 24 by 24 `<svg>`
 * @throws {Error} when the set does not have the icon
 */
export function iconBody(name: string): string {
  const [prefix, key] = name.split(":");
  if (prefix !== icons.prefix || !key)
    throw new Error(`The Storybook icon stub knows the ${icons.prefix} set only, not ${JSON.stringify(name)}.`);
  const own = (icons.icons as Record<string, { body: string } | undefined>)[key];
  const alias = (icons.aliases as Record<string, { parent: string } | undefined>)[key];
  const body = own?.body ?? (alias && (icons.icons as Record<string, { body: string } | undefined>)[alias.parent]?.body);
  if (!body)
    throw new Error(`The tabler set has no icon ${JSON.stringify(name)}.`);
  return body;
}
