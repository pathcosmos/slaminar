import type { ProjectSnapshot, ConventionProfile, FileNode } from '../types/index.js';

const TEST_FRAMEWORKS = ['vitest', 'jest', 'mocha', 'ava', 'jasmine', 'tap'];
const LINTERS = ['eslint', 'biome', 'oxlint', 'tslint'];
const FORMATTERS = ['prettier', 'biome', 'dprint'];
const CONVENTIONAL_RE = /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\(.+\))?!?:/;
const EMOJI_RE = /^:\w+:|^[\u{1F300}-\u{1FAFF}]/u;
const LANG_RE = /\.(ko|ja|zh|es|fr|de|pt|ru|it|ar|hi|th|vi|nl|pl|sv|tr)\./i;

export function extractConventions(snapshot: ProjectSnapshot): ConventionProfile {
  return {
    naming: detectNaming(snapshot),
    testFramework: detectTestFramework(snapshot),
    linter: detectLinter(snapshot),
    formatter: detectFormatter(snapshot),
    commitStyle: detectCommitStyle(snapshot),
    docLanguage: detectDocLanguage(snapshot),
  };
}

function detectNaming(snapshot: ProjectSnapshot): ConventionProfile['naming'] {
  const names: string[] = [];
  collectFileNames(snapshot.fileTree, names);

  let camelCount = 0;
  let kebabCount = 0;
  let snakeCount = 0;

  for (const name of names) {
    if (/[a-z][A-Z]/.test(name)) camelCount++;
    else if (name.includes('-')) kebabCount++;
    else if (name.includes('_')) snakeCount++;
  }

  const total = camelCount + kebabCount + snakeCount;
  if (total === 0) return 'unknown';
  if (camelCount >= kebabCount && camelCount >= snakeCount) return 'camelCase';
  if (kebabCount >= camelCount && kebabCount >= snakeCount) return 'kebab-case';
  return 'snake_case';
}

function collectFileNames(nodes: FileNode[], names: string[]): void {
  for (const node of nodes) {
    if (node.type === 'file' && node.extension) {
      const nameWithoutExt = node.name.replace(node.extension, '');
      if (nameWithoutExt.length > 1) names.push(nameWithoutExt);
    }
    if (node.children) collectFileNames(node.children, names);
  }
}

function detectTestFramework(snapshot: ProjectSnapshot): string | null {
  for (const cfg of snapshot.configs) {
    const t = cfg.type.toLowerCase();
    for (const fw of TEST_FRAMEWORKS) {
      if (t === fw || t.includes(fw)) return fw;
    }
  }
  for (const pkg of snapshot.packages) {
    for (const dep of pkg.devDependencies) {
      for (const fw of TEST_FRAMEWORKS) {
        if (dep === fw) return fw;
      }
    }
  }
  return null;
}

function detectLinter(snapshot: ProjectSnapshot): string | null {
  for (const cfg of snapshot.configs) {
    const t = cfg.type.toLowerCase();
    for (const l of LINTERS) {
      if (t === l || t.includes(l)) return l;
    }
  }
  return null;
}

function detectFormatter(snapshot: ProjectSnapshot): string | null {
  for (const cfg of snapshot.configs) {
    const t = cfg.type.toLowerCase();
    for (const f of FORMATTERS) {
      if (t === f || t.includes(f)) return f;
    }
  }
  return null;
}

function detectCommitStyle(snapshot: ProjectSnapshot): ConventionProfile['commitStyle'] {
  const commits = snapshot.git?.recentCommits ?? [];
  if (commits.length === 0) return 'unknown';

  let conventional = 0;
  let emoji = 0;
  for (const c of commits) {
    if (CONVENTIONAL_RE.test(c.message)) conventional++;
    else if (EMOJI_RE.test(c.message)) emoji++;
  }

  if (conventional / commits.length > 0.5) return 'conventional';
  if (emoji / commits.length > 0.5) return 'emoji';
  return 'freeform';
}

function detectDocLanguage(snapshot: ProjectSnapshot): string {
  for (const doc of snapshot.docs) {
    const match = doc.path.match(LANG_RE);
    if (match) return match[1].toLowerCase();
  }
  return 'en';
}
