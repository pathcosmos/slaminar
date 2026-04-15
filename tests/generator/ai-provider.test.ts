import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectAiProvider, enhanceWithAI } from '../../src/generator/ai-provider.js';
import type { ProjectProfile } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test-app', description: 'A test application', maturity: 'growing',
    language: { primary: 'typescript', secondary: [], framework: null, runtime: 'node', buildTool: null },
    structure: { pattern: 'cli', entryPoints: [], testPattern: null, srcLayout: 'flat' },
    conventions: { naming: 'camelCase', testFramework: null, linter: null, formatter: null, commitStyle: 'freeform', docLanguage: 'en' },
    dependencies: { total: 0, notable: [], devTools: [] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

describe('ai-provider', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save + clear AI-related env vars for deterministic tests
    for (const key of ['ANTHROPIC_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'SLAMINAR_AI_PROVIDER']) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('detects local mode when no provider configured', () => {
    const status = detectAiProvider();
    expect(status.mode).toBe('local');
    expect(status.provider).toBe('local');
    expect(status.available).toBe(false);
  });

  it('detects cloudflare when CF env vars are set', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    const status = detectAiProvider();
    expect(status.mode).toBe('ai');
    expect(status.provider).toBe('cloudflare');
    expect(status.available).toBe(true);
    expect(status.model).toBeTruthy();
  });

  it('detects anthropic when only ANTHROPIC_API_KEY is set', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const status = detectAiProvider();
    expect(status.mode).toBe('ai');
    expect(status.provider).toBe('anthropic');
    expect(status.available).toBe(true);
  });

  it('prefers cloudflare over anthropic in auto mode', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const status = detectAiProvider();
    expect(status.provider).toBe('cloudflare');
  });

  it('respects SLAMINAR_AI_PROVIDER=anthropic override', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.SLAMINAR_AI_PROVIDER = 'anthropic';
    const status = detectAiProvider();
    expect(status.provider).toBe('anthropic');
  });

  it('respects SLAMINAR_AI_PROVIDER=local override', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account';
    process.env.CLOUDFLARE_API_TOKEN = 'test-token';
    process.env.SLAMINAR_AI_PROVIDER = 'local';
    const status = detectAiProvider();
    expect(status.provider).toBe('local');
    expect(status.available).toBe(false);
  });

  it('reports error when explicit provider selected but env missing', () => {
    process.env.SLAMINAR_AI_PROVIDER = 'cloudflare';
    const status = detectAiProvider();
    expect(status.provider).toBe('local');
    expect(status.available).toBe(false);
    expect(status.reason).toContain('Cloudflare selected');
  });

  it('enhanceWithAI returns local draft when no provider', async () => {
    const draft = '# CLAUDE.md\n\nTest content';
    const result = await enhanceWithAI(draft, makeProfile(), '');
    expect(result).toBe(draft);
  });

  it('enhanceWithAI returns local draft when anthropic SDK unavailable', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const draft = '# CLAUDE.md\n\nFallback content';
    const result = await enhanceWithAI(draft, makeProfile(), '');
    // SDK is not installed, so it should fall back
    expect(result).toBe(draft);
  });
});
