# Phase 1: Core Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build slaminar's CLI skeleton, type system, scanner, and analyzer so that `slaminar scan` and `slaminar analyze` produce valid JSON output for any project.

**Architecture:** Pipeline-based CLI tool using commander. Scanner collects raw project data into a `ProjectSnapshot` IR. Analyzer transforms snapshot into a `ProjectProfile` IR. Each module is a pure function taking input IR and returning output IR.

**Tech Stack:** TypeScript (ESM), Node.js >= 18, commander, vitest, chalk, cli-table3

**Security Note:** All shell command execution uses `execFileSync` (not `execSync`/`exec`) to prevent command injection. Arguments are passed as arrays, never concatenated into shell strings.

---

## File Structure

```
slaminar/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── cli.ts                            # CLI entry point (commander)
│   ├── types/
│   │   └── index.ts                      # All shared types
│   ├── core/
│   │   ├── pipeline.ts                   # Pipeline orchestrator
│   │   └── scanner.ts                    # Scanner phase coordinator
│   ├── scanner/
│   │   ├── file-tree.ts                  # Directory structure scan
│   │   ├── git-info.ts                   # Git metadata extraction
│   │   ├── ai-files.ts                   # CLAUDE.md, .claude/ detection
│   │   └── package-info.ts              # Package manifest detection
│   └── analyzer/
│       ├── language-detector.ts          # Language/framework detection
│       ├── structure-mapper.ts           # Architecture pattern detection
│       ├── convention-extractor.ts       # Coding convention extraction
│       ├── dependency-analyzer.ts        # Dependency analysis
│       └── maturity-detector.ts          # Project maturity detection
└── tests/
    ├── scanner/
    │   ├── file-tree.test.ts
    │   ├── git-info.test.ts
    │   ├── ai-files.test.ts
    │   └── package-info.test.ts
    └── analyzer/
        ├── language-detector.test.ts
        ├── structure-mapper.test.ts
        ├── convention-extractor.test.ts
        ├── dependency-analyzer.test.ts
        └── maturity-detector.test.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Create: `src/types/index.ts`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Volumes/minim42tbtmm/temp_git/slaminar
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "slaminar",
  "version": "0.1.0",
  "description": "Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "slaminar": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "files": ["dist"],
  "engines": { "node": ">=18.0.0" },
  "keywords": ["claude-code", "project-analyzer", "plugin-generator"],
  "license": "MIT",
  "author": "pathcosmos",
  "dependencies": {
    "chalk": "^5.4.0",
    "cli-table3": "^0.6.5",
    "commander": "^13.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.tgz
.DS_Store
```

- [ ] **Step 6: Create src/types/index.ts with all Phase 1 types**

```typescript
// ─── File Tree ─────────────────────────────────────────────

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  children?: FileNode[];
}

// ─── Package Info ──────────────────────────────────────────

export interface PackageInfo {
  manager: 'npm' | 'cargo' | 'pip' | 'go' | 'maven' | 'gradle';
  name: string | null;
  version: string | null;
  description: string | null;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
  filePath: string;
}

// ─── Git Info ──────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitInfo {
  totalCommits: number;
  recentCommits: GitCommit[];
  branches: string[];
  contributors: string[];
  currentBranch: string;
}

// ─── AI Context ────────────────────────────────────────────

export interface AiFile {
  type: 'claude-md' | 'claude-settings' | 'claude-plugin';
  path: string;
  lineCount: number;
}

// ─── Config / CI / Docs ────────────────────────────────────

export interface ConfigFile {
  type: string;
  path: string;
}

export interface CiConfig {
  platform: 'github-actions' | 'gitlab-ci' | 'docker' | 'other';
  path: string;
}

export interface DocFile {
  type: 'readme' | 'setup' | 'contributing' | 'other';
  path: string;
  lineCount: number;
}

// ─── Project Snapshot (Scanner output) ─────────────────────

export interface ProjectSnapshot {
  root: string;
  fileTree: FileNode[];
  fileStats: Record<string, number>;
  packages: PackageInfo[];
  git: GitInfo | null;
  existingAiFiles: AiFile[];
  configs: ConfigFile[];
  ci: CiConfig[];
  docs: DocFile[];
  scannedAt: string;
}

// ─── Analyzer types ────────────────────────────────────────

export interface LanguageProfile {
  primary: string;
  secondary: string[];
  framework: string | null;
  runtime: string | null;
  buildTool: string | null;
}

export interface StructureProfile {
  pattern: 'monorepo' | 'spa' | 'cli' | 'library' | 'api' | 'fullstack' | 'unknown';
  entryPoints: string[];
  testPattern: string | null;
  srcLayout: 'flat' | 'feature-based' | 'layer-based' | 'unknown';
}

export interface ConventionProfile {
  naming: 'camelCase' | 'snake_case' | 'kebab-case' | 'unknown';
  testFramework: string | null;
  linter: string | null;
  formatter: string | null;
  commitStyle: 'conventional' | 'emoji' | 'freeform' | 'unknown';
  docLanguage: string;
}

export interface DependencyProfile {
  total: number;
  notable: { name: string; category: string }[];
  devTools: string[];
}

export type ProjectMaturity = 'greenfield' | 'early' | 'growing' | 'mature';

export interface AiContextSummary {
  hasClaudeMd: boolean;
  claudeMdLines: number;
  hasClaudeSettings: boolean;
  hasClaudePlugin: boolean;
}

export interface ProjectProfile {
  name: string;
  description: string;
  language: LanguageProfile;
  structure: StructureProfile;
  conventions: ConventionProfile;
  dependencies: DependencyProfile;
  maturity: ProjectMaturity;
  existingAiContext: AiContextSummary;
}
```

- [ ] **Step 7: Create minimal src/cli.ts**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('slaminar')
  .description('Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구')
  .version('0.1.0');

program
  .command('scan [path]')
  .description('Scan project and output ProjectSnapshot JSON')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    console.log(JSON.stringify({ status: 'not yet implemented', targetPath }, null, 2));
  });

program
  .command('analyze [path]')
  .description('Scan + analyze project and output ProjectProfile JSON')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    console.log(JSON.stringify({ status: 'not yet implemented', targetPath }, null, 2));
  });

program.parse();
```

- [ ] **Step 8: Install dependencies and verify build**

```bash
cd /Volumes/minim42tbtmm/temp_git/slaminar
npm install
npm run build
```

Expected: Build succeeds, `dist/` directory created.

- [ ] **Step 9: Verify CLI runs**

```bash
npx tsx src/cli.ts scan .
```

Expected: `{"status": "not yet implemented", "targetPath": "."}`

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore src/cli.ts src/types/index.ts
git commit -m "feat: scaffold slaminar project with types and CLI skeleton"
```

---

### Task 2: File Tree Scanner

**Files:**
- Create: `src/scanner/file-tree.ts`
- Create: `tests/scanner/file-tree.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scanner/file-tree.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scanFileTree } from '../../src/scanner/file-tree.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanFileTree', () => {
  function createTempProject(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('scans files and directories', () => {
    const dir = createTempProject({
      'src/index.ts': 'export {}',
      'src/utils.ts': 'export {}',
      'package.json': '{}',
    });
    try {
      const { tree, stats } = scanFileTree(dir);
      expect(stats['.ts']).toBe(2);
      expect(stats['.json']).toBe(1);
      expect(tree.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('excludes node_modules and .git', () => {
    const dir = createTempProject({
      'src/index.ts': 'export {}',
      'node_modules/foo/index.js': '',
      '.git/HEAD': 'ref: refs/heads/main',
    });
    try {
      const { tree, stats } = scanFileTree(dir);
      expect(stats['.ts']).toBe(1);
      expect(stats['.js']).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('respects .gitignore patterns', () => {
    const dir = createTempProject({
      '.gitignore': 'dist/\n*.log',
      'src/index.ts': 'export {}',
      'dist/bundle.js': '',
      'error.log': '',
    });
    try {
      const { stats } = scanFileTree(dir);
      expect(stats['.ts']).toBe(1);
      expect(stats['.js']).toBeUndefined();
      expect(stats['.log']).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('enforces file count cap', () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      files[`file${i}.txt`] = '';
    }
    const dir = createTempProject(files);
    try {
      const { stats } = scanFileTree(dir, { maxFiles: 10 });
      expect(stats['.txt']).toBe(10);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scanner/file-tree.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement file-tree.ts**

Create `src/scanner/file-tree.ts`:

```typescript
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import type { FileNode } from '../types/index.js';

const DEFAULT_EXCLUDES = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', 'target', '.gradle',
  '.idea', '.vscode', '.DS_Store',
]);

interface ScanOptions {
  maxFiles?: number;
}

interface ScanResult {
  tree: FileNode[];
  stats: Record<string, number>;
}

function parseGitignore(root: string): Set<string> {
  const patterns = new Set<string>();
  try {
    const content = readFileSync(join(root, '.gitignore'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        patterns.add(trimmed.replace(/\/$/, ''));
      }
    }
  } catch {
    // no .gitignore
  }
  return patterns;
}

function shouldExclude(name: string, gitignorePatterns: Set<string>): boolean {
  if (DEFAULT_EXCLUDES.has(name)) return true;
  if (gitignorePatterns.has(name)) return true;
  for (const pattern of gitignorePatterns) {
    if (pattern.startsWith('*.') && name.endsWith(pattern.slice(1))) return true;
  }
  return false;
}

export function scanFileTree(root: string, options: ScanOptions = {}): ScanResult {
  const maxFiles = options.maxFiles ?? 10_000;
  const stats: Record<string, number> = {};
  const gitignorePatterns = parseGitignore(root);
  let fileCount = 0;

  function walk(dir: string): FileNode[] {
    const nodes: FileNode[] = [];
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return nodes;
    }

    for (const entry of entries.sort()) {
      if (fileCount >= maxFiles) break;
      if (shouldExclude(entry, gitignorePatterns)) continue;

      const fullPath = join(dir, entry);
      const relPath = relative(root, fullPath);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        const children = walk(fullPath);
        if (children.length > 0) {
          nodes.push({ name: entry, path: relPath, type: 'directory', children });
        }
      } else if (stat.isFile()) {
        fileCount++;
        const ext = extname(entry);
        if (ext) {
          stats[ext] = (stats[ext] ?? 0) + 1;
        }
        nodes.push({ name: entry, path: relPath, type: 'file', extension: ext || undefined });
      }
    }
    return nodes;
  }

  const tree = walk(root);
  return { tree, stats };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/scanner/file-tree.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scanner/file-tree.ts tests/scanner/file-tree.test.ts
git commit -m "feat: add file tree scanner with gitignore support and file cap"
```

---

### Task 3: Git Info Scanner

**Files:**
- Create: `src/scanner/git-info.ts`
- Create: `tests/scanner/git-info.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scanner/git-info.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scanGitInfo } from '../../src/scanner/git-info.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

describe('scanGitInfo', () => {
  function createGitRepo(): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-git-test-'));
    execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir, stdio: 'pipe' });
    return dir;
  }

  it('returns null for non-git directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-nogit-'));
    try {
      const result = scanGitInfo(dir);
      expect(result).toBeNull();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('scans empty repo', () => {
    const dir = createGitRepo();
    try {
      const result = scanGitInfo(dir);
      expect(result).not.toBeNull();
      expect(result!.totalCommits).toBe(0);
      expect(result!.recentCommits).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('scans repo with commits', () => {
    const dir = createGitRepo();
    execFileSync('touch', ['file.txt'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: initial'], { cwd: dir, stdio: 'pipe' });
    execFileSync('touch', ['file2.txt'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'fix: second'], { cwd: dir, stdio: 'pipe' });
    try {
      const result = scanGitInfo(dir);
      expect(result!.totalCommits).toBe(2);
      expect(result!.recentCommits).toHaveLength(2);
      expect(result!.contributors).toContain('Test');
      expect(result!.currentBranch).toBeTruthy();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scanner/git-info.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement git-info.ts**

Create `src/scanner/git-info.ts`:

```typescript
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GitInfo, GitCommit } from '../types/index.js';

function git(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    }).trim();
  } catch {
    return null;
  }
}

export function scanGitInfo(root: string): GitInfo | null {
  if (!existsSync(join(root, '.git'))) return null;

  const logRaw = git(
    ['log', '--oneline', '--format=%H|||%s|||%an|||%aI', '-50'],
    root,
  );
  const recentCommits: GitCommit[] = [];
  if (logRaw) {
    for (const line of logRaw.split('\n')) {
      if (!line.trim()) continue;
      const [hash, message, author, date] = line.split('|||');
      recentCommits.push({ hash, message, author, date });
    }
  }

  const totalRaw = git(['rev-list', '--count', 'HEAD'], root);
  const totalCommits = totalRaw ? parseInt(totalRaw, 10) : 0;

  const branchRaw = git(['branch', '--format=%(refname:short)'], root);
  const branches = branchRaw ? branchRaw.split('\n').filter(Boolean) : [];

  // Get unique contributors from log
  const contributorRaw = git(['log', '--format=%an'], root);
  const contributors = contributorRaw
    ? [...new Set(contributorRaw.split('\n').filter(Boolean))]
    : [];

  const currentBranch = git(['branch', '--show-current'], root) ?? 'unknown';

  return { totalCommits, recentCommits, branches, contributors, currentBranch };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/scanner/git-info.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scanner/git-info.ts tests/scanner/git-info.test.ts
git commit -m "feat: add git info scanner with execFileSync (injection-safe)"
```

---

### Task 4: AI Files Scanner

**Files:**
- Create: `src/scanner/ai-files.ts`
- Create: `tests/scanner/ai-files.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scanner/ai-files.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scanAiFiles } from '../../src/scanner/ai-files.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanAiFiles', () => {
  function createTempDir(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-ai-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('returns empty for project with no AI files', () => {
    const dir = createTempDir({ 'src/index.ts': '' });
    try {
      expect(scanAiFiles(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('detects CLAUDE.md', () => {
    const dir = createTempDir({ 'CLAUDE.md': 'line1\nline2\nline3' });
    try {
      const result = scanAiFiles(dir);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('claude-md');
      expect(result[0].lineCount).toBe(3);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('detects .claude/settings.json', () => {
    const dir = createTempDir({ '.claude/settings.json': '{}' });
    try {
      const result = scanAiFiles(dir);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('claude-settings');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('detects multiple AI files', () => {
    const dir = createTempDir({
      'CLAUDE.md': 'content',
      '.claude/settings.json': '{}',
      '.claude/settings.local.json': '{}',
    });
    try {
      const result = scanAiFiles(dir);
      expect(result.length).toBeGreaterThanOrEqual(2);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scanner/ai-files.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ai-files.ts**

Create `src/scanner/ai-files.ts`:

```typescript
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AiFile } from '../types/index.js';

function countLines(filePath: string): number {
  try {
    return readFileSync(filePath, 'utf-8').split('\n').length;
  } catch {
    return 0;
  }
}

export function scanAiFiles(root: string): AiFile[] {
  const files: AiFile[] = [];

  const claudeMd = join(root, 'CLAUDE.md');
  if (existsSync(claudeMd)) {
    files.push({ type: 'claude-md', path: 'CLAUDE.md', lineCount: countLines(claudeMd) });
  }

  const claudeDir = join(root, '.claude');
  if (existsSync(claudeDir)) {
    const settingsPath = join(claudeDir, 'settings.json');
    if (existsSync(settingsPath)) {
      files.push({ type: 'claude-settings', path: '.claude/settings.json', lineCount: countLines(settingsPath) });
    }

    const settingsLocalPath = join(claudeDir, 'settings.local.json');
    if (existsSync(settingsLocalPath)) {
      files.push({ type: 'claude-settings', path: '.claude/settings.local.json', lineCount: countLines(settingsLocalPath) });
    }

    const pluginsDir = join(claudeDir, 'plugins');
    if (existsSync(pluginsDir)) {
      try {
        for (const entry of readdirSync(pluginsDir)) {
          const pluginJson = join(pluginsDir, entry, 'plugin.json');
          if (existsSync(pluginJson)) {
            files.push({
              type: 'claude-plugin',
              path: `.claude/plugins/${entry}/plugin.json`,
              lineCount: countLines(pluginJson),
            });
          }
        }
      } catch { /* permission error */ }
    }
  }

  return files;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/scanner/ai-files.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scanner/ai-files.ts tests/scanner/ai-files.test.ts
git commit -m "feat: add AI context file scanner (CLAUDE.md, .claude/)"
```

---

### Task 5: Package Info Scanner

**Files:**
- Create: `src/scanner/package-info.ts`
- Create: `tests/scanner/package-info.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scanner/package-info.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { scanPackageInfo } from '../../src/scanner/package-info.js';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('scanPackageInfo', () => {
  function createTempDir(structure: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'slaminar-pkg-test-'));
    for (const [path, content] of Object.entries(structure)) {
      const fullPath = join(dir, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content);
    }
    return dir;
  }

  it('returns empty for project with no package files', () => {
    const dir = createTempDir({ 'src/index.ts': '' });
    try {
      expect(scanPackageInfo(dir)).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('detects package.json', () => {
    const pkg = JSON.stringify({
      name: 'test-pkg', version: '1.0.0', description: 'A test',
      scripts: { build: 'tsc', test: 'vitest' },
      dependencies: { commander: '^13.0.0' },
      devDependencies: { typescript: '^5.0.0' },
    });
    const dir = createTempDir({ 'package.json': pkg });
    try {
      const result = scanPackageInfo(dir);
      expect(result).toHaveLength(1);
      expect(result[0].manager).toBe('npm');
      expect(result[0].name).toBe('test-pkg');
      expect(result[0].scripts).toHaveProperty('build');
      expect(result[0].dependencies).toContain('commander');
      expect(result[0].devDependencies).toContain('typescript');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('detects Cargo.toml', () => {
    const dir = createTempDir({ 'Cargo.toml': '[package]\nname = "my-crate"\nversion = "0.1.0"\n' });
    try {
      const result = scanPackageInfo(dir);
      expect(result).toHaveLength(1);
      expect(result[0].manager).toBe('cargo');
      expect(result[0].name).toBe('my-crate');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('detects go.mod', () => {
    const dir = createTempDir({ 'go.mod': 'module github.com/user/repo\n\ngo 1.21\n' });
    try {
      const result = scanPackageInfo(dir);
      expect(result).toHaveLength(1);
      expect(result[0].manager).toBe('go');
      expect(result[0].name).toBe('github.com/user/repo');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/scanner/package-info.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement package-info.ts**

Create `src/scanner/package-info.ts`:

```typescript
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageInfo } from '../types/index.js';

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function readText(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function parseTomlValue(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1] ?? null;
}

function parsePackageJson(root: string): PackageInfo | null {
  const pkg = readJson(join(root, 'package.json'));
  if (!pkg) return null;
  return {
    manager: 'npm',
    name: (pkg.name as string) ?? null,
    version: (pkg.version as string) ?? null,
    description: (pkg.description as string) ?? null,
    scripts: (pkg.scripts as Record<string, string>) ?? {},
    dependencies: Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
    devDependencies: Object.keys((pkg.devDependencies as Record<string, string>) ?? {}),
    filePath: 'package.json',
  };
}

function parseCargoToml(root: string): PackageInfo | null {
  const content = readText(join(root, 'Cargo.toml'));
  if (!content) return null;
  return {
    manager: 'cargo', name: parseTomlValue(content, 'name'),
    version: parseTomlValue(content, 'version'), description: parseTomlValue(content, 'description'),
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'Cargo.toml',
  };
}

function parsePyprojectToml(root: string): PackageInfo | null {
  const content = readText(join(root, 'pyproject.toml'));
  if (!content) return null;
  return {
    manager: 'pip', name: parseTomlValue(content, 'name'),
    version: parseTomlValue(content, 'version'), description: parseTomlValue(content, 'description'),
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'pyproject.toml',
  };
}

function parseGoMod(root: string): PackageInfo | null {
  const content = readText(join(root, 'go.mod'));
  if (!content) return null;
  const moduleMatch = content.match(/^module\s+(.+)$/m);
  return {
    manager: 'go', name: moduleMatch?.[1]?.trim() ?? null,
    version: null, description: null,
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'go.mod',
  };
}

function parsePomXml(root: string): PackageInfo | null {
  if (!existsSync(join(root, 'pom.xml'))) return null;
  const content = readText(join(root, 'pom.xml'));
  if (!content) return null;
  const nameMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
  return {
    manager: 'maven', name: nameMatch?.[1] ?? null,
    version: null, description: null,
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'pom.xml',
  };
}

export function scanPackageInfo(root: string): PackageInfo[] {
  const results: PackageInfo[] = [];
  for (const parser of [parsePackageJson, parseCargoToml, parsePyprojectToml, parseGoMod, parsePomXml]) {
    const result = parser(root);
    if (result) results.push(result);
  }
  return results;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/scanner/package-info.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scanner/package-info.ts tests/scanner/package-info.test.ts
git commit -m "feat: add package info scanner (npm, cargo, pip, go, maven)"
```

---

### Task 6: Scanner Coordinator + scan CLI Command

**Files:**
- Create: `src/core/scanner.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Create src/core/scanner.ts**

See spec design for full implementation. Coordinator calls all 4 scanners (file-tree, git-info, ai-files, package-info) plus inline config/ci/docs scanners, assembles `ProjectSnapshot`.

- [ ] **Step 2: Wire scan command into CLI**

Update `src/cli.ts` to import `scan` from `./core/scanner.js` and call it in the scan action.

- [ ] **Step 3: Test against reference projects**

```bash
npx tsx src/cli.ts scan /Users/lanco/aidata/temp_git/sincenety | head -30
npx tsx src/cli.ts scan /Users/lanco/aidata/temp_git/mdmizer | head -30
```

Expected: Valid JSON with fileStats, packages, git, AI files.

- [ ] **Step 4: Commit**

```bash
git add src/core/scanner.ts src/cli.ts
git commit -m "feat: wire scanner coordinator and scan CLI command"
```

---

### Task 7: Language Detector

**Files:**
- Create: `src/analyzer/language-detector.ts`
- Create: `tests/analyzer/language-detector.test.ts`

- [ ] **Step 1: Write failing tests** — Test TypeScript, React, Vite, Python, Rust, unknown detection.
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement** — Map file extensions to languages, detect framework from deps, build tool from configs.
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 8: Structure Mapper

**Files:**
- Create: `src/analyzer/structure-mapper.ts`
- Create: `tests/analyzer/structure-mapper.test.ts`

- [ ] **Step 1: Write failing tests** — Test CLI, SPA, API, library, unknown detection.
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement** — Detect patterns from dependencies and directory structure.
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 9: Convention Extractor + Dependency Analyzer + Maturity Detector

**Files:**
- Create: `src/analyzer/convention-extractor.ts`
- Create: `src/analyzer/dependency-analyzer.ts`
- Create: `src/analyzer/maturity-detector.ts`
- Create: `tests/analyzer/convention-extractor.test.ts`
- Create: `tests/analyzer/dependency-analyzer.test.ts`
- Create: `tests/analyzer/maturity-detector.test.ts`

- [ ] **Step 1-3: Write tests for all three modules**
- [ ] **Step 4: Run tests to verify they all fail**
- [ ] **Step 5-7: Implement all three modules**
- [ ] **Step 8: Run all analyzer tests**
- [ ] **Step 9: Commit**

---

### Task 10: Analyzer Coordinator + analyze CLI Command

**Files:**
- Create: `src/core/pipeline.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Create pipeline.ts** — Calls all analyzers, assembles `ProjectProfile`.
- [ ] **Step 2: Wire analyze command into CLI**
- [ ] **Step 3: Test against sincenety** — Expect: CLI, TypeScript, commander.
- [ ] **Step 4: Test against mdmizer** — Expect: SPA, React, Vite.
- [ ] **Step 5: Commit**

---

### Task 11: Integration Verification

- [ ] **Step 1: Build** — `npm run build` succeeds.
- [ ] **Step 2: Full test suite** — `npm test` all pass.
- [ ] **Step 3: End-to-end CLI tests** — scan/analyze on sincenety, mdmizer, empty dir.
- [ ] **Step 4: Final commit** — `"feat: Phase 1 complete — scan and analyze commands working"`

---

## Phase 1 Completion Criteria

- [ ] `slaminar scan [path]` — outputs valid ProjectSnapshot JSON
- [ ] `slaminar analyze [path]` — outputs valid ProjectProfile JSON
- [ ] sincenety analysis: detects CLI, TypeScript, commander
- [ ] mdmizer analysis: detects SPA, React, Vite
- [ ] Empty directory: detects greenfield maturity
- [ ] All tests pass
- [ ] Build succeeds
