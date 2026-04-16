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
import { runLoginWizard } from './auth/wizard.js';
import { loadAuthConfig, clearAuthConfig, getAuthFilePath } from './auth/config.js';
import { runCloudflareDiagnostics, runAnthropicDiagnostics } from './auth/diagnostics.js';
import { detectAiProvider } from './generator/ai-provider.js';
import { resolveCatalog } from './recommender/catalog-resolver.js';
import { loadCache, backupCache, rollbackCache, isCacheValid } from './recommender/catalog-cache.js';
import { diffCatalogs, formatDiff } from './recommender/catalog-diff.js';
import Table from 'cli-table3';

const program = new Command();

program
  .name('slaminar')
  .description('Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구')
  .version('0.1.0')
  .option('-v, --verbose', 'Show detailed output');

program
  .command('init [path]')
  .description('Full pipeline: scan → analyze → recommend → generate → place')
  .option('--dry-run', 'Preview changes without writing')
  .option('--no-ai', 'Disable AI enhancement (use local rules only)')
  .action(async (path: string | undefined, options: { dryRun?: boolean; ai?: boolean }) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar init — verbose mode\n');

      // Inline prompt if AI not configured and user hasn't opted out
      if (options.ai !== false && process.stdin.isTTY) {
        const aiStatus = detectAiProvider();
        if (!aiStatus.available) {
          console.log(chalk.yellow('\n⚠  AI 프로바이더가 설정되지 않았습니다.'));
          console.log(chalk.dim('   설정하면 CLAUDE.md가 AI로 자동 개선됩니다 (Cloudflare 무료 옵션 제공).\n'));
          const { confirm } = await import('@inquirer/prompts');
          const wantSetup = await confirm({
            message: '지금 설정할까요? (건너뛰면 로컬 규칙으로 진행)',
            default: true,
          });
          if (wantSetup) {
            const loginOk = await runLoginWizard();
            if (!loginOk) {
              console.log(chalk.yellow('\n설정을 완료하지 못했습니다. 로컬 모드로 계속 진행합니다.\n'));
            }
          }
        }
      }

      timer.start('Initializing');
      const result = await init(targetPath, { dryRun: options.dryRun, useAi: options.ai });
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
  .action(async (path?: string) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar recommend — verbose mode\n');

      timer.start('Analyzing');
      const { profile } = analyze(targetPath);
      timer.end();

      timer.start('Recommending');
      const plan = await recommend(profile);
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

// ─── Auth commands (login/whoami/logout) ──────────────────

program
  .command('login')
  .description('Set up AI provider (Cloudflare Workers AI or Anthropic Claude)')
  .action(async () => {
    try {
      const ok = await runLoginWizard();
      if (!ok) process.exitCode = 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('User force closed')) {
        console.error(`\nError: ${message}\n`);
      }
      process.exitCode = 1;
    }
  });

program
  .command('whoami')
  .description('Show current AI provider authentication status')
  .action(async () => {
    try {
      const status = detectAiProvider();
      const config = loadAuthConfig();

      if (!status.available) {
        console.log(chalk.yellow('\nNot logged in. Run `slaminar login` to set up AI enhancement.\n'));
        return;
      }

      console.log('');
      console.log(chalk.green('✓') + ` Logged in to ${chalk.bold(status.provider)}`);

      if (status.provider === 'cloudflare' && config?.providers.cloudflare) {
        const cf = config.providers.cloudflare;
        if (cf.accountName) console.log(`  Account:  ${cf.accountName}`);
        console.log(`  Model:    ${cf.model}`);
      } else if (status.provider === 'anthropic' && config?.providers.anthropic) {
        console.log(`  Model:    ${config.providers.anthropic.model}`);
      }
      if (status.source === 'env') {
        console.log(`  Source:   environment variable`);
      } else {
        console.log(`  Config:   ${getAuthFilePath()}`);
      }
      console.log('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('logout')
  .description('Remove stored AI provider credentials')
  .action(async () => {
    try {
      const removed = clearAuthConfig();
      if (removed) {
        console.log(chalk.green('\n✓') + ' Logged out. Auth config removed.\n');
      } else {
        console.log(chalk.dim('\nNo auth config to remove.\n'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

const authCmd = program.command('auth').description('AI provider authentication management');

authCmd
  .command('status')
  .description('Detailed authentication status')
  .action(async () => {
    try {
      const status = detectAiProvider();
      const config = loadAuthConfig();

      console.log('\n' + chalk.bold('━━━ slaminar Authentication Status ━━━━━━━━━━━━━━━━'));
      console.log('');
      if (!status.available) {
        console.log(chalk.yellow('  No AI provider configured.'));
        console.log(chalk.dim('  Run `slaminar login` to set one up.\n'));
        return;
      }
      console.log(`  Active provider: ${chalk.green(status.provider)} ✓`);
      console.log(`  Source: ${status.source}`);
      console.log(`  Model:  ${status.model}`);

      if (config) {
        if (config.providers.cloudflare) {
          const cf = config.providers.cloudflare;
          console.log('');
          console.log('  Cloudflare Workers AI');
          if (cf.accountName) console.log(`    Account:    ${cf.accountName}`);
          console.log(`    Account ID: ${cf.accountId}`);
          console.log(`    Model:      ${cf.model}`);
        }
        if (config.providers.anthropic) {
          console.log('');
          console.log('  Anthropic Claude');
          console.log(`    Model: ${config.providers.anthropic.model}`);
        }
        console.log('');
        console.log(`  Config file: ${getAuthFilePath()}`);
      }
      console.log('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

authCmd
  .command('test')
  .description('Run diagnostic tests on configured AI provider')
  .action(async () => {
    try {
      const config = loadAuthConfig();
      if (!config?.active) {
        console.log(chalk.yellow('\nNo AI provider configured. Run `slaminar login` first.\n'));
        process.exitCode = 1;
        return;
      }

      console.log('\n' + chalk.bold('━━━ AI Provider Diagnostics ━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(`  Provider: ${config.active}\n`);

      let result;
      if (config.active === 'cloudflare' && config.providers.cloudflare) {
        const cf = config.providers.cloudflare;
        result = await runCloudflareDiagnostics(cf.apiToken, cf.accountId, cf.model);
      } else if (config.active === 'anthropic' && config.providers.anthropic) {
        result = await runAnthropicDiagnostics(config.providers.anthropic.apiKey);
      } else {
        console.log(chalk.red('\nConfig is in an invalid state.\n'));
        process.exitCode = 1;
        return;
      }

      for (const c of result.checks) {
        const icon =
          c.status === 'pass' ? chalk.green('✓')
          : c.status === 'skip' ? chalk.yellow('○')
          : chalk.red('✗');
        const elapsed = c.elapsedMs ? chalk.dim(` (${c.elapsedMs}ms)`) : '';
        console.log(`  ${icon} ${c.name}: ${c.detail}${elapsed}`);
      }
      console.log('');
      if (!result.overallPass) process.exitCode = 2;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${message}\n`);
      process.exitCode = 1;
    }
  });

authCmd
  .command('switch <provider>')
  .description('Switch active AI provider (cloudflare|anthropic)')
  .action(async (provider: string) => {
    try {
      const config = loadAuthConfig();
      if (!config) {
        console.log(chalk.yellow('\nNo auth config found. Run `slaminar login` first.\n'));
        process.exitCode = 1;
        return;
      }
      if (provider !== 'cloudflare' && provider !== 'anthropic') {
        console.log(chalk.red(`\nInvalid provider: ${provider}. Use cloudflare or anthropic.\n`));
        process.exitCode = 1;
        return;
      }
      if (!config.providers[provider]) {
        console.log(chalk.yellow(`\n${provider} is not configured. Run \`slaminar login\` to add it.\n`));
        process.exitCode = 1;
        return;
      }
      const { saveAuthConfig } = await import('./auth/config.js');
      saveAuthConfig({ ...config, active: provider, savedAt: new Date().toISOString() });
      console.log(chalk.green(`\n✓ Switched to ${provider}\n`));
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
  .action(async () => {
    try {
      const oldCache = loadCache();
      const oldTools = oldCache?.catalog.tools ?? [];
      const oldVersion = oldCache?.catalog.version ?? '0.0.0';

      if (oldCache) backupCache();

      console.log('\nFetching latest catalog...');
      const resolved = await resolveCatalog({ forceRefresh: true });

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

program.parse();
