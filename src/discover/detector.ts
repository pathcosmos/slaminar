/**
 * Shallow project classifier — given a directory confirmed to hold a Claude
 * Code signature, decide whether it's `new` / `configured` / `existing` /
 * `unsupported` and suggest the appropriate slaminar action.
 *
 * Intentionally cheap: only reads the handful of files needed to decide, so
 * the classifier can run on dozens of candidates without stalling.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type {
  DiscoveredProject,
  DiscoverySignature,
  DiscoveredStatus,
  SuggestedAction,
} from '../types/index.js';

const CLAUDE_MD_MAX_BYTES = 2048;

function detectLanguage(root: string): string | null {
  const checks: Array<{ file: string; language: string }> = [
    { file: 'package.json', language: 'typescript' }, // refined below
    { file: 'Cargo.toml', language: 'rust' },
    { file: 'pyproject.toml', language: 'python' },
    { file: 'requirements.txt', language: 'python' },
    { file: 'go.mod', language: 'go' },
    { file: 'pom.xml', language: 'java' },
    { file: 'build.gradle', language: 'java' },
    { file: 'build.gradle.kts', language: 'kotlin' },
    { file: 'mix.exs', language: 'elixir' },
  ];
  for (const c of checks) {
    if (existsSync(join(root, c.file))) {
      if (c.file === 'package.json') {
        // Distinguish ts vs js by tsconfig
        if (existsSync(join(root, 'tsconfig.json'))) return 'typescript';
        return 'javascript';
      }
      return c.language;
    }
  }
  // No manifest — peek for obvious extensions on a single directory listing.
  try {
    const entries = readdirSync(root).slice(0, 30);
    for (const name of entries) {
      if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'typescript';
      if (name.endsWith('.js') || name.endsWith('.jsx')) return 'javascript';
      if (name.endsWith('.py')) return 'python';
      if (name.endsWith('.rs')) return 'rust';
      if (name.endsWith('.go')) return 'go';
    }
  } catch {
    /* ignore */
  }
  return null;
}

function countClaudeMdLines(path: string): number | null {
  try {
    const data = readFileSync(path, 'utf-8');
    return data.split('\n').length;
  } catch {
    return null;
  }
}

function readClaudeMdPreview(path: string): string | null {
  try {
    const fd = readFileSync(path);
    return fd.slice(0, CLAUDE_MD_MAX_BYTES).toString('utf-8');
  } catch {
    return null;
  }
}

function readSlaminarVersion(slaminarConfigPath: string): string | null {
  try {
    const raw = readFileSync(slaminarConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed.slaminarVersion === 'string' ? parsed.slaminarVersion : null;
  } catch {
    return null;
  }
}

function collectSignatures(root: string): DiscoverySignature[] {
  const sigs: DiscoverySignature[] = [];
  if (existsSync(join(root, 'CLAUDE.md'))) sigs.push('CLAUDE.md');
  if (existsSync(join(root, '.claude'))) {
    sigs.push('claude-dir');
    if (existsSync(join(root, '.claude', 'settings.json'))) sigs.push('claude-settings');
    if (existsSync(join(root, '.claude', 'plugins'))) sigs.push('claude-plugins');
  }
  if (existsSync(join(root, '.slaminar', 'config.json'))) sigs.push('slaminar-config');
  return sigs;
}

function classifyStatus(
  signatures: DiscoverySignature[],
  language: string | null,
): { status: DiscoveredStatus; skipReason?: string } {
  const hasSlaminar = signatures.includes('slaminar-config');
  if (hasSlaminar) return { status: 'configured' };

  const hasClaudeDir = signatures.includes('claude-dir');
  const hasClaudeMd = signatures.includes('CLAUDE.md');

  if (!hasClaudeDir && !hasClaudeMd) {
    return { status: 'unsupported', skipReason: 'no Claude Code signature' };
  }
  if (!language) {
    return { status: 'unsupported', skipReason: 'language not detected' };
  }
  if (hasClaudeMd && !hasClaudeDir) {
    return { status: 'existing' };
  }
  return { status: 'new' };
}

function suggestAction(status: DiscoveredStatus): SuggestedAction {
  switch (status) {
    case 'new':
      return 'init';
    case 'configured':
      return 'update';
    case 'existing':
      return 'init-merge';
    case 'unsupported':
    default:
      return 'skip';
  }
}

export function classifyProject(root: string): DiscoveredProject {
  const signatures = collectSignatures(root);
  const language = detectLanguage(root);
  const { status, skipReason } = classifyStatus(signatures, language);
  const hasClaudeMd = signatures.includes('CLAUDE.md');
  const claudeMdPath = hasClaudeMd ? join(root, 'CLAUDE.md') : null;
  const claudeMdLines = claudeMdPath ? countClaudeMdLines(claudeMdPath) : null;
  const slaminarVersion = signatures.includes('slaminar-config')
    ? readSlaminarVersion(join(root, '.slaminar', 'config.json'))
    : null;

  // Bonus: cheap preview for existing CLAUDE.md (used by UI messages)
  if (claudeMdPath) readClaudeMdPreview(claudeMdPath);

  return {
    root,
    status,
    signatures,
    language,
    hasClaudeMd,
    claudeMdLines,
    slaminarVersion,
    suggestedAction: suggestAction(status),
    skipReason,
  };
}
