import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createToastTimer, TOAST_TTL } from "./toast-timer";

// The countdown a toast dismisses itself by. What the caller sees is whether `onExpire` fired and when: the fake
// clock stands in for the timers and for the `now` the timer reads.
describe("toast time to live", () => {
  it("keeps today's times: success 4 s, info 5 s, error until dismissed", () => {
    expect(TOAST_TTL).toEqual({ success: 4000, info: 5000, error: null });
  });
});

describe("createToastTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const start = (ms: number) => {
    const onExpire = vi.fn();
    const timer = createToastTimer(ms, onExpire, () => Date.now());
    return { onExpire, timer };
  };

  it("fires once after ms", () => {
    const { onExpire } = start(4000);
    vi.advanceTimersByTime(4000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("does not fire before ms", () => {
    const { onExpire } = start(4000);
    vi.advanceTimersByTime(3999);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it("continues with the time left after a pause, not a fresh ms", () => {
    const { onExpire, timer } = start(4000);
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(10_000);
    expect(onExpire).not.toHaveBeenCalled();

    timer.resume();
    vi.advanceTimersByTime(2999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("treats a second pause and a second resume as no-ops", () => {
    const { onExpire, timer } = start(4000);
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(500);
    timer.pause();
    vi.advanceTimersByTime(5000);
    timer.resume();
    vi.advanceTimersByTime(1000);
    timer.resume();
    vi.advanceTimersByTime(1999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("sums the running time over several pauses", () => {
    const { onExpire, timer } = start(4000);
    vi.advanceTimersByTime(1000);
    timer.pause();
    vi.advanceTimersByTime(7000);
    timer.resume();
    vi.advanceTimersByTime(1500);
    timer.pause();
    vi.advanceTimersByTime(7000);
    timer.resume();
    // 1000 + 1500 ran, 1500 are left
    vi.advanceTimersByTime(1499);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("never fires after stop, running or paused", () => {
    const running = start(4000);
    vi.advanceTimersByTime(1000);
    running.timer.stop();
    vi.advanceTimersByTime(10_000);
    expect(running.onExpire).not.toHaveBeenCalled();

    const paused = start(4000);
    vi.advanceTimersByTime(1000);
    paused.timer.pause();
    paused.timer.stop();
    paused.timer.resume();
    vi.advanceTimersByTime(10_000);
    expect(paused.onExpire).not.toHaveBeenCalled();
  });

  it("does nothing on a pause or a resume after it expired", () => {
    const { onExpire, timer } = start(1000);
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);

    timer.pause();
    timer.resume();
    vi.advanceTimersByTime(10_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
