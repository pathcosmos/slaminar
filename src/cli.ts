#!/usr/bin/env node
import { Command } from 'commander';
import { scan } from './core/scanner.js';
import { analyze, init, type InitOptions } from './core/pipeline.js';
import { recommend } from './recommender/recommender.js';
import { formatInitReport } from './reporter/terminal.js';
import { PhaseTimer } from './reporter/progress.js';
import { verify } from './core/verifier.js';
import { update } from './core/updater.js';
import { uninstall, removeTool } from './rollback/uninstaller.js';
import { runCheck } from './ci/check.js';

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
  .action(async (path: string | undefined, options: { dryRun?: boolean }) => {
    try {
      const verbose = program.opts().verbose || false;
      const timer = new PhaseTimer(verbose);
      const targetPath = path ?? process.cwd();

      if (verbose) console.log('\nslaminar init — verbose mode\n');

      timer.start('Initializing');
      const result = init(targetPath, { dryRun: options.dryRun });
      timer.end(`${result.writtenFiles.length} files written`);

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
      const plan = recommend(profile);
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
      const result = update(targetPath, { dryRun: options.dryRun });
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

program.parse();
