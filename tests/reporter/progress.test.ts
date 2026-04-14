import { describe, it, expect } from 'vitest';
import { PhaseTimer } from '../../src/reporter/progress.js';

describe('PhaseTimer', () => {
  it('does nothing when not verbose', () => {
    const timer = new PhaseTimer(false);
    timer.start('test');  // should not throw
    timer.end();          // should not throw
  });

  it('tracks timing when verbose', () => {
    const timer = new PhaseTimer(true);
    // Just verify it doesn't crash
    timer.start('test');
    timer.end('detail');
  });
});
