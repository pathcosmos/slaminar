import type { ProjectSnapshot, StructureProfile } from '../types/index.js';

const CLI_DEPS = ['commander', 'yargs', 'meow', 'cac', 'clipanion', 'oclif'];
const SPA_DEPS = ['react', 'vue', 'svelte', '@angular/core', 'solid-js'];
const API_DEPS = ['express', 'fastify', 'koa', 'hapi', '@nestjs/core', 'hono'];

const TEST_CONFIG_MAP: Record<string, string> = {
  vitest: 'vitest',
  jest: 'jest',
  mocha: 'mocha',
  ava: 'ava',
  tap: 'tap',
};

function allDeps(snap: ProjectSnapshot): string[] {
  return snap.packages.flatMap((p) => [...p.dependencies, ...p.devDependencies]);
}

function detectPattern(snap: ProjectSnapshot): StructureProfile['pattern'] {
  const deps = allDeps(snap);

  if (deps.some((d) => CLI_DEPS.includes(d))) return 'cli';
  if (deps.some((d) => API_DEPS.includes(d))) return 'api';
  if (deps.some((d) => SPA_DEPS.includes(d))) return 'spa';

  // Check for monorepo indicators
  const hasWorkspaces = snap.packages.length > 1;
  if (hasWorkspaces) return 'monorepo';

  // Check for library pattern (has main/exports but no framework deps)
  if (snap.packages.length === 1) {
    const pkg = snap.packages[0];
    if (pkg.name && deps.length > 0) return 'library';
  }

  return 'unknown';
}

function detectEntryPoints(snap: ProjectSnapshot): string[] {
  const entries: string[] = [];

  for (const pkg of snap.packages) {
    const scripts = pkg.scripts;
    if (scripts.start) entries.push('start script');
    if (scripts.dev) entries.push('dev script');
    if (scripts.main) entries.push('main script');
  }

  // Check for common entry point files in the file tree
  const commonEntries = ['src/index.ts', 'src/main.ts', 'src/app.ts', 'src/cli.ts', 'index.ts', 'main.ts'];
  for (const node of flattenTree(snap.fileTree)) {
    if (commonEntries.includes(node.path)) {
      entries.push(node.path);
    }
  }

  return entries;
}

function flattenTree(nodes: ProjectSnapshot['fileTree']): { path: string }[] {
  const result: { path: string }[] = [];
  for (const node of nodes) {
    result.push({ path: node.path });
    if (node.children) {
      result.push(...flattenTree(node.children));
    }
  }
  return result;
}

function detectTestPattern(snap: ProjectSnapshot): string | null {
  // Check config types for test frameworks
  for (const config of snap.configs) {
    const framework = TEST_CONFIG_MAP[config.type];
    if (framework) return framework;
  }

  // Check devDependencies for test frameworks
  const devDeps = snap.packages.flatMap((p) => p.devDependencies);
  for (const [, framework] of Object.entries(TEST_CONFIG_MAP)) {
    if (devDeps.includes(framework)) return framework;
  }

  return null;
}

function detectSrcLayout(snap: ProjectSnapshot): StructureProfile['srcLayout'] {
  const dirs = flattenTree(snap.fileTree)
    .map((n) => n.path)
    .filter((p) => p.startsWith('src/'));

  if (dirs.length === 0) return 'unknown';

  const layerNames = ['controllers', 'services', 'models', 'routes', 'middleware', 'utils', 'helpers'];
  const featurePattern = dirs.some((d) => {
    const parts = d.split('/');
    return parts.length >= 3 && parts[1] !== 'index.ts';
  });

  const hasLayers = layerNames.some((layer) =>
    dirs.some((d) => d.includes(`/${layer}/`) || d.endsWith(`/${layer}`)),
  );

  if (hasLayers) return 'layer-based';
  if (featurePattern) return 'feature-based';

  // If files are directly in src/ with no subdirs
  const hasSubdirs = dirs.some((d) => d.split('/').length > 2);
  if (!hasSubdirs) return 'flat';

  return 'unknown';
}

export function mapStructure(snap: ProjectSnapshot): StructureProfile {
  return {
    pattern: detectPattern(snap),
    entryPoints: detectEntryPoints(snap),
    testPattern: detectTestPattern(snap),
    srcLayout: detectSrcLayout(snap),
  };
}
