#!/usr/bin/env node
/**
 * npm postinstall hook — installs slaminar's Claude Code skill into
 * `~/.claude/skills/slaminar/` after `npm install -g slaminar`.
 *
 * Safety contract:
 *   - Never throws an uncaught exception.
 *   - Never sets a non-zero exit code. Any failure is a silent warning so
 *     that `npm install` always succeeds.
 *   - Opt-out via `SLAMINAR_SKIP_POSTINSTALL=1` or `CI=true`.
 */

import { installSkill } from './installer.js';

function shouldSkip(): { skip: boolean; reason?: string } {
  if (process.env.SLAMINAR_SKIP_POSTINSTALL === '1') {
    return { skip: true, reason: 'SLAMINAR_SKIP_POSTINSTALL=1' };
  }
  if (process.env.CI && process.env.CI !== 'false' && process.env.CI !== '0') {
    return { skip: true, reason: 'CI environment detected' };
  }
  // npm sets this when the package is installed as a dependency of another
  // package (not the top-level install). Skip to avoid polluting user HOME
  // during transitive installs.
  if (process.env.npm_config_global === 'false' && process.env.INIT_CWD) {
    // Local install by a consumer — still fine to skip.
    return { skip: true, reason: 'local install (not global)' };
  }
  return { skip: false };
}

function main(): void {
  const skipCheck = shouldSkip();
  if (skipCheck.skip) {
    // Silent skip — no need to alarm users.
    return;
  }

  const result = installSkill({ silent: true });

  switch (result.status) {
    case 'installed':
      console.log(`\x1b[32m✓\x1b[0m slaminar Claude Code skill installed at ${result.path}`);
      console.log(`  Next: run \`slaminar init <path>\` in any project — we'll ask what we need.`);
      console.log(`  \x1b[2m(Inside Claude Code you can also say \`/slaminar <path>\`.)\x1b[0m`);
      break;
    case 'updated':
      console.log(`\x1b[32m✓\x1b[0m slaminar skill updated at ${result.path}`);
      if (result.backupPath) {
        console.log(`  Previous version backed up to ${result.backupPath}`);
      }
      break;
    case 'unchanged':
      // Idempotent run — stay quiet.
      break;
    case 'skipped':
      // Reserved for future use.
      break;
    case 'failed':
      console.warn(
        `\x1b[33m⚠\x1b[0m slaminar skill auto-install skipped: ${result.message ?? 'unknown error'}`,
      );
      console.warn(`  You can retry with: slaminar skill install`);
      break;
  }
}

try {
  main();
} catch (err) {
  // Last-resort safety net — never fail npm install.
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`\x1b[33m⚠\x1b[0m slaminar postinstall skipped: ${message}`);
}

// Always exit 0.
process.exit(0);
