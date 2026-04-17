/**
 * End-to-end test helpers for slaminar v0.9.x QA suite.
 *
 * Design:
 * - Invoke the real compiled CLI (`dist/cli.js`) via `execFile` for
 *   deterministic stdout/stderr/exitCode capture (no in-process mocking).
 * - Every test gets an isolated tmp directory under `os.tmpdir()` and cleans
 *   up in `afterEach`. No shared state.
 * - AI provider is forced to `local` via env var so results are deterministic
 *   and no real HTTP calls happen.
 * - Fixture trees are generated programmatically — we commit the recipe, not
 *   5000-file trees.
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const REPO_ROOT = resolve(__dirname, '..', '..');
const CLI_PATH = join(REPO_ROOT, 'dist', 'cli.js');

export interface RunCliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunCliOptions {
  cwd: string;
  env?: Record<string, string>;
  /** Override the implicit `SLAMINAR_AI_PROVIDER=local`. Rarely needed. */
  allowAi?: boolean;
  /** Seconds before we kill the process. Default 30. */
  timeoutSec?: number;
}

/**
 * Run the compiled slaminar CLI with given args. Returns captured streams +
 * exit code. Does NOT throw on non-zero exit — callers assert on the result.
 */
export async function runCli(args: string[], opts: RunCliOptions): Promise<RunCliResult> {
  if (!existsSync(CLI_PATH)) {
    throw new Error(
      `E2E: ${CLI_PATH} not found. Run \`npm run build\` before e2e tests ` +
        `(or use \`npm run test:e2e\` which builds first).`,
    );
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // Deterministic: no real AI calls, no update-check network.
    SLAMINAR_AI_PROVIDER: opts.allowAi ? (opts.env?.SLAMINAR_AI_PROVIDER ?? '') : 'local',
    SLAMINAR_VERSION_CHECK: 'false',
    // Ensure tests don't touch the user's real defaults.json / auth.json by
    // redirecting XDG config. The caller can still override via opts.env.
    HOME: opts.env?.HOME ?? opts.cwd,
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

/** Create a fresh tmp directory for a single test. Caller must rm it. */
export function makeTmpDir(prefix = 'slaminar-e2e-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Recursive rmSync with force — for afterEach cleanup. */
export function cleanup(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

// ─── Fixture generators ──────────────────────────────────────────────

type FixtureKind = 'small' | 'medium' | 'large';

/**
 * Create a fixture project at the given root.
 *
 * - small: 20 files, node/typescript, with package.json + src/
 * - medium: ~500 files, python monorepo with 3 packages
 * - large: ~5000 files, polyglot (ts + py + go), for stress tests
 */
export function createFixture(kind: FixtureKind, root: string): void {
  mkdirSync(root, { recursive: true });
  switch (kind) {
    case 'small':
      return createSmallFixture(root);
    case 'medium':
      return createMediumFixture(root);
    case 'large':
      return createLargeFixture(root);
  }
}

function writeFileIn(root: string, rel: string, content: string): void {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function createSmallFixture(root: string): void {
  writeFileIn(
    root,
    'package.json',
    JSON.stringify(
      {
        name: 'e2e-small',
        version: '0.1.0',
        description: 'E2E small fixture — a tiny Node/TS CLI',
        type: 'module',
        bin: { 'e2e-small': 'dist/cli.js' },
        scripts: { build: 'tsc', test: 'vitest run', dev: 'tsx src/cli.ts' },
        dependencies: { chalk: '^5.0.0' },
        devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0', tsx: '^4.0.0' },
      },
      null,
      2,
    ),
  );
  writeFileIn(root, 'README.md', '# e2e-small\n\nA tiny CLI for slaminar E2E tests.\n');
  writeFileIn(
    root,
    'tsconfig.json',
    JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext' } }, null, 2),
  );
  writeFileIn(root, 'src/cli.ts', 'export function main() { console.log("hi"); }\n');
  writeFileIn(root, 'src/lib.ts', 'export const FOO = 42;\n');
  writeFileIn(root, 'src/util/format.ts', 'export const fmt = (x: number) => String(x);\n');
  writeFileIn(root, 'tests/cli.test.ts', 'import {test} from "vitest";\ntest("ok", () => {});\n');
  writeFileIn(root, '.gitignore', 'node_modules/\ndist/\n');
}

function createMediumFixture(root: string): void {
  writeFileIn(
    root,
    'pyproject.toml',
    `[project]\nname = "e2e-medium"\nversion = "0.1.0"\ndescription = "E2E medium fixture — Python monorepo"\nrequires-python = ">=3.10"\ndependencies = ["fastapi", "pydantic", "httpx"]\n`,
  );
  writeFileIn(root, 'README.md', '# e2e-medium\n\nA Python monorepo with 3 packages.\n');
  // 3 packages × ~150 files each
  for (const pkg of ['api', 'worker', 'shared']) {
    for (let i = 0; i < 150; i++) {
      writeFileIn(
        root,
        `packages/${pkg}/src/${pkg}/module_${i}.py`,
        `"""module ${i} of ${pkg}"""\n\ndef handler_${i}():\n    return ${i}\n`,
      );
    }
    writeFileIn(
      root,
      `packages/${pkg}/pyproject.toml`,
      `[project]\nname = "${pkg}"\nversion = "0.1.0"\n`,
    );
  }
  writeFileIn(root, 'tests/test_smoke.py', 'def test_ok():\n    assert True\n');
  writeFileIn(root, '.gitignore', '__pycache__/\n*.pyc\n.venv/\n');
}

function createLargeFixture(root: string): void {
  writeFileIn(
    root,
    'package.json',
    JSON.stringify(
      {
        name: 'e2e-large',
        version: '0.1.0',
        description: 'E2E large fixture — polyglot (TS + Python + Go)',
        workspaces: ['packages/*'],
      },
      null,
      2,
    ),
  );
  writeFileIn(root, 'README.md', '# e2e-large\n\nStress-test fixture, ~5000 files.\n');
  // TS: 20 packages × 100 files
  for (let p = 0; p < 20; p++) {
    for (let f = 0; f < 100; f++) {
      writeFileIn(
        root,
        `packages/ts-pkg-${p}/src/file_${f}.ts`,
        `export const value_${f} = ${p * 100 + f};\n`,
      );
    }
    writeFileIn(
      root,
      `packages/ts-pkg-${p}/package.json`,
      JSON.stringify({ name: `@large/ts-pkg-${p}`, version: '0.1.0' }, null, 2),
    );
  }
  // Python: 500 files
  for (let i = 0; i < 500; i++) {
    writeFileIn(root, `services/py/svc_${i}.py`, `def f_${i}():\n    return ${i}\n`);
  }
  writeFileIn(
    root,
    'services/py/pyproject.toml',
    '[project]\nname = "py-svc"\nversion = "0.1.0"\n',
  );
  // Go: 500 files
  for (let i = 0; i < 500; i++) {
    writeFileIn(root, `services/go/handler_${i}.go`, `package main\n\nfunc f${i}() int { return ${i} }\n`);
  }
  writeFileIn(root, 'services/go/go.mod', 'module large/go\n\ngo 1.21\n');
  writeFileIn(root, '.gitignore', 'node_modules/\ndist/\n__pycache__/\n');
}

// ─── init helper ──────────────────────────────────────────────────────

/** Initialize a bare git repo in `dir` so analyzers find a GitInfo. */
export async function initGit(dir: string): Promise<void> {
  await execFileP('git', ['init', '--quiet'], { cwd: dir });
  await execFileP('git', ['config', 'user.email', 'e2e@slaminar.test'], { cwd: dir });
  await execFileP('git', ['config', 'user.name', 'e2e'], { cwd: dir });
  await execFileP('git', ['add', '-A'], { cwd: dir });
  await execFileP('git', ['commit', '--quiet', '-m', 'e2e initial'], { cwd: dir });
}
