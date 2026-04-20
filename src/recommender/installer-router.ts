/**
 * Install router (v0.9.6) — routes catalog install commands to safe targets
 * so that `slaminar install X` doesn't silently dirty the user's CWD.
 *
 * Routing by installMethod:
 *   git-clone       → clone into `~/.config/slaminar/refs/<tool>/` (not CWD)
 *   npm-global, pip → run globally, no CWD dependency
 *   npm-dev, npm-init, npx → scaffolders; require explicit `--target <path>`
 *   marketplace     → surface a reminder to run `/install-plugin X` inside
 *                     Claude Code (no shell equivalent available)
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { CatalogTool } from '../types/index.js';

export type RoutedAction =
  | 'git-clone-ref'
  | 'npm-global'
  | 'pip-global'
  | 'scaffold'
  | 'marketplace'
  | 'unknown';

export interface RoutedPlan {
  tool: string;
  method: CatalogTool['installMethod'];
  action: RoutedAction;
  cwd: string;
  commands: Array<{ bin: string; args: string[] }>;
  notes: string[];
  /** Set when the plan cannot be executed (e.g. scaffolder without --target). */
  blocked?: string;
}

export interface RouteOptions {
  target?: string;
  refDir?: string;
}

export function defaultRefDir(): string {
  return join(homedir(), '.config', 'slaminar', 'refs');
}

function parseCommand(cmd: string): { bin: string; args: string[] } {
  const parts = cmd.trim().split(/\s+/);
  return { bin: parts[0] ?? '', args: parts.slice(1) };
}

function parseGitCloneUrl(cmd: string): string | null {
  const m = cmd.match(/git\s+clone\s+(\S+?)(?:\.git)?(?:\s|$)/);
  return m ? m[1] : null;
}

export function routeInstall(tool: CatalogTool, opts: RouteOptions = {}): RoutedPlan {
  const refDir = opts.refDir ?? defaultRefDir();
  const firstCmd = tool.installCommands[0] ?? '';

  if (tool.installMethod === 'git-clone') {
    const url = parseGitCloneUrl(firstCmd);
    const dest = join(refDir, tool.name);
    const notes = [`cloning into ${dest} (kept out of your working tree)`];
    if (!url) {
      return {
        tool: tool.name,
        method: tool.installMethod,
        action: 'git-clone-ref',
        cwd: process.cwd(),
        commands: [],
        notes,
        blocked: `could not parse clone URL from: ${firstCmd}`,
      };
    }
    return {
      tool: tool.name,
      method: tool.installMethod,
      action: 'git-clone-ref',
      cwd: process.cwd(),
      commands: [{ bin: 'git', args: ['clone', url, dest] }],
      notes,
    };
  }

  if (tool.installMethod === 'npm-global' || tool.installMethod === 'pip') {
    const action: RoutedAction = tool.installMethod === 'pip' ? 'pip-global' : 'npm-global';
    return {
      tool: tool.name,
      method: tool.installMethod,
      action,
      cwd: process.cwd(),
      commands: tool.installCommands.map(parseCommand),
      notes: ['global install — CWD-independent'],
    };
  }

  if (
    tool.installMethod === 'npm-dev' ||
    tool.installMethod === 'npm-init' ||
    tool.installMethod === 'npx'
  ) {
    if (!opts.target) {
      return {
        tool: tool.name,
        method: tool.installMethod,
        action: 'scaffold',
        cwd: process.cwd(),
        commands: [],
        notes: [],
        blocked: `${tool.installMethod} scaffolders modify their CWD — pass --target <path>`,
      };
    }
    return {
      tool: tool.name,
      method: tool.installMethod,
      action: 'scaffold',
      cwd: opts.target,
      commands: tool.installCommands.map(parseCommand),
      notes: [`scaffolding into ${opts.target}`],
    };
  }

  if (tool.installMethod === 'marketplace') {
    return {
      tool: tool.name,
      method: tool.installMethod,
      action: 'marketplace',
      cwd: process.cwd(),
      commands: [],
      notes: [`run \`${firstCmd}\` inside Claude Code — no shell equivalent`],
      blocked: 'marketplace plugins install through Claude Code, not the shell',
    };
  }

  return {
    tool: tool.name,
    method: tool.installMethod,
    action: 'unknown',
    cwd: process.cwd(),
    commands: [],
    notes: [],
    blocked: `unrecognised installMethod: ${tool.installMethod}`,
  };
}

export interface ExecResult {
  tool: string;
  plan: RoutedPlan;
  success: boolean;
  output: string;
  error?: string;
}

export interface ExecOptions {
  dryRun?: boolean;
  timeoutMs?: number;
}

export function executePlan(plan: RoutedPlan, opts: ExecOptions = {}): ExecResult {
  if (plan.blocked) {
    return { tool: plan.tool, plan, success: false, output: '', error: plan.blocked };
  }
  if (opts.dryRun) {
    const preview = plan.commands
      .map(({ bin, args }) => `${bin} ${args.join(' ')}`)
      .join('\n');
    return { tool: plan.tool, plan, success: true, output: `(dry-run) ${preview}` };
  }

  if (plan.action === 'git-clone-ref') {
    mkdirSync(dirname(join(plan.commands[0]?.args[2] ?? '.', '_')), { recursive: true });
    const dest = plan.commands[0]?.args[2];
    if (dest && existsSync(dest)) {
      return {
        tool: plan.tool,
        plan,
        success: true,
        output: `already cloned at ${dest} — skipped`,
      };
    }
  }

  const outputs: string[] = [];
  for (const { bin, args } of plan.commands) {
    try {
      const out = execFileSync(bin, args, {
        cwd: plan.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8',
        timeout: opts.timeoutMs ?? 180_000,
      });
      outputs.push(out.trim());
    } catch (err) {
      return {
        tool: plan.tool,
        plan,
        success: false,
        output: outputs.join('\n'),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  return { tool: plan.tool, plan, success: true, output: outputs.join('\n') };
}

export function auditLogPath(): string {
  return join(homedir(), '.config', 'slaminar', 'install-audit.jsonl');
}

export function appendAudit(result: ExecResult): void {
  const path = auditLogPath();
  mkdirSync(dirname(path), { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    tool: result.tool,
    action: result.plan.action,
    method: result.plan.method,
    cwd: result.plan.cwd,
    success: result.success,
    error: result.error,
  });
  appendFileSync(path, line + '\n');
}
