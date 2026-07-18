import { afterEach, describe, expect, it, vi } from 'vitest';
import { startSseHeartbeat } from './sseHeartbeat.js';

describe('startSseHeartbeat', () => {
  afterEach(() => vi.useRealTimers());

  it('writes SSE comments until stopped', () => {
    vi.useFakeTimers();
    const write = vi.fn();
    const stop = startSseHeartbeat(write, 15_000);

    vi.advanceTimersByTime(45_000);
    expect(write).toHaveBeenCalledTimes(3);
    expect(write).toHaveBeenCalledWith(': keepalive\n\n');

    stop();
    vi.advanceTimersByTime(15_000);
    expect(write).toHaveBeenCalledTimes(3);
  });
});
