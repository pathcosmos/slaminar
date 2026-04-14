import { describe, it, expect } from 'vitest';
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
  it('detects local mode when no API key', () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const status = detectAiProvider();
      expect(status.mode).toBe('local');
      expect(status.available).toBe(false);
      expect(status.reason).toBe('ANTHROPIC_API_KEY not set');
    } finally {
      if (original) process.env.ANTHROPIC_API_KEY = original;
    }
  });

  it('detects ai mode when API key is set', () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    try {
      const status = detectAiProvider();
      expect(status.mode).toBe('ai');
      expect(status.available).toBe(true);
      expect(status.reason).toBe('API key configured');
    } finally {
      if (original) {
        process.env.ANTHROPIC_API_KEY = original;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });

  it('enhanceWithAI returns local draft when AI unavailable', async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const draft = '# CLAUDE.md\n\nTest content';
      const result = await enhanceWithAI(draft, makeProfile(), '');
      expect(result).toBe(draft);
    } finally {
      if (original) process.env.ANTHROPIC_API_KEY = original;
    }
  });

  it('detectAiProvider returns structured status', () => {
    const status = detectAiProvider();
    expect(typeof status.available).toBe('boolean');
    expect(['ai', 'local']).toContain(status.mode);
    expect(status.reason).toBeTruthy();
  });

  it('enhanceWithAI returns local draft when SDK not installed', async () => {
    const original = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
    try {
      const draft = '# CLAUDE.md\n\nFallback content';
      const result = await enhanceWithAI(draft, makeProfile(), 'some context');
      // SDK is not installed, so it should fall back to local draft
      expect(result).toBe(draft);
    } finally {
      if (original) {
        process.env.ANTHROPIC_API_KEY = original;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    }
  });
});
