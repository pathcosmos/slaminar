import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  bundledSource,
  generateSourceId,
  inferSourceType,
  loadEffectiveSources,
  makeCliAdhocSource,
  migrateSingleUrlToSource,
  officialSource,
  parseEnvSources,
  SCOPE_PRIORITY,
} from '../../src/recommender/catalog-sources.js';
import { saveDefaults, builtInDefaults } from '../../src/setup/defaults.js';
import { saveTeamConfig } from '../../src/team/config.js';

describe('recommender/catalog-sources', () => {
  let fakeHome: string;
  let projectRoot: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'slaminar-csrc-home-'));
    projectRoot = mkdtempSync(join(tmpdir(), 'slaminar-csrc-proj-'));
    savedEnv = {
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
      SLAMINAR_CATALOG_SOURCES: process.env.SLAMINAR_CATALOG_SOURCES,
    };
    process.env.HOME = fakeHome;
    process.env.XDG_CONFIG_HOME = join(fakeHome, '.config');
    delete process.env.SLAMINAR_CATALOG_SOURCES;
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
    rmSync(projectRoot, { recursive: true, force: true });
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe('inferSourceType', () => {
    it('classifies http(s) URLs as url', () => {
      expect(inferSourceType('https://x.com/c.json')).toBe('url');
      expect(inferSourceType('http://x.com/c.json')).toBe('url');
    });
    it('classifies absolute paths and file: URIs as file', () => {
      expect(inferSourceType('/abs/path.json')).toBe('file');
      expect(inferSourceType('file:///abs/path.json')).toBe('file');
      expect(inferSourceType('~/path.json')).toBe('file');
    });
    it('classifies github: prefixes as github', () => {
      expect(inferSourceType('github:acme/tools/catalog.json')).toBe('github');
    });
    it('tags the sentinel URIs of bundled and official as official', () => {
      expect(inferSourceType('<bundled>')).toBe('official');
    });
  });

  describe('generateSourceId', () => {
    it('produces a stable slug-hash combo for the same uri+scope', () => {
      const a = generateSourceId('https://tools.example.com/catalog.json', 'user');
      const b = generateSourceId('https://tools.example.com/catalog.json', 'user');
      expect(a).toBe(b);
      expect(a).toMatch(/^user-/);
    });
    it('avoids collisions between different URIs sharing a slug', () => {
      const a = generateSourceId('https://x.com/a/catalog.json', 'user');
      const b = generateSourceId('https://x.com/b/catalog.json', 'user');
      expect(a).not.toBe(b);
    });
  });

  describe('migrateSingleUrlToSource', () => {
    it('returns null for empty URL', () => {
      expect(migrateSingleUrlToSource({ url: '', mode: 'extend', scope: 'user' })).toBeNull();
    });
    it('assigns scope-derived priority', () => {
      const src = migrateSingleUrlToSource({ url: 'https://x.com/c.json', mode: 'extend', scope: 'project' });
      expect(src).not.toBeNull();
      expect(src!.priority).toBe(SCOPE_PRIORITY.project);
      expect(src!.scope).toBe('project');
      expect(src!.mode).toBe('extend');
      expect(src!.id).toBe('project-legacy');
    });
  });

  describe('parseEnvSources', () => {
    it('parses mode:uri pairs', () => {
      const out = parseEnvSources('extend:https://a.json,replace:/tmp/b.json');
      expect(out).toHaveLength(2);
      expect(out[0]!.mode).toBe('extend');
      expect(out[0]!.uri).toBe('https://a.json');
      expect(out[0]!.priority).toBe(SCOPE_PRIORITY.env);
      expect(out[1]!.mode).toBe('replace');
    });
    it('skips malformed entries and empty input', () => {
      expect(parseEnvSources('')).toEqual([]);
      expect(parseEnvSources(undefined)).toEqual([]);
      expect(parseEnvSources('no-colon-here,bad-mode:uri')).toEqual([]);
    });
    it('keeps colons inside the URI (e.g. https://)', () => {
      const out = parseEnvSources('extend:https://a.example.com/c.json');
      expect(out[0]!.uri).toBe('https://a.example.com/c.json');
    });
  });

  describe('makeCliAdhocSource', () => {
    it('returns null when url is falsy', () => {
      expect(makeCliAdhocSource(undefined, 'extend')).toBeNull();
      expect(makeCliAdhocSource('', 'extend')).toBeNull();
    });
    it('defaults mode to replace (v0.3+ behavior preserved)', () => {
      const src = makeCliAdhocSource('https://x.com/c.json', undefined);
      expect(src!.mode).toBe('replace');
      expect(src!.priority).toBe(SCOPE_PRIORITY.cli);
      expect(src!.id).toBe('cli-adhoc');
    });
  });

  describe('loadEffectiveSources', () => {
    it('always includes bundled and official when no config present', () => {
      const layers = loadEffectiveSources();
      const ids = layers.map((s) => s.id);
      expect(ids).toContain('bundled');
      expect(ids).toContain('official');
    });

    it('sorts by priority ascending', () => {
      process.env.SLAMINAR_CATALOG_SOURCES = 'extend:https://env.example/c.json';
      const layers = loadEffectiveSources();
      const priorities = layers.map((s) => s.priority);
      const sorted = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sorted);
    });

    it('synthesizes a user-scope source from legacy catalog.url', () => {
      saveDefaults({
        ...builtInDefaults(),
        catalog: {
          autoRefreshHours: 24,
          url: 'https://legacy.example/c.json',
          mode: 'extend',
        },
      });
      const layers = loadEffectiveSources();
      const userLayer = layers.find((s) => s.scope === 'user');
      expect(userLayer).toBeDefined();
      expect(userLayer!.uri).toBe('https://legacy.example/c.json');
      expect(userLayer!.id).toBe('user-legacy');
    });

    it('prefers explicit catalog.sources over legacy URL', () => {
      saveDefaults({
        ...builtInDefaults(),
        catalog: {
          autoRefreshHours: 24,
          url: 'https://legacy.example/c.json',
          mode: 'extend',
          sources: [
            {
              id: 'my-tools',
              type: 'url',
              uri: 'https://new.example/c.json',
              priority: SCOPE_PRIORITY.user,
              mode: 'extend',
              enabled: true,
              trust: 'trusted',
              addedAt: new Date().toISOString(),
              scope: 'user',
            },
          ],
        },
      });
      const layers = loadEffectiveSources();
      const userLayers = layers.filter((s) => s.scope === 'user');
      expect(userLayers).toHaveLength(1);
      expect(userLayers[0]!.id).toBe('my-tools');
      expect(userLayers[0]!.uri).toBe('https://new.example/c.json');
    });

    it('drops the implicit official source when a replace-mode user source exists above it', () => {
      saveDefaults({
        ...builtInDefaults(),
        catalog: {
          autoRefreshHours: 24,
          url: '',
          mode: 'extend',
          sources: [
            {
              id: 'security',
              type: 'url',
              uri: 'https://sec.example/approved.json',
              priority: SCOPE_PRIORITY.user,
              mode: 'replace',
              enabled: true,
              trust: 'trusted',
              addedAt: new Date().toISOString(),
              scope: 'user',
            },
          ],
        },
      });
      const layers = loadEffectiveSources();
      expect(layers.map((s) => s.id)).not.toContain('official');
      expect(layers.map((s) => s.id)).toContain('bundled');
      expect(layers.map((s) => s.id)).toContain('security');
    });

    it('merges env, user, team, and CLI sources when all present', () => {
      process.env.SLAMINAR_CATALOG_SOURCES = 'extend:https://env.example/c.json';
      saveDefaults({
        ...builtInDefaults(),
        catalog: { autoRefreshHours: 24, url: 'https://user.example/c.json', mode: 'extend' },
      });
      saveTeamConfig(projectRoot, {
        slaminarVersion: '0.8.0',
        excludeAuthTools: true,
        fileCountCap: 10000,
        approvedTools: [],
        catalogVersion: '',
        catalogUrl: 'https://team.example/c.json',
        catalogMode: 'extend',
      });
      const layers = loadEffectiveSources({
        projectRoot,
        cliSource: makeCliAdhocSource('https://cli.example/c.json', 'extend'),
      });
      const byScope = layers.map((s) => s.scope);
      expect(byScope).toContain('user');
      expect(byScope).toContain('project');
      expect(byScope).toContain('env');
      expect(byScope).toContain('cli');
      // CLI wins the highest priority.
      expect(layers[layers.length - 1]!.scope).toBe('cli');
    });
  });

  describe('bundledSource / officialSource', () => {
    it('returns stable sentinel objects', () => {
      expect(bundledSource().priority).toBe(SCOPE_PRIORITY.bundled);
      expect(officialSource().priority).toBe(SCOPE_PRIORITY.official);
      expect(bundledSource().enabled).toBe(true);
    });
  });
});
