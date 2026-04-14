import type { ProjectSnapshot, DependencyProfile } from '../types/index.js';

const NOTABLE_CATEGORIES: Record<string, string> = {
  'react': 'ui-framework',
  'vue': 'ui-framework',
  'svelte': 'ui-framework',
  'angular': 'ui-framework',
  'next': 'ui-framework',
  'nuxt': 'ui-framework',
  '@anthropic-ai/sdk': 'ai',
  'openai': 'ai',
  'langchain': 'ai',
  'express': 'server',
  'fastify': 'server',
  'koa': 'server',
  'hono': 'server',
  'prisma': 'database',
  'drizzle-orm': 'database',
  'typeorm': 'database',
  'mongoose': 'database',
  'sequelize': 'database',
  'commander': 'cli',
  'yargs': 'cli',
  'cac': 'cli',
  'meow': 'cli',
};

const DEV_TOOLS = new Set([
  'typescript', 'vitest', 'jest', 'eslint', 'prettier',
  'vite', 'webpack', 'rollup', 'esbuild', 'tsup',
  'biome', 'mocha', 'ava',
]);

export function analyzeDependencies(snapshot: ProjectSnapshot): DependencyProfile {
  const allDeps: string[] = [];
  const allDevDeps: string[] = [];

  for (const pkg of snapshot.packages) {
    allDeps.push(...pkg.dependencies);
    allDevDeps.push(...pkg.devDependencies);
  }

  const combined = [...allDeps, ...allDevDeps];
  const notable: DependencyProfile['notable'] = [];

  for (const dep of combined) {
    const category = NOTABLE_CATEGORIES[dep];
    if (category) {
      notable.push({ name: dep, category });
    }
  }

  const devTools = allDevDeps.filter(d => DEV_TOOLS.has(d));

  return {
    total: combined.length,
    notable,
    devTools,
  };
}
