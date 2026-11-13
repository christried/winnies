/** What an inline edit asks for once it has the text. */
export interface SaveAction { action: "save"; value: string }

/** What an inline edit does with its draft once the user is done with it. */
export type Settled = SaveAction | { action: "cancel" };

/**
 * The rule for Enter and for blur, as the prototype's `saveRename` has it: Enter always asks to save, so a blank draft
 * reaches the caller, which answers with an error; a blur on a blank draft is not a request, so it gives the edit up.
 * @param draft the text in the input
 * @param source the key that ended the edit: Enter never cancels
 * @returns `save` with the trimmed draft
 */
export function settle(draft: string, source: "enter"): SaveAction;
/**
 * The same rule for either source, when the caller does not know which it has.
 * @param draft the text in the input
 * @param source the key or event that ended the edit
 * @returns `save` with the trimmed draft, or `cancel`
 */
export function settle(draft: string, source: "enter" | "blur"): Settled;
export function settle(draft: string, source: "enter" | "blur"): Settled {
  const value = draft.trim();
  if (source === "blur" && value === "")
    return { action: "cancel" };
  return { action: "save", value };
}
