/**
 * Read-only environment diagnostic — `slaminar doctor`.
 *
 * Every check returns pass/warn/fail with a human-readable detail. No file
 * writes. Mirrors the category model the init verifier uses so operators can
 * scan the output quickly.
 */

import { accessSync, constants, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import chalk from 'chalk';
import { detectAiProvider } from '../generator/ai-provider.js';
import { loadCache, isCacheValid } from '../recommender/catalog-cache.js';
import { checkPrerequisite } from '../runtime/prerequisite.js';
import { getSkillStatus, getUserSkillPath } from '../skill/installer.js';
import { getConfigDir } from '../auth/config.js';
import { defaultsExist, getDefaultsPath, loadDefaults } from './defaults.js';
import { SLAMINAR_VERSION } from '../version.js';
import type { DoctorCheck, DoctorResult } from '../types/index.js';

function isWritable(path: string): boolean {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function checkEnvironment(): DoctorCheck[] {
  const node = checkPrerequisite('node', '>= 18');
  const git = checkPrerequisite('git');
  return [
    {
      name: 'Node.js',
      category: 'Environment',
      status: node.satisfied ? 'pass' : node.found ? 'fail' : 'fail',
      detail: node.found
        ? `${node.version}${node.satisfied ? ' (required: >= 18)' : ' — requires >= 18'}`
        : 'not found',
    },
    {
      name: 'git',
      category: 'Environment',
      status: git.found ? 'pass' : 'warn',
      detail: git.found ? `${git.version}` : 'not found (optional — used for history analysis)',
    },
  ];
}

function checkInstallation(): DoctorCheck[] {
  const skillStatus = getSkillStatus();
  const checks: DoctorCheck[] = [
    {
      name: 'slaminar',
      category: 'Installation',
      status: 'pass',
      detail: `v${SLAMINAR_VERSION}`,
    },
  ];
  if (!skillStatus.bundledAvailable) {
    checks.push({
      name: 'Claude Code skill',
      category: 'Installation',
      status: 'fail',
      detail: 'bundled SKILL.md missing — reinstall slaminar via npm',
    });
  } else if (!skillStatus.installed) {
    checks.push({
      name: 'Claude Code skill',
      category: 'Installation',
      status: 'warn',
      detail: `not installed — run \`slaminar skill install\` (target: ${getUserSkillPath()})`,
    });
  } else if (!skillStatus.contentMatches) {
    checks.push({
      name: 'Claude Code skill',
      category: 'Installation',
      status: 'warn',
      detail: 'installed but differs from bundled — run `slaminar skill install` to update',
    });
  } else {
    checks.push({
      name: 'Claude Code skill',
      category: 'Installation',
      status: 'pass',
      detail: skillStatus.path,
    });
  }
  return checks;
}

function checkAuthentication(): DoctorCheck[] {
  const status = detectAiProvider();
  if (!status.available) {
    return [
      {
        name: 'AI provider',
        category: 'Authentication',
        status: 'warn',
        detail: 'none configured — run `slaminar setup` (local rules will be used until configured)',
      },
    ];
  }
  const modelPart = status.model ? `, model ${status.model}` : '';
  return [
    {
      name: 'AI provider',
      category: 'Authentication',
      status: 'pass',
      detail: `${status.provider}${modelPart} (source: ${status.source})`,
    },
  ];
}

function checkCatalog(): DoctorCheck[] {
  const defaults = loadDefaults();
  const ttlMs = Math.max(0, defaults.catalog.autoRefreshHours) * 60 * 60 * 1000;
  const cache = loadCache();
  if (!cache) {
    return [
      {
        name: 'Catalog cache',
        category: 'Catalog',
        status: 'warn',
        detail: 'no cache — `slaminar catalog update` to fetch latest',
      },
    ];
  }
  const valid = ttlMs === 0 ? true : isCacheValid(cache, ttlMs);
  const fetchedHoursAgo =
    Math.round((Date.now() - new Date(cache.fetchedAt).getTime()) / 360_000) / 10;
  return [
    {
      name: 'Catalog cache',
      category: 'Catalog',
      status: valid ? 'pass' : 'warn',
      detail: `v${cache.catalog.version}, ${cache.catalog.tools.length} tools, fetched ${fetchedHoursAgo}h ago${valid ? '' : ' (expired)'}`,
    },
  ];
}

function checkPermissions(): DoctorCheck[] {
  const configDir = getConfigDir();
  const skillDir = join(homedir(), '.claude', 'skills', 'slaminar');
  const checks: DoctorCheck[] = [];
  checks.push({
    name: '~/.config/slaminar/',
    category: 'Permissions',
    status: !existsSync(configDir) || isWritable(configDir) ? 'pass' : 'fail',
    detail: !existsSync(configDir)
      ? 'not created yet (will be created on first setup)'
      : isWritable(configDir)
        ? 'writable'
        : 'not writable',
  });
  checks.push({
    name: '~/.claude/skills/slaminar/',
    category: 'Permissions',
    status: !existsSync(skillDir) || isWritable(skillDir) ? 'pass' : 'fail',
    detail: !existsSync(skillDir)
      ? 'not installed yet'
      : isWritable(skillDir)
        ? 'writable'
        : 'not writable',
  });
  return checks;
}

function checkDefaults(): DoctorCheck[] {
  if (!defaultsExist()) {
    return [
      {
        name: 'defaults.json',
        category: 'Configuration',
        status: 'warn',
        detail: `not created — run \`slaminar setup\` (path: ${getDefaultsPath()})`,
      },
    ];
  }
  try {
    const d = loadDefaults();
    return [
      {
        name: 'defaults.json',
        category: 'Configuration',
        status: 'pass',
        detail: `version ${d.version}, savedAt ${d.savedAt}`,
      },
    ];
  } catch {
    return [
      {
        name: 'defaults.json',
        category: 'Configuration',
        status: 'fail',
        detail: 'unreadable — run `slaminar setup --reconfigure defaults` to rewrite',
      },
    ];
  }
}

export function runDoctor(): DoctorResult {
  const checks: DoctorCheck[] = [
    ...checkEnvironment(),
    ...checkInstallation(),
    ...checkAuthentication(),
    ...checkCatalog(),
    ...checkPermissions(),
    ...checkDefaults(),
  ];
  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;
  for (const c of checks) {
    if (c.status === 'pass') passCount += 1;
    else if (c.status === 'warn') warnCount += 1;
    else failCount += 1;
  }
  return { checks, passCount, warnCount, failCount };
}

export function formatDoctorReport(result: DoctorResult): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold('━━━ slaminar doctor ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  let lastCategory = '';
  for (const c of result.checks) {
    if (c.category !== lastCategory) {
      lines.push('');
      lines.push(chalk.bold(`  ${c.category}`));
      lastCategory = c.category;
    }
    const icon =
      c.status === 'pass' ? chalk.green('✓') : c.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
    lines.push(`    ${icon} ${c.name.padEnd(28)} ${c.detail}`);
  }
  lines.push('');
  lines.push(
    `  Summary: ${chalk.green(`${result.passCount} pass`)}, ${chalk.yellow(`${result.warnCount} warn`)}, ${chalk.red(`${result.failCount} fail`)}`,
  );
  lines.push('');
  return lines.join('\n');
}

export function doctorExitCode(result: DoctorResult): number {
  if (result.failCount > 0) return 2;
  if (result.warnCount > 0) return 1;
  return 0;
}
