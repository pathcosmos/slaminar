import { execFileSync } from 'node:child_process';
import type { CatalogTool } from '../types/index.js';

export interface InstallResult {
  tool: string;
  success: boolean;
  method: string;
  output: string;
  error?: string;
}

function parseCommand(cmd: string): { bin: string; args: string[] } {
  const parts = cmd.split(/\s+/);
  return { bin: parts[0], args: parts.slice(1) };
}

export function checkToolInstalled(tool: CatalogTool): boolean {
  // Quick heuristic checks
  try {
    // For marketplace: check if plugin dir exists
    if (tool.installMethod === 'marketplace') {
      // Can't check without knowing the project root; return false
      return false;
    }
    // For others: check if the tool binary exists
    execFileSync('which', [tool.name], { stdio: 'pipe', timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

export function installTool(tool: CatalogTool): InstallResult {
  const results: string[] = [];

  for (const cmd of tool.installCommands) {
    const { bin, args } = parseCommand(cmd);
    try {
      const output = execFileSync(bin, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
        timeout: 60_000,
      });
      results.push(output.trim());
    } catch (err) {
      return {
        tool: tool.name,
        success: false,
        method: tool.installMethod,
        output: results.join('\n'),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return {
    tool: tool.name,
    success: true,
    method: tool.installMethod,
    output: results.join('\n'),
  };
}

export function installTools(tools: CatalogTool[]): InstallResult[] {
  return tools.map(tool => {
    if (checkToolInstalled(tool)) {
      return {
        tool: tool.name,
        success: true,
        method: tool.installMethod,
        output: 'Already installed',
      };
    }
    return installTool(tool);
  });
}
