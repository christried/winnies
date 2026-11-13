import { describe, expect, it, vi } from "vitest";
import { refreshOnReturn } from "./use-refresh-on-return";

// The document and the window are EventTargets; `hidden` is the one property the document is read for.
function setup(hidden = false) {
  const doc = Object.assign(new EventTarget(), { hidden });
  const win = new EventTarget();
  const refresh = vi.fn();
  const stop = refreshOnReturn({ doc, win }, refresh);
  return { doc, win, refresh, stop };
}

describe("refreshOnReturn", () => {
  it("refreshes once when the tab is visible again", () => {
    const { doc, refresh } = setup();

    doc.dispatchEvent(new Event("visibilitychange"));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the tab goes hidden", () => {
    const { doc, refresh } = setup(true);

    doc.dispatchEvent(new Event("visibilitychange"));

    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes once when the window is focused", () => {
    const { win, refresh } = setup();

    win.dispatchEvent(new Event("focus"));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("stops listening once stopped", () => {
    const { doc, win, refresh, stop } = setup();

    stop();
    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(new Event("focus"));

    expect(refresh).not.toHaveBeenCalled();
  });
});
