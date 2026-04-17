import { describe, it, expect } from 'vitest';
import { loadTeamConfig, loadLocalConfig, saveTeamConfig, saveLocalConfig, ensureGitignore } from '../../src/team/config.js';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('team config', () => {
  function tmpDir() { return mkdtempSync(join(tmpdir(), 'slaminar-cfg-')); }

  it('returns defaults when no config exists', () => {
    const dir = tmpDir();
    try {
      const cfg = loadTeamConfig(dir);
      expect(cfg.excludeAuthTools).toBe(true);
      expect(cfg.fileCountCap).toBe(10000);
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('saves and loads team config', () => {
    const dir = tmpDir();
    try {
      saveTeamConfig(dir, { slaminarVersion: '0.1.0', excludeAuthTools: false, fileCountCap: 5000, approvedTools: ['caveman'], catalogVersion: 'abc', catalogUrl: '', catalogMode: 'replace' });
      const cfg = loadTeamConfig(dir);
      expect(cfg.excludeAuthTools).toBe(false);
      expect(cfg.approvedTools).toContain('caveman');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('defaults catalogUrl and catalogMode for old configs without these fields', () => {
    const dir = tmpDir();
    try {
      // Simulate old config without new fields
      mkdirSync(join(dir, '.slaminar'), { recursive: true });
      writeFileSync(join(dir, '.slaminar', 'config.json'), JSON.stringify({ slaminarVersion: '0.1.0', excludeAuthTools: true, fileCountCap: 10000, approvedTools: [], catalogVersion: '' }));
      const cfg = loadTeamConfig(dir);
      expect(cfg.catalogUrl).toBe('');
      expect(cfg.catalogMode).toBe('replace');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('saves and loads catalogUrl and catalogMode', () => {
    const dir = tmpDir();
    try {
      saveTeamConfig(dir, { slaminarVersion: '0.1.0', excludeAuthTools: true, fileCountCap: 10000, approvedTools: [], catalogVersion: '', catalogUrl: 'https://example.com/catalog.json', catalogMode: 'extend' });
      const cfg = loadTeamConfig(dir);
      expect(cfg.catalogUrl).toBe('https://example.com/catalog.json');
      expect(cfg.catalogMode).toBe('extend');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('saves and loads local config', () => {
    const dir = tmpDir();
    try {
      saveLocalConfig(dir, { aiMode: 'ai', personalTools: ['claude-mem'] });
      const cfg = loadLocalConfig(dir);
      expect(cfg.aiMode).toBe('ai');
      expect(cfg.personalTools).toContain('claude-mem');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('creates .gitignore with local-only entries', () => {
    const dir = tmpDir();
    try {
      ensureGitignore(dir);
      const gi = readFileSync(join(dir, '.slaminar', '.gitignore'), 'utf-8');
      expect(gi).toContain('config.local.json');
      expect(gi).toContain('state.json');
      expect(gi).toContain('.bk/');
    } finally { rmSync(dir, { recursive: true }); }
  });

  // ─── v0.8 — catalogSources round-trip and legacy coexistence ──

  it('round-trips the new catalogSources array', () => {
    const dir = tmpDir();
    try {
      saveTeamConfig(dir, {
        slaminarVersion: '0.8.0',
        excludeAuthTools: true,
        fileCountCap: 10000,
        approvedTools: [],
        catalogVersion: '',
        catalogUrl: '',
        catalogMode: 'replace',
        catalogSources: [
          {
            id: 'company',
            type: 'url',
            uri: 'https://company.example/c.json',
            priority: 200,
            mode: 'extend',
            enabled: true,
            trust: 'trusted',
            addedAt: '2026-04-17T00:00:00.000Z',
            scope: 'project',
          },
        ],
      });
      const cfg = loadTeamConfig(dir);
      expect(cfg.catalogSources).toBeDefined();
      expect(cfg.catalogSources!).toHaveLength(1);
      expect(cfg.catalogSources![0]!.id).toBe('company');
      // Legacy URL remains empty when new sources are used.
      expect(cfg.catalogUrl).toBe('');
    } finally { rmSync(dir, { recursive: true }); }
  });

  it('leaves legacy catalogUrl alone when loading v0.7-shaped files (sources synthesized at read-use-site)', () => {
    const dir = tmpDir();
    try {
      mkdirSync(join(dir, '.slaminar'), { recursive: true });
      writeFileSync(
        join(dir, '.slaminar', 'config.json'),
        JSON.stringify({
          slaminarVersion: '0.7.0',
          excludeAuthTools: true,
          fileCountCap: 10000,
          approvedTools: [],
          catalogVersion: '',
          catalogUrl: 'https://legacy.example/c.json',
          catalogMode: 'extend',
        }),
      );
      const cfg = loadTeamConfig(dir);
      expect(cfg.catalogUrl).toBe('https://legacy.example/c.json');
      expect(cfg.catalogMode).toBe('extend');
      // `catalogSources` stays undefined — migration happens in
      // `catalog-sources.loadEffectiveSources`, not on read.
      expect(cfg.catalogSources).toBeUndefined();
    } finally { rmSync(dir, { recursive: true }); }
  });
});
