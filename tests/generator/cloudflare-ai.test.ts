import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectCloudflareProvider, enhanceWithCloudflare, DEFAULT_CF_MODEL } from '../../src/generator/cloudflare-ai.js';
import type { ProjectProfile } from '../../src/types/index.js';

function makeProfile(): ProjectProfile {
  return {
    name: 'test', description: '', maturity: 'growing',
    language: { primary: 'typescript', secondary: [], framework: null, runtime: 'node', buildTool: null },
    structure: { pattern: 'cli', entryPoints: [], testPattern: null, srcLayout: 'flat' },
    conventions: { naming: 'camelCase', testFramework: null, linter: null, formatter: null, commitStyle: 'freeform', docLanguage: 'en' },
    dependencies: { total: 0, notable: [], devTools: [] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
  };
}

describe('cloudflare-ai', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'SLAMINAR_CF_MODEL']) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('detects unavailable when no env vars set', () => {
    const status = detectCloudflareProvider();
    expect(status.available).toBe(false);
    expect(status.reason).toContain('CLOUDFLARE_ACCOUNT_ID');
  });

  it('detects unavailable when only account ID set', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'abc';
    const status = detectCloudflareProvider();
    expect(status.available).toBe(false);
    expect(status.reason).toContain('CLOUDFLARE_API_TOKEN');
  });

  it('detects available when both env vars set', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'abc';
    process.env.CLOUDFLARE_API_TOKEN = 'xyz';
    const status = detectCloudflareProvider();
    expect(status.available).toBe(true);
    expect(status.accountId).toBe('abc');
    expect(status.model).toBe(DEFAULT_CF_MODEL);
  });

  it('respects SLAMINAR_CF_MODEL override', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'abc';
    process.env.CLOUDFLARE_API_TOKEN = 'xyz';
    process.env.SLAMINAR_CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';
    const status = detectCloudflareProvider();
    expect(status.model).toBe('@cf/meta/llama-3.1-8b-instruct');
  });

  it('enhanceWithCloudflare returns draft unchanged when not configured', async () => {
    const draft = '# CLAUDE.md\n\nOriginal';
    const result = await enhanceWithCloudflare(draft, makeProfile());
    expect(result).toBe(draft);
  });

  it('enhanceWithCloudflare falls back on API error', async () => {
    // Set fake credentials — API call will fail with auth error
    process.env.CLOUDFLARE_ACCOUNT_ID = 'fake-account-id-that-does-not-exist';
    process.env.CLOUDFLARE_API_TOKEN = 'fake-token';
    const draft = '# CLAUDE.md\n\nFallback test';
    const result = await enhanceWithCloudflare(draft, makeProfile());
    // Should return draft unchanged due to graceful fallback
    expect(result).toBe(draft);
  });
});
