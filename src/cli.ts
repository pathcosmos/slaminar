#!/usr/bin/env node
import { Command } from 'commander';
import { scan } from './core/scanner.js';
import { analyze } from './core/pipeline.js';
import { recommend } from './recommender/recommender.js';

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

program.parse();
