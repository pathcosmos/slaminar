import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { AiFile } from '../types/index.js';

function countLines(filePath: string): number {
  try { return readFileSync(filePath, 'utf-8').split('\n').length; }
  catch { return 0; }
}

export function scanAiFiles(root: string): AiFile[] {
  const files: AiFile[] = [];

  const claudeMd = join(root, 'CLAUDE.md');
  if (existsSync(claudeMd)) {
    files.push({ type: 'claude-md', path: 'CLAUDE.md', lineCount: countLines(claudeMd) });
  }

  const claudeDir = join(root, '.claude');
  if (existsSync(claudeDir)) {
    for (const name of ['settings.json', 'settings.local.json']) {
      const p = join(claudeDir, name);
      if (existsSync(p)) {
        files.push({ type: 'claude-settings', path: `.claude/${name}`, lineCount: countLines(p) });
      }
    }

    const pluginsDir = join(claudeDir, 'plugins');
    if (existsSync(pluginsDir)) {
      try {
        for (const entry of readdirSync(pluginsDir)) {
          const pluginJson = join(pluginsDir, entry, 'plugin.json');
          if (existsSync(pluginJson)) {
            files.push({ type: 'claude-plugin', path: `.claude/plugins/${entry}/plugin.json`, lineCount: countLines(pluginJson) });
          }
        }
      } catch { /* permission error */ }
    }
  }

  return files;
}
