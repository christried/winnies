/**
 * The stop a Tab press moves the focus to, inside a modal that traps it. The modal's tabbable elements are a list in
 * document order; the trap wraps at both ends, so the focus never reaches the page behind or the browser's own UI.
 *
 * @param count how many tabbable elements the modal holds
 * @param index where the active element is in that list, or -1 when it is not one (the dialog itself, `<body>`)
 * @param shift whether the press is Shift+Tab
 * @returns the index to focus, or -1 when there is nothing to focus
 */
export function nextFocusIndex(count: number, index: number, shift: boolean): number {
  if (count <= 0)
    return -1;
  if (index < 0) {
    return shift
      ? count - 1
      : 0;
  }
  return (index + (shift
    ? -1
    : 1) + count) % count;
}
