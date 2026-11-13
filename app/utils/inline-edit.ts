/** What an inline edit does with its draft once the user is done with it. */
export type Settled = { action: "save"; value: string } | { action: "cancel" };

/**
 * The rule for Enter and for blur, as the prototype's `saveRename` has it: Enter always asks to save, so a blank draft
 * reaches the caller, which answers with an error; a blur on a blank draft is not a request, so it gives the edit up.
 * @param draft the text in the input
 * @param source the key or event that ended the edit
 * @returns `save` with the trimmed draft, or `cancel`
 */
export function settle(draft: string, source: "enter" | "blur"): Settled {
  const value = draft.trim();
  if (source === "blur" && value === "")
    return { action: "cancel" };
  return { action: "save", value };
}
