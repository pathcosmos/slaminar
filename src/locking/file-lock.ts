/**
 * File-lock wrapper for write-path commands (v0.9.3 P1-1 / Phase Q4).
 *
 * Concurrency invariant: at most one slaminar process may hold a write lock
 * on a given project root at a time. Two parallel `init`s on the same cwd
 * would otherwise race on `.slaminar/.bk/manifest.json` (see F6 in
 * docs/qa/fault-matrix.md and R4 in rollback tests) and lose backup records.
 *
 * Implementation: `proper-lockfile` creates `.slaminar/.lock` with OS-level
 * mkdir atomicity. Stale locks (pid dead) are reclaimed automatically. We
 * also auto-release on process exit.
 */

import lockfile from 'proper-lockfile';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ProjectLockOptions {
  /** How long to wait for an existing holder before failing. Default: 0 (fail fast). */
  retries?: number;
  /** Milliseconds between retry attempts. Only used when retries > 0. */
  minTimeout?: number;
}

export interface ProjectLockHandle {
  release: () => Promise<void>;
}

const LOCK_DIR = '.slaminar';
// proper-lockfile appends `.lock` itself, so we pass the target as-is.
const LOCK_TARGET_FILE = 'lockfile';

function ensureLockParent(root: string): string {
  const dir = join(root, LOCK_DIR);
  mkdirSync(dir, { recursive: true });
  const target = join(dir, LOCK_TARGET_FILE);
  // proper-lockfile requires the target to exist. Create an empty sentinel.
  if (!existsSync(target)) {
    writeFileSync(target, '', 'utf-8');
  }
  return target;
}

/**
 * Acquire an exclusive lock on the project root for write operations.
 *
 * Throws a `ProjectBusyError` if another slaminar process is already
 * holding the lock (stale locks are reclaimed automatically).
 */
export async function acquireProjectLock(
  root: string,
  options: ProjectLockOptions = {},
): Promise<ProjectLockHandle> {
  const target = ensureLockParent(root);
  try {
    const release = await lockfile.lock(target, {
      retries: options.retries ?? 0,
      stale: 30_000, // 30s — if holder pid is dead or lock is older, reclaim
      onCompromised: () => {
        // The underlying lock file disappeared mid-operation. We can't
        // recover safely; surface so the caller knows.
        throw new ProjectBusyError(
          root,
          'lock file was deleted or compromised during operation',
        );
      },
    });
    return {
      release: async () => {
        try {
          await release();
        } catch {
          /* already released or never held */
        }
      },
    };
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ELOCKED') {
      throw new ProjectBusyError(
        root,
        'another slaminar process is already holding the project lock',
      );
    }
    throw err;
  }
}

/**
 * Wrap a write operation with automatic lock acquire/release. Prefer this
 * over manual acquire/release to guarantee the lock is freed on throw.
 */
export async function withProjectLock<T>(
  root: string,
  fn: () => Promise<T>,
  options: ProjectLockOptions = {},
): Promise<T> {
  const handle = await acquireProjectLock(root, options);
  try {
    return await fn();
  } finally {
    await handle.release();
  }
}

/**
 * Synchronous variant for sync entry points (uninstall). proper-lockfile
 * exposes `lockSync` / `unlockSync` for this case.
 */
export function withProjectLockSync<T>(root: string, fn: () => T): T {
  const target = ensureLockParent(root);
  let release: () => void;
  try {
    release = lockfile.lockSync(target, { stale: 30_000 });
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ELOCKED') {
      throw new ProjectBusyError(
        root,
        'another slaminar process is already holding the project lock',
      );
    }
    throw err;
  }
  try {
    return fn();
  } finally {
    try { release(); } catch { /* ignore */ }
  }
}

export class ProjectBusyError extends Error {
  constructor(
    public readonly root: string,
    reason: string,
  ) {
    super(
      `Cannot operate on '${root}': ${reason}. ` +
        `If you're sure no other slaminar process is running, remove .slaminar/lockfile.lock manually.`,
    );
    this.name = 'ProjectBusyError';
  }
}
