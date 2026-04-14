import { describe, it, expect } from 'vitest';
import { detectRuntimes } from '../../src/runtime/detector.js';

describe('detectRuntimes', () => {
  it('detects node availability', () => {
    const status = detectRuntimes();
    expect(status.node.available).toBe(true); // node is in test env
    expect(status.node.version).toBeTruthy();
    expect(status.node.manager).toBeTruthy(); // system, volta, or nvm
  });

  it('returns structured status for all runtimes', () => {
    const status = detectRuntimes();
    expect(typeof status.node.available).toBe('boolean');
    expect(typeof status.python.available).toBe('boolean');
    expect(typeof status.uv.available).toBe('boolean');
    expect(typeof status.volta.available).toBe('boolean');
  });

  it('python manager is null when python not available', () => {
    // We can't easily mock this, but verify the structure
    const status = detectRuntimes();
    if (!status.python.available) {
      expect(status.python.manager).toBeNull();
    }
  });
});
