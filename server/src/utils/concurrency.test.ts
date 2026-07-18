import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency.js';

describe('mapWithConcurrency', () => {
  it('preserves result order while bounding active work', async () => {
    let active = 0;
    let maxActive = 0;

    const results = await mapWithConcurrency([30, 5, 20, 1], 2, async (delay, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, delay));
      active -= 1;
      return index * 2;
    });

    expect(results).toEqual([0, 2, 4, 6]);
    expect(maxActive).toBe(2);
  });
});
