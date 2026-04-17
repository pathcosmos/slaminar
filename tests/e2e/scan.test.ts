import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, createFixture, makeTmpDir, runCli } from './_helpers.js';

describe('e2e: slaminar scan', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpDir('slaminar-e2e-scan-');
  });

  afterEach(() => {
    cleanup(tmp);
  });

  it('scans a small fixture and emits JSON with file stats', async () => {
    const project = join(tmp, 'project');
    createFixture('small', project);

    const result = await runCli(['scan', project], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    // Output is the ProjectSnapshot JSON — must parse and have fileStats.
    const snapshot = JSON.parse(result.stdout);
    expect(snapshot).toHaveProperty('fileStats');
    expect(snapshot).toHaveProperty('fileTree');
    expect(snapshot.root).toContain('project');
    // Small fixture has 7+ source files — fileStats should have counts > 0.
    const totalFiles = Object.values(snapshot.fileStats as Record<string, number>).reduce(
      (a, b) => a + b,
      0,
    );
    expect(totalFiles).toBeGreaterThan(0);
  });

  it('returns non-zero exit on a nonexistent path and prints an error', async () => {
    const missing = join(tmp, 'does', 'not', 'exist');

    const result = await runCli(['scan', missing], { cwd: tmp });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/does not exist|Error/i);
  });

  it('scans an empty directory without crashing', async () => {
    const empty = join(tmp, 'empty');
    mkdirSync(empty, { recursive: true });

    const result = await runCli(['scan', empty], { cwd: tmp });

    expect(result.exitCode).toBe(0);
    const snapshot = JSON.parse(result.stdout);
    expect(snapshot).toHaveProperty('fileTree');
    expect(Array.isArray(snapshot.fileTree)).toBe(true);
  });
});
