import type { WinniesMotion } from "./motion/types";

/** The recipes the sequences call; a test passes a spy for them. */
export type WonMotion = Pick<WinniesMotion, "won" | "capture" | "flip" | "arc" | "land" | "sticker" | "wait" | "on" | "T">;

/** What a row hands the sequences: its elements and the one change that moves it. The toggle owns none of them. */
export interface WinTarget {
  /** The changing row's key in `rows()`. */
  key: string;
  /** Every row of the list with its key, as `m.capture` takes them. Read again after `commit`, because the list has moved. */
  rows: () => [string, HTMLElement][];
  /** The row's mid element (C01 jelly, R17 land), its face disc (C01 pop and fountain) and its Won sticker (only once Won). */
  mid: () => HTMLElement | null;
  face: () => HTMLElement | null;
  sticker: () => HTMLElement | null;
  /** Sets the Won state and resolves once the DOM shows it (`await nextTick()`). */
  commit: () => Promise<void> | void;
  /** The surface's UI scale, as `m.flip`'s `sc`; 1 by default. */
  scale?: number;
}

/**
 * Marks a Challenge Won as the handoff plays it: C01 (the jelly, the face pop, the fountain and the cue), then the row
 * travels to the Won group and lands (R17). The row, not the toggle, owns the elements, so the toggle only asks and the
 * row calls this from its `toggle` handler. Nini's hop and the progress bar's move (R29) are the row's own.
 *
 * It resolves once the flip has started, not when the arc ends, so a caller's "ignore a second toggle until this is
 * done" covers the wait for the jelly and the commit. Under reduced motion every recipe creates nothing, `on("cel")` is
 * false and `wait` takes 0 ms, so the row is Won at once and no branch is needed here.
 * @param m the surface's motion instance
 * @param t the row
 * @returns once the Won state is committed and the flip is started
 */
export async function playWon(m: WonMotion, t: WinTarget): Promise<void> {
  m.won(t.mid(), t.face(), false);
  // The row leaves as the jelly's squash ends.
  await m.wait(m.on("cel")
    ? m.T().D.jelly * 0.9
    : 0);

  const prev = m.capture(t.rows());
  await t.commit();

  // R17: the changing row travels, then lands and slaps its sticker. The elements are read when it arrives, because the
  // sticker exists only once the row is Won. A row that has nowhere to go, or no responsive tier, lands where it is.
  const settle = () => {
    m.land(t.mid());
    m.sticker(t.sticker());
  };
  m.flip(prev, t.rows(), t.scale ?? 1, (key, el, dy) => {
    if (key !== t.key)
      return undefined;
    if (Math.abs(dy) <= 1 || !m.on("resp"))
      settle();
    else
      m.arc(el, dy, settle);
    return true;
  });
}

/**
 * Takes a Challenge back to Open (R18): the row slides to its place in the Open group, with no celebration, no arc and no
 * sticker.
 * @param m the surface's motion instance
 * @param t the row
 * @returns once the Open state is committed and the flip is started
 */
export async function playUnwon(m: WonMotion, t: WinTarget): Promise<void> {
  const prev = m.capture(t.rows());
  await t.commit();
  m.flip(prev, t.rows(), t.scale ?? 1);
}
