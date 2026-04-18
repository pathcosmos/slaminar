/**
 * Global setup wizard — `slaminar setup`.
 *
 * Walks the user through a small, progressive set of decisions and writes
 * the result to `~/.config/slaminar/defaults.json`. Reuses the existing
 * `runLoginWizard()` for AI credentials and `runDoctor()` for the opening
 * environment summary. Exposes a non-interactive path (`--yes`) driven by
 * `SLAMINAR_*` env vars so CI can fully automate setup.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';
import Table from 'cli-table3';
import { confirm, input, select } from '@inquirer/prompts';
import { getConfigDir, loadAuthConfig, saveAuthConfig } from '../auth/config.js';
import type { AuthConfig, AuthProvider } from '../auth/config.js';
import { runLoginWizard } from '../auth/wizard.js';
import { detectAiProvider } from '../generator/ai-provider.js';
import { getDefaultModel } from '../auth/models.js';
import { installSkill } from '../skill/installer.js';
import type {
  AiMode,
  BatchApplyResult,
  CatalogMode,
  DiscoveryResult,
  TokenTier,
  UserDefaults,
} from '../types/index.js';
import { formatDoctorReport, runDoctor } from './doctor.js';
import {
  builtInDefaults,
  defaultsExist,
  getDefaultsPath,
  loadDefaults,
  resetDefaultsSection,
  saveDefaults,
} from './defaults.js';
import { detectTeamConfig, importTeamCatalog } from '../discover/team-import.js';
import { discoverProjects, parseRootsInput } from '../discover/scanner.js';
import { migrateSingleUrlToSource, parseEnvSources } from '../recommender/catalog-sources.js';
import { saveDiscoveryCache } from '../discover/cache.js';
import { formatDiscoveryTable } from '../reporter/discovery-table.js';
import { batchApply } from '../discover/batch.js';

export type SetupSection = 'auth' | 'catalog' | 'defaults' | 'skill';

export interface SetupOptions {
  yes?: boolean;
  reconfigureSection?: SetupSection;
  noUpdateCheck?: boolean;
  applyToDiscovered?: boolean;
  noDiscovery?: boolean;
}

export interface SetupResult {
  defaultsPath: string;
  logPath: string | null;
  applied: { section: string; summary: string }[];
  skipped: string[];
}

function header(text: string): string {
  return chalk.bold(`\n━━━ ${text} ${'━'.repeat(Math.max(4, 60 - text.length))}\n`);
}

function authFromEnv(): AuthConfig | null {
  const provider = process.env.SLAMINAR_AI_PROVIDER as AuthProvider | undefined;
  if (!provider) return null;
  if (provider === 'cloudflare') {
    const apiToken = process.env.SLAMINAR_CF_TOKEN;
    const accountId = process.env.SLAMINAR_CF_ACCOUNT_ID;
    if (!apiToken || !accountId) return null;
    return {
      version: 1,
      active: 'cloudflare',
      providers: {
        cloudflare: {
          apiToken,
          accountId,
          accountName: process.env.SLAMINAR_CF_ACCOUNT_NAME,
          model: process.env.SLAMINAR_CF_MODEL ?? getDefaultModel('cloudflare'),
        },
      },
      savedAt: new Date().toISOString(),
    };
  }
  if (provider === 'anthropic') {
    const apiKey = process.env.SLAMINAR_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return {
      version: 1,
      active: 'anthropic',
      providers: {
        anthropic: {
          apiKey,
          model: process.env.SLAMINAR_ANTHROPIC_MODEL ?? getDefaultModel('anthropic'),
        },
      },
      savedAt: new Date().toISOString(),
    };
  }
  return null;
}

async function stepEnvironment(): Promise<void> {
  console.log(header('Step 1 — Environment checks'));
  const doctor = runDoctor();
  console.log(formatDoctorReport(doctor));
  if (doctor.failCount > 0) {
    console.log(
      chalk.red(
        `\n${doctor.failCount} check(s) failed. You can continue, but some features may not work until fixed.\n`,
      ),
    );
  }
}

async function stepAuth(options: SetupOptions): Promise<{ summary: string; skipped: boolean }> {
  console.log(header('Step 2 — AI provider'));

  const existing = loadAuthConfig();
  const existingStatus = detectAiProvider();

  if (options.yes) {
    const fromEnv = authFromEnv();
    if (fromEnv) {
      saveAuthConfig(fromEnv);
      return { summary: `${fromEnv.active} (from SLAMINAR_* env vars)`, skipped: false };
    }
    if (existingStatus.available) {
      return {
        summary: `${existingStatus.provider} (kept existing auth.json)`,
        skipped: true,
      };
    }
    return {
      summary: 'none (non-interactive — set SLAMINAR_AI_PROVIDER/_CF_TOKEN/_CF_ACCOUNT_ID to auto-configure)',
      skipped: true,
    };
  }

  if (existingStatus.available) {
    console.log(
      chalk.dim(
        `  Existing auth detected — provider: ${existingStatus.provider}${existingStatus.model ? `, model ${existingStatus.model}` : ''}`,
      ),
    );
    const reconfigure = await confirm({
      message: 'Reconfigure AI provider?',
      default: false,
    });
    if (!reconfigure) {
      return {
        summary: `${existingStatus.provider} (kept existing)`,
        skipped: true,
      };
    }
  } else {
    console.log(
      chalk.dim(
        '  AI enhancement is optional — slaminar works fine in local-rules mode if skipped.',
      ),
    );
    const configure = await confirm({
      message: 'Configure an AI provider now?',
      default: true,
    });
    if (!configure) {
      return { summary: 'none (local rules only)', skipped: true };
    }
  }

  const ok = await runLoginWizard();
  if (!ok) {
    return { summary: 'setup failed — re-run `slaminar setup --reconfigure auth`', skipped: true };
  }
  const after = detectAiProvider();
  const unchanged = !!existing && JSON.stringify(loadAuthConfig()) === JSON.stringify(existing);
  return {
    summary: `${after.provider}${after.model ? ` (${after.model})` : ''}${unchanged ? ' (unchanged)' : ''}`,
    skipped: false,
  };
}

async function maybeImportTeamConfig(options: SetupOptions): Promise<string | null> {
  const candidate = detectTeamConfig(process.cwd());
  if (!candidate) return null;

  const team = candidate.teamConfig;
  console.log(
    chalk.dim(
      `\n  Team config detected at ${process.cwd()}/.slaminar/config.json:\n    catalogUrl:   ${team.catalogUrl}\n    catalogMode:  ${team.catalogMode}`,
    ),
  );

  let accept: boolean;
  if (options.yes) {
    accept = process.env.SLAMINAR_IMPORT_TEAM_CATALOG === 'true';
    if (!accept) {
      return 'team config detected but SLAMINAR_IMPORT_TEAM_CATALOG !== "true"';
    }
  } else {
    accept = await confirm({
      message: 'Import this catalog as your personal global default?',
      default: true,
    });
  }

  if (!accept) return null;
  const outcome = importTeamCatalog(candidate);
  console.log(chalk.green(`  ✓ ${outcome.summary}`));
  return outcome.summary;
}

async function stepCatalog(
  current: UserDefaults,
  options: SetupOptions,
): Promise<UserDefaults['catalog']> {
  console.log(header('Step 3 — Catalog'));

  await maybeImportTeamConfig(options);
  const refreshed = loadDefaults();
  const existingSources = refreshed.catalog.sources ?? [];

  // v0.8 — env var `SLAMINAR_CATALOG_SOURCES` overrides the single-URL vars
  // in --yes mode. Parsed entries are persisted as user-scope sources.
  if (options.yes) {
    const envSources = parseEnvSources(process.env.SLAMINAR_CATALOG_SOURCES);
    if (envSources.length > 0) {
      const userScoped = envSources.map((s) => ({ ...s, scope: 'user' as const, priority: 100 }));
      return {
        ...refreshed.catalog,
        url: '',
        mode: 'replace',
        sources: userScoped,
      };
    }
    return {
      ...refreshed.catalog,
      url: process.env.SLAMINAR_CATALOG_URL ?? refreshed.catalog.url,
      mode: ((process.env.SLAMINAR_CATALOG_MODE as CatalogMode | undefined) ?? refreshed.catalog.mode),
    };
  }

  // Interactive path keeps the v0.7 single-URL prompt shape; multi-source
  // fine-tuning is handled by the `slaminar catalog source` CLI.
  const currentPrimaryUrl = existingSources[0]?.uri ?? current.catalog.url;
  const useCustom = await confirm({
    message: currentPrimaryUrl
      ? `Keep custom catalog URL (${currentPrimaryUrl})?`
      : 'Use a custom catalog URL? (N = official)',
    default: Boolean(currentPrimaryUrl),
  });
  if (!useCustom) {
    console.log(
      chalk.dim(
        '\n  Tip: add extra sources (company + personal) later via\n       `slaminar catalog source add <uri>`\n',
      ),
    );
    return { ...current.catalog, url: '', mode: 'replace', sources: [] };
  }

  const url = await input({
    message: 'Custom catalog URL (or /absolute/path.json):',
    default: currentPrimaryUrl || 'https://',
    validate: (v) =>
      v.startsWith('http') || v.startsWith('file:') || v.startsWith('/') || v.startsWith('~') ||
      'URL must start with http(s)://, file:, or an absolute path',
  });
  const mode = (await select({
    message: 'Catalog mode:',
    choices: [
      { name: 'extend — merge with official', value: 'extend' },
      { name: 'replace — custom only', value: 'replace' },
    ],
    default: existingSources[0]?.mode ?? current.catalog.mode ?? 'extend',
  })) as CatalogMode;

  const hoursStr = await input({
    message: 'Auto-refresh interval in hours (0 to disable):',
    default: String(current.catalog.autoRefreshHours),
    validate: (v) => /^\d+$/.test(v) || 'must be a non-negative integer',
  });
  const autoRefreshHours = Math.max(0, parseInt(hoursStr, 10));

  const synthesized = migrateSingleUrlToSource({ url, mode, scope: 'user', addedAt: new Date().toISOString() });
  const sources = synthesized ? [synthesized] : [];

  console.log(
    chalk.dim(
      '\n  Tip: layer additional sources (priority 100–500) via\n       `slaminar catalog source add <uri>`\n',
    ),
  );

  return {
    autoRefreshHours,
    url,
    mode,
    sources,
  };
}

async function stepDefaults(
  current: UserDefaults,
  options: SetupOptions,
): Promise<Pick<UserDefaults, 'defaults' | 'telemetry'>> {
  console.log(header('Step 4 — Defaults for new projects'));

  if (options.yes) {
    const envTier = process.env.SLAMINAR_DEFAULT_TOKEN_TIER as TokenTier | undefined;
    return {
      defaults: {
        aiMode: (process.env.SLAMINAR_DEFAULT_AI_MODE as AiMode | undefined) ?? current.defaults.aiMode,
        excludeAuthTools: process.env.SLAMINAR_EXCLUDE_AUTH_TOOLS
          ? process.env.SLAMINAR_EXCLUDE_AUTH_TOOLS !== 'false'
          : current.defaults.excludeAuthTools,
        fileCountCap: process.env.SLAMINAR_FILE_COUNT_CAP
          ? Math.max(
              100,
              parseInt(process.env.SLAMINAR_FILE_COUNT_CAP, 10) || current.defaults.fileCountCap,
            )
          : current.defaults.fileCountCap,
        verbose: current.defaults.verbose,
        tokenTier:
          envTier && ['conservative', 'smart', 'rich'].includes(envTier)
            ? envTier
            : current.defaults.tokenTier ?? 'smart',
      },
      telemetry: {
        optedIn: current.telemetry.optedIn,
        versionCheck: process.env.SLAMINAR_VERSION_CHECK
          ? process.env.SLAMINAR_VERSION_CHECK !== 'false'
          : current.telemetry.versionCheck,
      },
    };
  }

  const aiMode = (await select({
    message: 'AI mode for `slaminar init`',
    choices: [
      { name: 'auto    — use AI if configured, fall back to local rules', value: 'auto' },
      { name: 'ai      — require AI (fail if not configured)', value: 'ai' },
      { name: 'local   — local rules only (no AI)', value: 'local' },
    ],
    default: current.defaults.aiMode,
  })) as AiMode;

  const excludeAuthTools = await confirm({
    message: 'Exclude tools that require external authentication?',
    default: current.defaults.excludeAuthTools,
  });

  const fileCountStr = await input({
    message: 'Max files scanned per project:',
    default: String(current.defaults.fileCountCap),
    validate: (v) => /^\d+$/.test(v) || 'must be a positive integer',
  });
  const fileCountCap = Math.max(100, parseInt(fileCountStr, 10));

  const tokenTier = (await select({
    message: 'Token cost tier for recommended tools',
    choices: [
      { name: 'smart        — balanced (default)', value: 'smart' },
      { name: 'conservative — lightweight tools only (low cost)', value: 'conservative' },
      { name: 'rich         — include heavy tools (MCP servers, etc.)', value: 'rich' },
    ],
    default: current.defaults.tokenTier ?? 'smart',
  })) as TokenTier;

  const versionCheck = await confirm({
    message: 'Enable weekly version check (reads npm registry only, no telemetry)?',
    default: current.telemetry.versionCheck,
  });

  return {
    defaults: {
      aiMode,
      excludeAuthTools,
      fileCountCap,
      verbose: current.defaults.verbose,
      tokenTier,
    },
    telemetry: { optedIn: current.telemetry.optedIn, versionCheck },
  };
}

interface DiscoveryStepOutcome {
  ran: boolean;
  batchSummary?: string;
}

async function stepDiscovery(options: SetupOptions): Promise<DiscoveryStepOutcome> {
  console.log(header('Step 6 — Project discovery (optional)'));

  let rootsInput: string | null = null;
  if (options.yes) {
    rootsInput = process.env.SLAMINAR_DISCOVER_ROOTS ?? null;
    if (!rootsInput) {
      console.log(chalk.dim('  SLAMINAR_DISCOVER_ROOTS unset — skipping discovery.'));
      return { ran: false };
    }
  } else {
    const wantScan = await confirm({
      message: 'Scan specific directories for existing Claude Code projects?',
      default: false,
    });
    if (!wantScan) return { ran: false };
    const lastRoots = loadDefaults().discovery.lastRoots;
    const rawInput = await input({
      message: 'Roots to scan (comma or space separated):',
      default: lastRoots.length ? lastRoots.join(', ') : '~/work, ~/projects',
    });
    rootsInput = rawInput;
  }

  const roots = parseRootsInput(rootsInput);
  if (roots.length === 0) {
    console.log(chalk.yellow('  No valid roots provided — skipping discovery.'));
    return { ran: false };
  }

  console.log(chalk.dim(`\n🔍 Scanning ${roots.length} root(s)...`));
  const result = await discoverProjects(roots);
  try {
    saveDiscoveryCache(result);
  } catch {
    // non-fatal
  }
  // Remember the last roots for next run.
  try {
    const d = loadDefaults();
    saveDefaults({ ...d, discovery: { ...d.discovery, lastRoots: roots } });
  } catch {
    // non-fatal
  }

  console.log(formatDiscoveryTable(result));

  if (result.projects.length === 0) return { ran: true };

  // Decide batch action
  type BatchAction = 'dry-run' | 'select' | 'apply' | 'skip';
  const approveFromEnv = process.env.SLAMINAR_BATCH_APPROVED;
  let selectedAction: BatchAction = 'dry-run';
  let approvedRoots: Set<string> | null = null;

  if (options.yes) {
    if (!approveFromEnv && !options.applyToDiscovered) {
      console.log(chalk.dim('  SLAMINAR_BATCH_APPROVED unset and --apply-to-discovered not passed — skipping batch apply.'));
      return { ran: true };
    }
    if (approveFromEnv) {
      approvedRoots = new Set(parseRootsInput(approveFromEnv));
      selectedAction = process.env.SLAMINAR_BATCH_DRY_RUN === 'true' ? 'dry-run' : 'apply';
    } else {
      selectedAction = 'apply';
    }
  } else {
    const choice = (await select({
      message: 'How should we proceed?',
      choices: [
        { name: `Dry-run all ${result.projects.filter(p => p.suggestedAction !== 'skip').length} suggested projects (recommended)`, value: 'dry-run' },
        { name: 'Select specific projects', value: 'select' },
        { name: 'Apply immediately (no dry-run)', value: 'apply' },
        { name: 'Skip — save defaults only', value: 'skip' },
      ],
      default: 'dry-run',
    })) as BatchAction;
    selectedAction = choice;

    if (choice === 'select') {
      const { checkbox } = await import('@inquirer/prompts');
      const picked = await checkbox({
        message: 'Pick the projects to operate on:',
        choices: result.projects
          .filter(p => p.suggestedAction !== 'skip')
          .map(p => ({ name: `${p.root}  (${p.status} → ${p.suggestedAction})`, value: p.root, checked: p.status === 'new' })),
      });
      approvedRoots = new Set(picked as string[]);
      const confirmDryRun = await confirm({
        message: 'Run as dry-run first?',
        default: true,
      });
      selectedAction = confirmDryRun ? 'dry-run' : 'apply';
    }
  }

  if (selectedAction === 'skip') return { ran: true };

  const onlyNew = process.env.SLAMINAR_ONLY_NEW === 'true';
  const projectsToApply = result.projects.filter((p) => {
    if (approvedRoots && !approvedRoots.has(p.root)) return false;
    return true;
  });

  const batch: BatchApplyResult = await batchApply(projectsToApply, {
    dryRun: selectedAction === 'dry-run',
    onlyNew,
  });

  console.log('');
  console.log(
    chalk.bold(
      `Batch ${selectedAction === 'dry-run' ? 'dry-run' : 'apply'} complete: ${chalk.green(`${batch.succeeded.length} succeeded`)}, ${chalk.red(`${batch.failed.length} failed`)}, ${chalk.dim(`${batch.skipped.length} skipped`)}`,
    ),
  );
  if (batch.summaryPath) console.log(chalk.dim(`  Audit log: ${batch.summaryPath}`));

  return {
    ran: true,
    batchSummary: `${selectedAction}: ${batch.succeeded.length}/${batch.attempted} succeeded, ${batch.failed.length} failed, ${batch.skipped.length} skipped`,
  };
}

async function stepSkill(
  current: UserDefaults,
  options: SetupOptions,
): Promise<UserDefaults['skill']> {
  console.log(header('Step 5 — Claude Code skill'));

  if (options.yes) return current.skill;

  // v0.8.3 — single question instead of two. `installSkill()` is idempotent
  // (content-hash compares), so we always run it when the user opts in and
  // it's a no-op when already up to date.
  const keepInstalled = await confirm({
    message: 'Keep the /slaminar Claude Code skill installed and auto-updated on npm install?',
    default: current.skill.autoInstall,
  });

  if (keepInstalled) {
    const result = installSkill();
    if (result.status === 'unchanged') {
      console.log(`  ${chalk.dim('=')} Skill already up to date at ${result.path}`);
    } else if (result.status === 'installed' || result.status === 'updated') {
      console.log(`  ${chalk.green('✓')} ${result.message ?? result.status}`);
    } else if (result.status === 'failed') {
      console.log(`  ${chalk.red('✗')} ${result.message ?? 'install failed'}`);
    }
  }

  return { autoInstall: keepInstalled, scope: 'global' };
}

function renderSummary(result: SetupResult): string {
  const table = new Table({ head: [chalk.bold('Section'), chalk.bold('Result')] });
  for (const { section, summary } of result.applied) {
    table.push([section, summary]);
  }
  for (const skipped of result.skipped) {
    table.push([skipped, chalk.dim('(skipped)')]);
  }
  const lines: string[] = [];
  lines.push(header('Setup complete'));
  lines.push(table.toString());
  lines.push('');
  lines.push(`  Defaults file: ${result.defaultsPath}`);
  if (result.logPath) lines.push(`  Log:           ${result.logPath}`);
  lines.push('');
  lines.push('  Next steps:');
  lines.push(`    ${chalk.dim('slaminar init <path>')}  — configure a project`);
  lines.push(`    ${chalk.dim('slaminar doctor')}       — verify your install anytime`);
  lines.push(`    ${chalk.dim('slaminar setup --reconfigure <section>')} — revisit a single step`);
  lines.push('');
  return lines.join('\n');
}

function writeSetupLog(result: SetupResult): string | null {
  try {
    const logsDir = join(getConfigDir(), 'setup-logs');
    mkdirSync(logsDir, { recursive: true });
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = now.toISOString().slice(11, 19).replace(/:/g, '-');
    const file = join(logsDir, `setup-${datePart}T${timePart}.md`);
    const lines = [`# slaminar setup — ${now.toISOString()}`, ''];
    for (const { section, summary } of result.applied) {
      lines.push(`- **${section}**: ${summary}`);
    }
    for (const skipped of result.skipped) {
      lines.push(`- ~~${skipped}~~ (skipped)`);
    }
    lines.push('');
    writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
    return file;
  } catch {
    return null;
  }
}

function currentDefaults(): UserDefaults {
  return defaultsExist() ? loadDefaults() : builtInDefaults();
}

export async function runSetupWizard(options: SetupOptions = {}): Promise<SetupResult> {
  const current = currentDefaults();
  const applied: SetupResult['applied'] = [];
  const skipped: string[] = [];

  const runAll = !options.reconfigureSection;
  const shouldRun = (s: SetupSection): boolean => runAll || options.reconfigureSection === s;

  if (runAll) {
    await stepEnvironment();
  }

  // Auth
  if (shouldRun('auth')) {
    const authOut = await stepAuth(options);
    if (authOut.skipped) skipped.push('auth');
    else applied.push({ section: 'auth', summary: authOut.summary });
  }

  // Build up the next defaults snapshot
  let next: UserDefaults = { ...current };

  if (shouldRun('catalog')) {
    next = { ...next, catalog: await stepCatalog(next, options) };
    applied.push({
      section: 'catalog',
      summary: next.catalog.url
        ? `${next.catalog.url} (${next.catalog.mode}, refresh ${next.catalog.autoRefreshHours}h)`
        : `official (refresh ${next.catalog.autoRefreshHours}h)`,
    });
  }

  if (shouldRun('defaults')) {
    const d = await stepDefaults(next, options);
    next = { ...next, defaults: d.defaults, telemetry: d.telemetry };
    applied.push({
      section: 'defaults',
      summary: `aiMode=${d.defaults.aiMode}, excludeAuthTools=${d.defaults.excludeAuthTools}, fileCountCap=${d.defaults.fileCountCap}, versionCheck=${d.telemetry.versionCheck}`,
    });
  }

  if (shouldRun('skill')) {
    next = { ...next, skill: await stepSkill(next, options) };
    applied.push({
      section: 'skill',
      summary: `autoInstall=${next.skill.autoInstall}, scope=${next.skill.scope}`,
    });
  }

  const defaultsPath = saveDefaults(next);

  if (runAll && !options.noDiscovery) {
    const outcome = await stepDiscovery(options);
    if (outcome.ran) {
      applied.push({
        section: 'discovery',
        summary: outcome.batchSummary ?? 'scan complete, no batch apply',
      });
    } else {
      skipped.push('discovery');
    }
  } else if (runAll) {
    skipped.push('discovery');
  }
  const result: SetupResult = {
    defaultsPath,
    logPath: null,
    applied,
    skipped,
  };
  result.logPath = writeSetupLog(result);

  console.log(renderSummary(result));
  return result;
}

export function resetSection(section: SetupSection): string {
  const mapping: Record<SetupSection, Parameters<typeof resetDefaultsSection>[0] | 'auth'> = {
    auth: 'auth',
    catalog: 'catalog',
    defaults: 'defaults',
    skill: 'skill',
  };
  if (mapping[section] === 'auth') {
    return getDefaultsPath();
  }
  resetDefaultsSection(mapping[section] as Parameters<typeof resetDefaultsSection>[0]);
  return getDefaultsPath();
}
