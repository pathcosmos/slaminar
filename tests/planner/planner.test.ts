import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPlan } from '../../src/planner/planner.js';
import type { ProjectProfile, ProjectSnapshot, RecommendationPlan } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test', description: 'A test', maturity: 'growing',
    language: { primary: 'typescript', secondary: [], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: [], testPattern: null, srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: 'vitest', linter: 'eslint', formatter: null, commitStyle: 'conventional', docLanguage: 'en' },
    dependencies: { total: 10, notable: [], devTools: [] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

function makeSnapshot(overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot {
  return {
    root: '/tmp/test', fileTree: [], fileStats: {}, git: null,
    existingAiFiles: [], configs: [], ci: [], docs: [], scannedAt: '',
    packages: [{ manager: 'npm', name: 'test', version: '1.0.0', description: null, scripts: { build: 'tsc', test: 'vitest run' }, dependencies: [], devDependencies: [], filePath: 'package.json' }],
    ...overrides,
  };
}

function makeRecommendation(): RecommendationPlan {
  return {
    recommended: [{
      tool: { name: 'caveman', repo: 'JuliusBrussee/caveman', category: 'skill', description: 'Token saving', authRequired: false, networkRequired: 'none', installMethod: 'marketplace', installCommands: ['claude plugin install caveman'], prerequisites: [], tags: ['universal'], maturityFit: ['greenfield', 'early', 'growing', 'mature'] },
      score: 85,
      reasons: ['token saving'],
    }],
    excluded: [],
    conflicts: [],
    maxTools: 5,
  };
}

describe('buildPlan', () => {
  it('generates CLAUDE.md target', () => {
    const plan = buildPlan(makeProfile(), makeSnapshot(), makeRecommendation());
    const claudeMd = plan.targets.find(t => t.path === 'CLAUDE.md');
    expect(claudeMd).toBeDefined();
    expect(claudeMd!.content).toContain('CLAUDE.md');
  });

  it('generates plugin.json target', () => {
    const plan = buildPlan(makeProfile(), makeSnapshot(), makeRecommendation());
    const plugin = plan.targets.find(t => t.path.endsWith('plugin.json'));
    expect(plugin).toBeDefined();
    expect(plugin!.mode).toBe('create');
  });

  it('generates dev skill target', () => {
    const plan = buildPlan(makeProfile(), makeSnapshot(), makeRecommendation());
    const skill = plan.targets.find(t => t.path.endsWith('dev.md'));
    expect(skill).toBeDefined();
    expect(skill!.content).toContain('npm run build');
  });

  it('includes tool install commands from recommendations', () => {
    const plan = buildPlan(makeProfile(), makeSnapshot(), makeRecommendation());
    expect(plan.toolInstalls.length).toBe(1);
    expect(plan.toolInstalls[0].tool).toBe('caveman');
  });

  it('sets CLAUDE.md mode to merge when existing', () => {
    const snap = makeSnapshot();
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-plan-'));
    writeFileSync(join(dir, 'CLAUDE.md'), '# Existing');
    const snapWithRoot = { ...snap, root: dir };
    try {
      const plan = buildPlan(makeProfile(), snapWithRoot, makeRecommendation());
      const claudeMd = plan.targets.find(t => t.path === 'CLAUDE.md');
      expect(claudeMd!.mode).toBe('merge');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('sets CLAUDE.md mode to create when not existing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-plan-'));
    const snap = { ...makeSnapshot(), root: dir };
    try {
      const plan = buildPlan(makeProfile(), snap, makeRecommendation());
      const claudeMd = plan.targets.find(t => t.path === 'CLAUDE.md');
      expect(claudeMd!.mode).toBe('create');
    } finally { rmSync(dir, { recursive: true }); }
  });
});
