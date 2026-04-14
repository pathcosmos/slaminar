import { describe, it, expect } from 'vitest';
import { checkPrerequisite, checkAllPrerequisites } from '../../src/runtime/prerequisite.js';

describe('checkPrerequisite', () => {
  it('detects node', () => {
    const result = checkPrerequisite('node', '>= 18');
    expect(result.found).toBe(true); // node is available in test env
    expect(result.version).toBeTruthy();
    expect(result.satisfied).toBe(true);
  });

  it('detects git', () => {
    const result = checkPrerequisite('git');
    expect(result.found).toBe(true);
    expect(result.version).toBeTruthy();
  });

  it('handles missing tool gracefully', () => {
    const result = checkPrerequisite('nonexistent-tool-xyz');
    expect(result.found).toBe(false);
    expect(result.version).toBeNull();
    expect(result.satisfied).toBe(false);
  });

  it('checks version requirement', () => {
    const result = checkPrerequisite('node', '>= 999');
    expect(result.found).toBe(true);
    expect(result.satisfied).toBe(false); // no node 999+
  });
});

describe('checkAllPrerequisites', () => {
  it('checks multiple prerequisites', () => {
    const results = checkAllPrerequisites(['node >= 18', 'git']);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.found)).toBe(true);
  });

  it('parses requirement strings', () => {
    const results = checkAllPrerequisites(['python >= 3.10']);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('python');
  });
});
