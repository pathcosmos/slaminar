#!/usr/bin/env node
import { Command } from 'commander';
import { scan } from './core/scanner.js';
import { analyze, init } from './core/pipeline.js';
import { recommend } from './recommender/recommender.js';
import { formatInitReport } from './reporter/terminal.js';
import { verify } from './core/verifier.js';

const program = new Command();

program
  .name('slaminar')
  .description('Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구')
  .version('0.1.0');

program
  .command('init [path]')
  .description('Full pipeline: scan → analyze → recommend → generate → place')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    const result = init(targetPath);
    console.log(formatInitReport(result));

    // Show verification
    console.log('\nVerification:');
    for (const check of result.verification.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`  ${icon} ${check.name} — ${check.detail}`);
    }

    console.log(`\nReport saved: ${result.reportPath}`);
  });

program
  .command('scan [path]')
  .description('Scan project and output ProjectSnapshot JSON')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    const snapshot = scan(targetPath);
    console.log(JSON.stringify(snapshot, null, 2));
  });

program
  .command('analyze [path]')
  .description('Scan + analyze project and output ProjectProfile JSON')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    const { profile } = analyze(targetPath);
    console.log(JSON.stringify(profile, null, 2));
  });

program
  .command('recommend [path]')
  .description('Analyze project and recommend Claude Code tools')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    const { profile } = analyze(targetPath);
    const plan = recommend(profile);
    console.log(JSON.stringify(plan, null, 2));
  });

program
  .command('status [path]')
  .description('Check current slaminar setup health')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    const result = verify(targetPath);
    for (const check of result.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${check.name} — ${check.detail}`);
    }
    console.log(`\n${result.passCount} pass, ${result.failCount} fail, ${result.warnCount} warn`);
    process.exitCode = result.failCount > 0 ? 2 : result.warnCount > 0 ? 1 : 0;
  });

program.parse();
