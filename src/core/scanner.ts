import { resolve } from 'node:path';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scanFileTree } from '../scanner/file-tree.js';
import { scanGitInfo } from '../scanner/git-info.js';
import { scanAiFiles } from '../scanner/ai-files.js';
import { scanPackageInfo } from '../scanner/package-info.js';
import type { ProjectSnapshot, ConfigFile, CiConfig, DocFile } from '../types/index.js';

function scanConfigs(root: string): ConfigFile[] {
  const configs: ConfigFile[] = [];
  const configFiles: Record<string, string> = {
    'tsconfig.json': 'tsconfig', 'tsconfig.app.json': 'tsconfig',
    '.eslintrc': 'eslint', '.eslintrc.json': 'eslint',
    'eslint.config.js': 'eslint', 'eslint.config.mjs': 'eslint',
    '.prettierrc': 'prettier', '.prettierrc.json': 'prettier', 'prettier.config.js': 'prettier',
    'vite.config.ts': 'vite', 'vite.config.js': 'vite',
    'webpack.config.js': 'webpack',
    'next.config.js': 'next', 'next.config.mjs': 'next',
    'tailwind.config.js': 'tailwind', 'tailwind.config.ts': 'tailwind',
    'jest.config.js': 'jest', 'jest.config.ts': 'jest',
    'vitest.config.ts': 'vitest', 'vitest.config.js': 'vitest',
  };
  for (const [file, type] of Object.entries(configFiles)) {
    if (existsSync(join(root, file))) configs.push({ type, path: file });
  }
  return configs;
}

function scanCi(root: string): CiConfig[] {
  const ci: CiConfig[] = [];
  const ghWorkflows = join(root, '.github', 'workflows');
  if (existsSync(ghWorkflows)) {
    try {
      for (const f of readdirSync(ghWorkflows)) {
        if (f.endsWith('.yml') || f.endsWith('.yaml')) {
          ci.push({ platform: 'github-actions', path: `.github/workflows/${f}` });
        }
      }
    } catch { /* skip */ }
  }
  if (existsSync(join(root, '.gitlab-ci.yml'))) ci.push({ platform: 'gitlab-ci', path: '.gitlab-ci.yml' });
  if (existsSync(join(root, 'Dockerfile'))) ci.push({ platform: 'docker', path: 'Dockerfile' });
  return ci;
}

function scanDocs(root: string): DocFile[] {
  const docs: DocFile[] = [];
  const docFiles: Record<string, 'readme' | 'setup' | 'contributing' | 'other'> = {
    'README.md': 'readme', 'README.ko.md': 'readme',
    'SETUP.md': 'setup', 'CONTRIBUTING.md': 'contributing',
  };
  for (const [file, type] of Object.entries(docFiles)) {
    const fullPath = join(root, file);
    if (existsSync(fullPath)) {
      const lineCount = readFileSync(fullPath, 'utf-8').split('\n').length;
      docs.push({ type, path: file, lineCount });
    }
  }
  return docs;
}

export function scan(targetPath: string): ProjectSnapshot {
  const root = resolve(targetPath);

  // Validate root exists and is a directory
  try {
    const stat = statSync(root);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${root}`);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Path does not exist: ${root}`);
    }
    throw err;
  }

  const { tree, stats } = scanFileTree(root);
  return {
    root, fileTree: tree, fileStats: stats,
    packages: scanPackageInfo(root),
    git: scanGitInfo(root),
    existingAiFiles: scanAiFiles(root),
    configs: scanConfigs(root),
    ci: scanCi(root),
    docs: scanDocs(root),
    scannedAt: new Date().toISOString(),
  };
}
