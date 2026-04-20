import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { routeInstall, executePlan } from '../../src/recommender/installer-router.js';
import type { CatalogTool } from '../../src/types/index.js';

function t(overrides: Partial<CatalogTool>): CatalogTool {
  return {
    name: 'tool-x',
    repo: 'owner/repo',
    category: 'skill',
    description: 'test tool',
    authRequired: false,
    networkRequired: 'none',
    installMethod: 'git-clone',
    installCommands: ['git clone https://github.com/owner/repo.git'],
    prerequisites: [],
    tags: [],
    maturityFit: ['growing'],
    ...overrides,
  };
}

describe('routeInstall', () => {
  it('routes git-clone to the ref directory, not CWD', () => {
    const plan = routeInstall(t({}), { refDir: '/tmp/refs' });
    expect(plan.action).toBe('git-clone-ref');
    expect(plan.commands[0].bin).toBe('git');
    expect(plan.commands[0].args).toEqual([
      'clone',
      'https://github.com/owner/repo',
      '/tmp/refs/tool-x',
    ]);
    expect(plan.blocked).toBeUndefined();
  });

  it('blocks git-clone when URL cannot be parsed', () => {
    const plan = routeInstall(t({ installCommands: ['bash -c "mischief"'] }));
    expect(plan.blocked).toMatch(/could not parse/);
  });

  it('npm-global runs with no CWD sensitivity', () => {
    const plan = routeInstall(
      t({
        installMethod: 'npm-global',
        installCommands: ['npm install -g @marp-team/marp-cli'],
      }),
    );
    expect(plan.action).toBe('npm-global');
    expect(plan.commands[0].bin).toBe('npm');
    expect(plan.commands[0].args).toEqual(['install', '-g', '@marp-team/marp-cli']);
  });

  it('pip runs globally', () => {
    const plan = routeInstall(
      t({ installMethod: 'pip', installCommands: ['pip install foo'] }),
    );
    expect(plan.action).toBe('pip-global');
    expect(plan.commands[0].bin).toBe('pip');
  });

  it('scaffolder without --target is blocked', () => {
    const plan = routeInstall(
      t({ installMethod: 'npm-init', installCommands: ['npm init slidev@latest'] }),
    );
    expect(plan.blocked).toMatch(/--target/);
    expect(plan.commands).toEqual([]);
  });

  it('scaffolder with --target uses that CWD', () => {
    const plan = routeInstall(
      t({ installMethod: 'npm-dev', installCommands: ['npm install -D foo'] }),
      { target: '/tmp/my-project' },
    );
    expect(plan.blocked).toBeUndefined();
    expect(plan.cwd).toBe('/tmp/my-project');
    expect(plan.action).toBe('scaffold');
  });

  it('marketplace is reported as Claude-Code-only', () => {
    const plan = routeInstall(
      t({ installMethod: 'marketplace', installCommands: ['/install-plugin foo'] }),
    );
    expect(plan.action).toBe('marketplace');
    expect(plan.blocked).toMatch(/Claude Code/);
    expect(plan.notes[0]).toMatch(/\/install-plugin foo/);
  });
});

describe('executePlan', () => {
  it('dry-run returns the preview without executing', () => {
    const plan = routeInstall(t({}), { refDir: '/tmp/refs' });
    const r = executePlan(plan, { dryRun: true });
    expect(r.success).toBe(true);
    expect(r.output).toMatch(/git clone/);
  });

  it('blocked plan surfaces the block message', () => {
    const plan = routeInstall(
      t({ installMethod: 'npm-init', installCommands: ['npm init slidev@latest'] }),
    );
    const r = executePlan(plan);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/--target/);
  });

  describe('git-clone "already cloned" skip heuristic', () => {
    it('treats a populated git repo as already cloned', () => {
      const tmpBase = mkdtempSync(join(tmpdir(), 'slaminar-test-'));
      try {
        const refDir = join(tmpBase, 'refs');
        mkdirSync(join(refDir, 'tool-x', '.git'), { recursive: true });

        const plan = routeInstall(t({}), { refDir });
        const r = executePlan(plan);

        expect(r.success).toBe(true);
        expect(r.output).toMatch(/already cloned/);
      } finally {
        rmSync(tmpBase, { recursive: true, force: true });
      }
    });

    it('does NOT treat an empty husk dir as already cloned (regression: installer-router silent skip)', () => {
      const tmpBase = mkdtempSync(join(tmpdir(), 'slaminar-test-'));
      try {
        const refDir = join(tmpBase, 'refs');
        mkdirSync(join(refDir, 'tool-x'), { recursive: true });

        const plan = routeInstall(
          t({ installCommands: ['git clone https://example.invalid/noop.git'] }),
          { refDir },
        );
        const r = executePlan(plan);

        expect(r.output).not.toMatch(/already cloned/);
      } finally {
        rmSync(tmpBase, { recursive: true, force: true });
      }
    });
  });
});
