#!/usr/bin/env node
import { Command } from 'commander';
import { scan } from './core/scanner.js';
import { analyze, init } from './core/pipeline.js';
import { recommend } from './recommender/recommender.js';
import { formatInitReport } from './reporter/terminal.js';
import { verify } from './core/verifier.js';
import { update } from './core/updater.js';
import { uninstall, removeTool } from './rollback/uninstaller.js';
import { runCheck } from './ci/check.js';

const program = new Command();

program
  .name('slaminar')
  .description('Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구')
  .version('0.1.0');

program
  .command('init [path]')
  .description('Full pipeline: scan → analyze → recommend → generate → place')
  .action(async (path?: string) => {
    try {
      const targetPath = path ?? process.cwd();
      const result = init(targetPath);
      console.log(formatInitReport(result));

      // Show verification
      console.log('\nVerification:');
      for (const check of result.verification.checks) {
        const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
        console.log(`  ${icon} ${check.name} — ${check.detail}`);
      }

      if (result.reportPath) {
        console.log(`\nReport saved: ${result.reportPath}`);
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
      const targetPath = path ?? process.cwd();
      const { profile } = analyze(targetPath);
      const plan = recommend(profile);
      console.log(JSON.stringify(plan, null, 2));
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
      const targetPath = path ?? process.cwd();
      const result = verify(targetPath);
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
  .action(async (path?: string) => {
    try {
      const targetPath = path ?? process.cwd();
      const result = update(targetPath);
      console.log('\nslaminar update complete\n');
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
