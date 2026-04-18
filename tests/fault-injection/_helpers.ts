/**
 * Shared helpers for fault-injection tests (Phase Q3).
 *
 * Design:
 * - Tests run in-process (unit-style) except F6 concurrency which spawns
 *   subprocesses — those live alongside E2E in tests/e2e/ or their own file.
 * - MSW mocks `fetch` for F1 (network) and F5 (AI provider).
 * - tmp dirs use os.tmpdir() and clean up via afterEach.
 */

import { execFile } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export const REPO_ROOT = resolve(__dirname, '..', '..');
export const CLI_PATH = join(REPO_ROOT, 'dist', 'cli.js');

export function makeTmpDir(prefix = 'slaminar-fault-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function cleanup(path: string): void {
  if (!existsSync(path)) return;
  // Restore permissions on any chmod 000'd dirs so rm can recurse.
  try {
    chmodSync(path, 0o755);
  } catch {
    /* ignore */
  }
  rmSync(path, { recursive: true, force: true });
}

/** Write an arbitrary file within `root`, creating parent dirs. */
export function writeFile(root: string, rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

/** Write a deliberately corrupted JSON payload at `root/rel`. */
export function writeCorruptJson(root: string, rel: string): void {
  writeFile(root, rel, '{ "this is": not json ');
}

/** Seed a minimal fake project at `root` so scan/analyze don't fail early. */
export function seedMinimalProject(root: string): void {
  writeFile(
    root,
    'package.json',
    JSON.stringify({ name: 'fault-test', version: '0.1.0' }, null, 2),
  );
  writeFile(root, 'src/index.ts', 'export {};\n');
}

/** Initialize git in `dir` — silent. */
export async function initGit(dir: string): Promise<void> {
  await execFileP('git', ['init', '--quiet'], { cwd: dir });
  await execFileP('git', ['config', 'user.email', 'fault@slaminar.test'], { cwd: dir });
  await execFileP('git', ['config', 'user.name', 'fault'], { cwd: dir });
  await execFileP('git', ['add', '-A'], { cwd: dir });
  await execFileP('git', ['commit', '--quiet', '-m', 'init'], { cwd: dir });
}

/** Run the compiled CLI and capture stdout/stderr/exitCode. */
export async function runCli(
  args: string[],
  opts: {
    cwd: string;
    env?: Record<string, string>;
    timeoutSec?: number;
    home?: string;
  },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (!existsSync(CLI_PATH)) {
    throw new Error(`fault-injection: ${CLI_PATH} missing — run npm run build first`);
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SLAMINAR_AI_PROVIDER: 'local',
    SLAMINAR_VERSION_CHECK: 'false',
    HOME: opts.home ?? opts.cwd,
    ...(opts.env ?? {}),
  };
  try {
    const result = await execFileP('node', [CLI_PATH, ...args], {
      cwd: opts.cwd,
      env,
      timeout: (opts.timeoutSec ?? 30) * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0 };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
    };
    return {
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
      exitCode: typeof e.code === 'number' ? e.code : 1,
    };
  }
}
