#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { scan } from './core/scanner.js';
import { analyze, init, type InitOptions } from './core/pipeline.js';
import { recommend } from './recommender/recommender.js';
import { formatInitReport } from './reporter/terminal.js';
import { PhaseTimer } from './reporter/progress.js';
import { verify } from './core/verifier.js';
import { update } from './core/updater.js';
import { uninstall, removeTool } from './rollback/uninstaller.js';
import { runCheck } from './ci/check.js';
import { detectAiProvider } from './generator/ai-provider.js';
import { resolveCatalog } from './recommender/catalog-resolver.js';
import { loadTeamConfig, saveTeamConfig } from './team/config.js';
import type { CatalogMode, CatalogSource } from './types/index.js';
import { loadCache, backupCache, rollbackCache, isCacheValid } from './recommender/catalog-cache.js';
import { diffCatalogs, formatDiff } from './recommender/catalog-diff.js';
import { fetchRemoteCatalog } from './recommender/catalog-remote.js';
import {
  addSource,
  removeSource,
  setSourceEnabled,
  listAllSources,
  type PersistentSourceScope,
} from './recommender/catalog-sources.js';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { installSkill, uninstallSkill, getSkillStatus, getUserSkillPath } from './skill/installer.js';
import { runSetupWizard, type SetupSection } from './setup/wizard.js';
import { runDoctor, formatDoctorReport, doctorExitCode } from './setup/doctor.js';
import { maybePrintUpdateNotice } from './setup/update-check.js';
import { discoverProjects, parseRootsInput } from './discover/scanner.js';
import { formatDiscoveryTable } from './reporter/discovery-table.js';
import {
  loadDiscoveryCache,
  saveDiscoveryCache,
  isDiscoveryCacheValid,
} from './discover/cache.js';
import { batchApply } from './discover/batch.js';
import { loadDefaults, saveDefaults } from './setup/defaults.js';
import { SLAMINAR_VERSION } from './version.js';
import Table from 'cli-table3';

const program = new Command();

program
  .name('slaminar')
  .description('Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구')
  .version(SLAMINAR_VERSION)
  .option('-v, --verbose', 'Show detailed output')
  .option('--no-update-check', 'Skip the weekly npm registry version check')
  .hook('preAction', async (thisCommand) => {
    const opts = thisCommand.opts();
    await maybePrintUpdateNotice(SLAMINAR_VERSION, {
      disabledViaFlag: opts.updateCheck === false,
    });
  });

program
  .command('init [path]')
  .description('Full pipeline: scan → analyze → recommend → generate → place')
  .option('--dry-run', 'Preview changes without writing')
  .option('--no-ai', 'Disable AI enhancement (use local rules only)')
  .option('--catalog <url>', 'Use custom catalog URL')
  .option('--catalog-mode <mode>', 'Catalog mode: extend or replace')
  .action(async (path: string | undefined, options: { dryRun?: boolean; ai?: boolean; catalog?: string; catalogMode?: string }) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar init — verbose mode\n');

      // If AI isn't configured, nudge the user toward `slaminar setup` but don't block.
      if (options.ai !== false && process.stdin.isTTY) {
        const aiStatus = detectAiProvider();
        if (!aiStatus.available) {
          console.log(chalk.yellow('\n⚠  AI 프로바이더가 설정되지 않았습니다.'));
          console.log(chalk.dim('   `slaminar setup`으로 한 번 설정하면 이후 모든 프로젝트에서 재사용됩니다.'));
          console.log(chalk.dim('   이번에는 로컬 규칙으로 진행합니다.\n'));
        }
      }

      timer.start('Initializing');
      const result = await init(targetPath, { dryRun: options.dryRun, useAi: options.ai, catalogUrl: options.catalog, catalogMode: options.catalogMode as CatalogMode | undefined });
      timer.end(`${result.writtenFiles.length} files written (${result.aiProvider.provider})`);

      if (result.aiProvider.available && options.ai !== false) {
        console.log(`\n✨ AI provider: ${result.aiProvider.provider}${result.aiProvider.model ? ` (${result.aiProvider.model})` : ''}`);
      }

      if (options.dryRun) {
        console.log('\n🔍 DRY RUN — no files will be written\n');
      }

      console.log(formatInitReport(result));

      if (verbose) {
        console.log('\n📊 Detailed Analysis:');
        console.log(`  Language: ${result.profile.language.primary} (${result.profile.language.framework ?? 'no framework'})`);
        console.log(`  Build: ${result.profile.language.buildTool ?? 'none detected'}`);
        console.log(`  Pattern: ${result.profile.structure.pattern}`);
        console.log(`  Test: ${result.profile.conventions.testFramework ?? 'none'}`);
        console.log(`  Linter: ${result.profile.conventions.linter ?? 'none'}`);
        console.log(`  Naming: ${result.profile.conventions.naming}`);
        console.log(`  Commit style: ${result.profile.conventions.commitStyle}`);
        console.log(`  Doc language: ${result.profile.conventions.docLanguage}`);
        console.log(`  Dependencies: ${result.profile.dependencies.total} total`);
        if (result.profile.dependencies.notable.length > 0) {
          console.log(`  Notable deps:`);
          for (const dep of result.profile.dependencies.notable) {
            console.log(`    - ${dep.name} (${dep.category})`);
          }
        }
        console.log(`  AI context: CLAUDE.md=${result.profile.existingAiContext.hasClaudeMd}, settings=${result.profile.existingAiContext.hasClaudeSettings}`);

        if (result.recommendation.excluded.length > 0) {
          console.log(`\n🚫 Excluded tools:`);
          for (const e of result.recommendation.excluded) {
            console.log(`  - ${e.tool.name}: ${e.reason}`);
          }
        }

        if (result.recommendation.conflicts.length > 0) {
          console.log(`\n⚡ Conflicts detected:`);
          for (const c of result.recommendation.conflicts) {
            console.log(`  - ${c.tools.join(' ↔ ')}: ${c.relation} — ${c.resolution}`);
          }
        }
      }

      if (!options.dryRun) {
        // Show verification
        console.log('\nVerification:');
        for (const check of result.verification.checks) {
          const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
          console.log(`  ${icon} ${check.name} — ${check.detail}`);
        }

        if (result.reportPath) {
          console.log(`\nReport saved: ${result.reportPath}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('scan [path]')
  .description('Scan project and output ProjectSnapshot JSON')
  .action(async (path?: string) => {
    try {
      const targetPath = path ?? process.cwd();
      const snapshot = scan(targetPath);
      console.log(JSON.stringify(snapshot, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('analyze [path]')
  .description('Scan + analyze project and output ProjectProfile JSON')
  .action(async (path?: string) => {
    try {
      const targetPath = path ?? process.cwd();
      const { profile } = analyze(targetPath);
      console.log(JSON.stringify(profile, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('recommend [path]')
  .description('Analyze project and recommend Claude Code tools')
  .option('--catalog <url>', 'Use custom catalog URL')
  .option('--catalog-mode <mode>', 'Catalog mode: extend or replace')
  .action(async (path: string | undefined, options: { catalog?: string; catalogMode?: string }) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar recommend — verbose mode\n');

      timer.start('Analyzing');
      const { profile } = analyze(targetPath);
      timer.end();

      timer.start('Recommending');
      const plan = await recommend(profile, { catalogUrl: options.catalog, catalogMode: options.catalogMode as CatalogMode | undefined, projectRoot: targetPath });
      timer.end(`${plan.recommended.length} tools recommended`);

      console.log(JSON.stringify(plan, null, 2));

      if (verbose) {
        console.log('\n📊 Recommendation details:');
        console.log(`  Language: ${profile.language.primary} (${profile.language.framework ?? 'no framework'})`);
        console.log(`  Pattern: ${profile.structure.pattern}`);
        console.log(`  Recommended: ${plan.recommended.map(r => r.tool.name).join(', ')}`);
        if (plan.excluded.length > 0) {
          console.log(`  Excluded:`);
          for (const e of plan.excluded) {
            console.log(`    - ${e.tool.name}: ${e.reason}`);
          }
        }
        if (plan.conflicts.length > 0) {
          console.log(`  Conflicts:`);
          for (const c of plan.conflicts) {
            console.log(`    - ${c.tools.join(' ↔ ')}: ${c.relation} — ${c.resolution}`);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('status [path]')
  .description('Check current slaminar setup health')
  .action(async (path?: string) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar status — verbose mode\n');

      timer.start('Verifying');
      const result = verify(targetPath);
      timer.end(`${result.checks.length} checks`);

      for (const check of result.checks) {
        const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
        console.log(`${icon} ${check.name} — ${check.detail}`);
      }
      console.log(`\n${result.passCount} pass, ${result.failCount} fail, ${result.warnCount} warn`);
      process.exitCode = result.failCount > 0 ? 2 : result.warnCount > 0 ? 1 : 0;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('update [path]')
  .description('Incremental update — only regenerate changed sections')
  .option('--dry-run', 'Preview changes without writing')
  .action(async (path: string | undefined, options: { dryRun?: boolean }) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar update — verbose mode\n');

      timer.start('Updating');
      const result = await update(targetPath, { dryRun: options.dryRun });
      timer.end(`${result.updatedFiles.length} updated, ${result.newFiles.length} new, ${result.unchangedFiles.length} unchanged`);

      if (options.dryRun) {
        console.log('\n🔍 DRY RUN — no files will be written\n');
      } else {
        console.log('\nslaminar update complete\n');
      }
      if (result.newFiles.length > 0) {
        console.log('New files:');
        for (const f of result.newFiles) console.log(`  ✅ ${f}`);
      }
      if (result.updatedFiles.length > 0) {
        console.log('Updated files:');
        for (const f of result.updatedFiles) console.log(`  🔄 ${f}`);
      }
      if (result.unchangedFiles.length > 0) {
        console.log('Unchanged:');
        for (const f of result.unchangedFiles) console.log(`  ⏭️  ${f}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('uninstall [path]')
  .description('Remove all slaminar-generated files and restore backups')
  .action(async (path?: string) => {
    try {
      const targetPath = path ?? process.cwd();
      const result = uninstall(targetPath);
      console.log('\nslaminar uninstall complete\n');
      if (result.restoredFiles.length > 0) {
        console.log('Restored:');
        for (const f of result.restoredFiles) console.log(`  ↩️  ${f}`);
      }
      if (result.deletedFiles.length > 0) {
        console.log('Deleted:');
        for (const f of result.deletedFiles) console.log(`  🗑️  ${f}`);
      }
      if (result.deletedDirs.length > 0) {
        console.log('Removed directories:');
        for (const f of result.deletedDirs) console.log(`  🗑️  ${f}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('remove <tool>')
  .description('Remove a specific tool from team config')
  .action(async (tool: string) => {
    try {
      const targetPath = process.cwd();
      removeTool(targetPath, tool);
      console.log(`Removed ${tool} from team config`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('check [path]')
  .description('CI validation — non-interactive with exit codes')
  .option('--ci', 'Machine-readable output')
  .option('--json', 'JSON output')
  .action(async (path: string | undefined, options: { ci?: boolean; json?: boolean }) => {
    try {
      const targetPath = path ?? process.cwd();
      const result = runCheck(targetPath);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const check of result.verification.checks) {
          const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
          console.log(`${icon} ${check.name} — ${check.detail}`);
        }
        console.log(`\n${result.summary}`);
      }
      process.exitCode = result.exitCode;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

// ─── Setup & Doctor ──────────────────────────────────────

program
  .command('setup')
  .description('Interactive global setup — AI provider, catalog, defaults, skill, discovery')
  .option('--yes', 'Non-interactive mode (reads SLAMINAR_* env vars)')
  .option('--reconfigure <section>', 'Re-run a single section (auth | catalog | defaults | skill)')
  .option('--apply-to-discovered', 'In --yes mode, apply init/update to every discovered project')
  .option('--no-discovery', 'Skip the optional project discovery step')
  .action(async (options: {
    yes?: boolean;
    reconfigure?: string;
    applyToDiscovered?: boolean;
    discovery?: boolean;
  }) => {
    try {
      const section = options.reconfigure as SetupSection | undefined;
      if (section && !['auth', 'catalog', 'defaults', 'skill'].includes(section)) {
        console.error(
          chalk.red(`\nInvalid section: ${section}. Use one of: auth, catalog, defaults, skill.\n`),
        );
        process.exitCode = 1;
        return;
      }
      await runSetupWizard({
        yes: options.yes,
        reconfigureSection: section,
        applyToDiscovered: options.applyToDiscovered,
        noDiscovery: options.discovery === false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('User force closed')) {
        console.error(`\nError: ${message}\n`);
      }
      process.exitCode = 1;
    }
  });

program
  .command('doctor')
  .description('Read-only diagnostic — environment, auth, catalog, skill, defaults')
  .option('--json', 'Emit machine-readable JSON output')
  .action((options: { json?: boolean }) => {
    try {
      const result = runDoctor();
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(formatDoctorReport(result));
      }
      process.exitCode = doctorExitCode(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

// ─── Discovery (v0.7) ────────────────────────────────────

program
  .command('discover [roots...]')
  .description('Scan user-specified roots for Claude Code projects')
  .option('--json', 'Emit machine-readable JSON output')
  .option('--dry-run', 'When combined with --apply, run init/update in dry-run mode')
  .option('--apply', 'Run init/update on every non-skipped discovered project')
  .option('--only-new', 'With --apply, operate only on projects classified as "new"')
  .option('--no-cache', 'Ignore any existing discovery cache and re-scan')
  .option('--catalog <url>', 'Forward a custom catalog URL to batch-apply')
  .option('--catalog-mode <mode>', 'Forward catalog mode (extend | replace) to batch-apply')
  .action(async (
    roots: string[] | undefined,
    options: {
      json?: boolean;
      dryRun?: boolean;
      apply?: boolean;
      onlyNew?: boolean;
      cache?: boolean;
      catalog?: string;
      catalogMode?: string;
    },
  ) => {
    try {
      const defaults = loadDefaults();
      const providedRoots = (roots && roots.length ? roots : defaults.discovery.lastRoots) ?? [];
      if (providedRoots.length === 0) {
        console.error(
          chalk.red(
            '\nNo roots to scan. Pass them as arguments (e.g. `slaminar discover ~/work ~/projects`) or run `slaminar setup` once to remember them.\n',
          ),
        );
        process.exitCode = 1;
        return;
      }

      const parsed = parseRootsInput(providedRoots);

      const useCache = options.cache !== false;
      const cached = useCache ? loadDiscoveryCache() : null;
      const cacheFresh = cached !== null && isDiscoveryCacheValid(cached);

      let discovery = cacheFresh && cached ? cached.result : null;
      if (!discovery) {
        if (!options.json) console.log(chalk.dim(`\n🔍 Scanning ${parsed.length} root(s)...`));
        discovery = await discoverProjects(parsed, {
          maxDepth: defaults.discovery.maxDepth,
          excludePatterns: defaults.discovery.excludePatterns,
        });
        try {
          saveDiscoveryCache(discovery);
        } catch {
          // non-fatal
        }
        try {
          saveDefaults({
            ...defaults,
            discovery: { ...defaults.discovery, lastRoots: parsed },
          });
        } catch {
          // non-fatal
        }
      } else if (!options.json) {
        console.log(chalk.dim('\n(using cached discovery result — pass `--no-cache` to re-scan)'));
      }

      if (options.json) {
        console.log(JSON.stringify(discovery, null, 2));
      } else {
        console.log(formatDiscoveryTable(discovery));
      }

      if (!options.apply) return;

      if (discovery.projects.length === 0) {
        if (!options.json) console.log(chalk.dim('Nothing to apply — no projects found.\n'));
        return;
      }

      const batch = await batchApply(discovery.projects, {
        dryRun: options.dryRun ?? false,
        onlyNew: options.onlyNew,
        catalogUrl: options.catalog,
        catalogMode: options.catalogMode as CatalogMode | undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(batch, null, 2));
      } else {
        console.log('');
        console.log(
          chalk.bold(
            `Batch ${options.dryRun ? 'dry-run' : 'apply'} complete: ${chalk.green(`${batch.succeeded.length} succeeded`)}, ${chalk.red(`${batch.failed.length} failed`)}, ${chalk.dim(`${batch.skipped.length} skipped`)}`,
          ),
        );
        if (batch.summaryPath) console.log(chalk.dim(`  Audit log: ${batch.summaryPath}\n`));
      }

      if (batch.failed.length > 0) process.exitCode = 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

// ─── Catalog commands ────────────────────────────────────

const catalogCmd = program.command('catalog').description('Manage tool catalog');

catalogCmd.command('update')
  .description('Fetch latest catalog from remote')
  .option('--catalog <url>', 'Use custom catalog URL')
  .option('--catalog-mode <mode>', 'Catalog mode: extend or replace')
  .action(async (options: { catalog?: string; catalogMode?: string }) => {
    try {
      const oldCache = loadCache();
      const oldTools = oldCache?.catalog.tools ?? [];
      const oldVersion = oldCache?.catalog.version ?? '0.0.0';

      if (oldCache) backupCache();

      console.log('\nFetching latest catalog...');
      const resolved = await resolveCatalog({ forceRefresh: true, catalogUrl: options.catalog, catalogMode: options.catalogMode as CatalogMode | undefined, projectRoot: process.cwd() });

      if (resolved.source === 'bundled') {
        console.log(chalk.yellow('\n⚠ Remote fetch failed. Using bundled catalog.\n'));
        return;
      }

      const diff = diffCatalogs(oldTools, resolved.tools, oldVersion, resolved.version);
      console.log(formatDiff(diff));
      console.log(`\nCatalog ${resolved.version} — ${resolved.tools.length} tools (source: ${resolved.source})\n`);
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('list')
  .description('List all tools in catalog')
  .action(async () => {
    try {
      const resolved = await resolveCatalog({ silent: true });
      const table = new Table({
        head: ['Name', 'Category', 'Install', 'Auth', 'Tags'],
      });
      for (const tool of resolved.tools) {
        table.push([
          tool.deprecated ? chalk.strikethrough(tool.name) : tool.name,
          tool.category,
          tool.installMethod,
          tool.authRequired ? chalk.red('YES') : chalk.green('NO'),
          tool.tags.slice(0, 3).join(', '),
        ]);
      }
      console.log(`\nCatalog v${resolved.version} — ${resolved.tools.length} tools (source: ${resolved.source}${resolved.stale ? ', stale' : ''})\n`);
      console.log(table.toString());
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('search <query>')
  .description('Search tools by name, description, or tags')
  .action(async (query: string) => {
    try {
      const resolved = await resolveCatalog({ silent: true });
      const q = query.toLowerCase();
      const matches = resolved.tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
      if (matches.length === 0) {
        console.log(`\nNo tools matching "${query}"\n`);
        return;
      }
      console.log(`\n${matches.length} tool(s) matching "${query}":\n`);
      for (const t of matches) {
        const auth = t.authRequired ? chalk.red(' [auth]') : '';
        console.log(`  ${chalk.bold(t.name)}${auth} — ${t.description}`);
        console.log(`    ${chalk.dim(t.installMethod)} | ${chalk.dim(t.tags.join(', '))}`);
      }
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('check')
  .description('Check for deprecated or expired tools')
  .action(async () => {
    try {
      const resolved = await resolveCatalog({ silent: true });
      const deprecated = resolved.tools.filter(t => t.deprecated);
      if (deprecated.length === 0) {
        console.log(chalk.green('\n✓ No deprecated tools in catalog.\n'));
        return;
      }
      console.log(`\n${chalk.yellow('⚠')} ${deprecated.length} deprecated tool(s):\n`);
      for (const t of deprecated) {
        console.log(`  ${chalk.strikethrough(t.name)} — ${t.deprecatedReason ?? 'No reason provided'}`);
        if (t.replacedBy) console.log(`    → Replace with: ${chalk.bold(t.replacedBy)}`);
      }
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('info <name>')
  .description('Show detailed info for a tool')
  .action(async (name: string) => {
    try {
      const resolved = await resolveCatalog({ silent: true });
      const tool = resolved.tools.find(t => t.name === name);
      if (!tool) {
        console.log(`\nTool "${name}" not found in catalog.\n`);
        process.exitCode = 1;
        return;
      }
      console.log(`\n${chalk.bold(tool.name)}`);
      console.log(`  Repo:         ${tool.repo}`);
      console.log(`  Category:     ${tool.category}`);
      console.log(`  Description:  ${tool.description}`);
      console.log(`  Install:      ${tool.installMethod} — ${tool.installCommands.join('; ')}`);
      console.log(`  Auth:         ${tool.authRequired ? 'Required' : 'Not required'}`);
      console.log(`  Network:      ${tool.networkRequired}`);
      console.log(`  Tags:         ${tool.tags.join(', ')}`);
      console.log(`  Maturity:     ${tool.maturityFit.join(', ')}`);
      if (tool.prerequisites.length) console.log(`  Prerequisites: ${tool.prerequisites.join(', ')}`);
      if (tool.deprecated) console.log(`  ${chalk.red('DEPRECATED')}: ${tool.deprecatedReason ?? ''}`);
      if (tool.replacedBy) console.log(`  Replaced by:  ${tool.replacedBy}`);
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('status')
  .description('Show catalog cache status')
  .action(async () => {
    try {
      const cached = loadCache();
      if (!cached) {
        console.log('\nNo catalog cache. Run `slaminar catalog update` to fetch.\n');
        return;
      }
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      const ageHours = Math.round(age / (1000 * 60 * 60) * 10) / 10;
      const valid = isCacheValid(cached);
      console.log(`\n${chalk.bold('Catalog Cache Status')}`);
      console.log(`  Version:    ${cached.catalog.version}`);
      console.log(`  Source:     ${cached.sourceUrl}`);
      console.log(`  Fetched:    ${cached.fetchedAt} (${ageHours}h ago)`);
      console.log(`  Valid:      ${valid ? chalk.green('yes') : chalk.yellow('expired (will auto-refresh)')}`);
      console.log(`  Tools:      ${cached.catalog.tools.length}`);
      console.log(`  Suggestions:${cached.catalog.suggestions?.length ?? 0}`);
      console.log(`  Relations:  ${cached.catalog.relations?.length ?? 0}`);
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('rollback')
  .description('Restore previous catalog version')
  .action(async () => {
    try {
      if (rollbackCache()) {
        console.log(chalk.green('\n✓ Catalog rolled back to previous version.\n'));
      } else {
        console.log(chalk.yellow('\nNo previous catalog version to restore.\n'));
      }
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

catalogCmd.command('config')
  .description('[deprecated in v0.8 — use `catalog source`] View or set single-URL catalog configuration')
  .option('--url <url>', 'Set custom catalog URL')
  .option('--mode <mode>', 'Set catalog mode: extend or replace')
  .option('--clear', 'Clear custom catalog configuration')
  .action(async (options: { url?: string; mode?: string; clear?: boolean }) => {
    try {
      console.warn(
        chalk.yellow(
          '⚠ `catalog config` is deprecated as of v0.8. Prefer `catalog source add/list/remove/enable/disable` for multi-source management.',
        ),
      );
      const root = process.cwd();
      const config = loadTeamConfig(root);

      if (options.clear) {
        config.catalogUrl = '';
        config.catalogMode = 'replace';
        saveTeamConfig(root, config);
        console.log(chalk.green('\n✓ Catalog configuration cleared.\n'));
        return;
      }

      if (options.url || options.mode) {
        if (options.url) config.catalogUrl = options.url;
        if (options.mode) {
          if (options.mode !== 'extend' && options.mode !== 'replace') {
            console.error(`\nError: --mode must be "extend" or "replace" (got "${options.mode}")\n`);
            process.exitCode = 1;
            return;
          }
          config.catalogMode = options.mode as CatalogMode;
        }
        saveTeamConfig(root, config);
        console.log(chalk.green('\n✓ Catalog configuration saved.\n'));
      }

      // Display current config
      console.log(`\n${chalk.bold('Catalog Configuration')} (.slaminar/config.json)`);
      console.log(`  URL:  ${config.catalogUrl || chalk.dim('(default — official catalog)')}`);
      console.log(`  Mode: ${config.catalogMode}`);
      if (config.catalogMode === 'extend') {
        console.log(`        ${chalk.dim('Custom tools merged with official catalog')}`);
      } else if (config.catalogUrl) {
        console.log(`        ${chalk.dim('Custom catalog replaces official catalog')}`);
      }
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

// ─── Catalog source subcommands (v0.8 multi-source federation) ──

const sourceCmd = catalogCmd
  .command('source')
  .description('Manage multi-source catalog federation (v0.8+)');

sourceCmd
  .command('add <uri>')
  .description('Register a new catalog source (file / URL / github:)')
  .option('--mode <mode>', 'Mode: extend (default) or replace', 'extend')
  .option('--priority <n>', 'Override priority (default: 100 user / 200 project)')
  .option('--scope <scope>', 'Where to store: user (default) or project', 'user')
  .option('--name <id>', 'Custom source id (auto-generated if omitted)')
  .option('--trust <level>', 'Trust: trusted | untrusted (default) | verified')
  .action(async (
    uri: string,
    options: { mode?: string; priority?: string; scope?: string; name?: string; trust?: string },
  ) => {
    try {
      const scope = (options.scope ?? 'user') as PersistentSourceScope;
      if (scope !== 'user' && scope !== 'project') {
        console.error(chalk.red(`\nError: --scope must be "user" or "project" (got "${scope}")\n`));
        process.exitCode = 1;
        return;
      }
      const mode = (options.mode ?? 'extend') as CatalogMode;
      if (mode !== 'extend' && mode !== 'replace') {
        console.error(chalk.red(`\nError: --mode must be "extend" or "replace" (got "${options.mode}")\n`));
        process.exitCode = 1;
        return;
      }
      const trust = (options.trust ?? 'untrusted') as CatalogSource['trust'];
      if (!['trusted', 'untrusted', 'verified'].includes(trust)) {
        console.error(chalk.red(`\nError: --trust must be trusted | untrusted | verified\n`));
        process.exitCode = 1;
        return;
      }
      const priority = options.priority !== undefined ? parseInt(options.priority, 10) : undefined;
      if (priority !== undefined && Number.isNaN(priority)) {
        console.error(chalk.red(`\nError: --priority must be an integer\n`));
        process.exitCode = 1;
        return;
      }
      const projectRoot = scope === 'project' ? process.cwd() : undefined;
      if (scope === 'project' && !existsSync(join(process.cwd(), '.slaminar'))) {
        console.error(
          chalk.red(
            `\nError: scope=project requires a \`.slaminar/\` directory in the current working dir. Run \`slaminar init\` first.\n`,
          ),
        );
        process.exitCode = 1;
        return;
      }
      const src = addSource({ uri, mode, scope, id: options.name, priority, trust, projectRoot });
      console.log(chalk.green(`\n✓ Source added: ${src.id}`));
      console.log(`  uri:      ${src.uri}`);
      console.log(`  scope:    ${src.scope}  priority: ${src.priority}  mode: ${src.mode}  trust: ${src.trust}`);
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

sourceCmd
  .command('list')
  .description('Show every layer (bundled → official → user → project → env)')
  .action(() => {
    try {
      const sources = listAllSources(process.cwd());
      const table = new Table({
        head: [
          chalk.bold('id'),
          chalk.bold('scope'),
          chalk.bold('prio'),
          chalk.bold('mode'),
          chalk.bold('on'),
          chalk.bold('trust'),
          chalk.bold('uri'),
        ],
      });
      for (const s of sources) {
        table.push([
          s.id,
          s.scope,
          s.priority,
          s.mode,
          s.enabled ? chalk.green('yes') : chalk.dim('no'),
          s.trust,
          s.uri.length > 60 ? s.uri.slice(0, 57) + '...' : s.uri,
        ]);
      }
      console.log(`\n${chalk.bold('Catalog sources')} (${sources.length} total — sorted by priority)`);
      console.log(table.toString());
      console.log('');
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

sourceCmd
  .command('remove <idOrUri>')
  .description('Delete a source by id or uri')
  .option('--scope <scope>', 'user (default) or project', 'user')
  .action((identifier: string, options: { scope?: string }) => {
    try {
      const scope = (options.scope ?? 'user') as PersistentSourceScope;
      const projectRoot = scope === 'project' ? process.cwd() : undefined;
      const ok = removeSource({ identifier, scope, projectRoot });
      if (ok) console.log(chalk.green(`\n✓ Removed \`${identifier}\` from ${scope} scope.\n`));
      else {
        console.log(chalk.yellow(`\nNo match for \`${identifier}\` in ${scope} scope.\n`));
        process.exitCode = 1;
      }
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

sourceCmd
  .command('enable <idOrUri>')
  .description('Enable a source')
  .option('--scope <scope>', 'user (default) or project', 'user')
  .action((identifier: string, options: { scope?: string }) => {
    try {
      const scope = (options.scope ?? 'user') as PersistentSourceScope;
      const projectRoot = scope === 'project' ? process.cwd() : undefined;
      const ok = setSourceEnabled(identifier, true, scope, projectRoot);
      if (ok) console.log(chalk.green(`\n✓ Enabled \`${identifier}\`.\n`));
      else console.log(chalk.dim(`\nNo change — already enabled (or not found).\n`));
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

sourceCmd
  .command('disable <idOrUri>')
  .description('Disable a source (kept in config but skipped during resolve)')
  .option('--scope <scope>', 'user (default) or project', 'user')
  .action((identifier: string, options: { scope?: string }) => {
    try {
      const scope = (options.scope ?? 'user') as PersistentSourceScope;
      const projectRoot = scope === 'project' ? process.cwd() : undefined;
      const ok = setSourceEnabled(identifier, false, scope, projectRoot);
      if (ok) console.log(chalk.green(`\n✓ Disabled \`${identifier}\`.\n`));
      else console.log(chalk.dim(`\nNo change — already disabled (or not found).\n`));
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });

sourceCmd
  .command('test <uri>')
  .description('One-shot fetch + schema check for a uri (not persisted)')
  .action(async (uri: string) => {
    try {
      console.log(chalk.dim(`\nFetching ${uri}...`));
      const result = await fetchRemoteCatalog(uri);
      console.log(chalk.green(`✓ Valid — ${result.catalog.tools.length} tools, version ${result.catalog.version}`));
      if (result.etag) console.log(chalk.dim(`  etag: ${result.etag}`));
      console.log('');
    } catch (err) {
      console.error(chalk.red(`\n✗ Fetch failed: ${err instanceof Error ? err.message : String(err)}\n`));
      process.exitCode = 1;
    }
  });

// ─── Skill commands (Claude Code /slaminar skill management) ────────────────

const skillCmd = program.command('skill').description('Manage Claude Code skill installation');

skillCmd
  .command('install')
  .description('Install slaminar as a Claude Code skill at ~/.claude/skills/slaminar/')
  .option('--force', 'Overwrite existing SKILL.md even if content differs')
  .action(async (options: { force?: boolean }) => {
    try {
      const result = installSkill({ force: options.force });
      switch (result.status) {
        case 'installed':
          console.log(chalk.green('\n✓') + ` Skill installed at ${result.path}\n`);
          break;
        case 'updated':
          console.log(chalk.green('\n✓') + ` Skill updated at ${result.path}`);
          if (result.backupPath) {
            console.log(chalk.dim(`  Previous version backed up to ${result.backupPath}`));
          }
          console.log('');
          break;
        case 'unchanged':
          console.log(chalk.dim(`\nSkill already up to date at ${result.path}\n`));
          break;
        case 'failed':
          console.error(chalk.red(`\n✗ ${result.message ?? 'Install failed'}\n`));
          process.exitCode = 1;
          break;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

skillCmd
  .command('uninstall')
  .description('Remove slaminar skill from ~/.claude/skills/slaminar/')
  .action(async () => {
    try {
      const result = uninstallSkill();
      if (result.removed) {
        console.log(chalk.green('\n✓') + ` ${result.message}\n`);
      } else {
        console.log(chalk.dim(`\n${result.message ?? 'Nothing to remove'}\n`));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

skillCmd
  .command('status')
  .description('Show Claude Code skill installation status')
  .action(async () => {
    try {
      const status = getSkillStatus();
      console.log('\n' + chalk.bold('Claude Code Skill Status'));
      console.log(`  Path:      ${getUserSkillPath()}`);
      console.log(`  Installed: ${status.installed ? chalk.green('yes') : chalk.yellow('no')}`);
      if (status.installed) {
        console.log(
          `  Content:   ${status.contentMatches ? chalk.green('matches bundled version') : chalk.yellow('differs from bundled (run `slaminar skill install` to update)')}`,
        );
      }
      console.log(
        `  Bundled:   ${status.bundledAvailable ? chalk.green('available') : chalk.red('missing — reinstall slaminar via npm')}`,
      );
      console.log('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program.parse();
