import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ValidationCheck, ValidationResult } from '../types/index.js';

export function validateClaudeMd(root: string): ValidationResult {
  const checks: ValidationCheck[] = [];

  const claudeMdPath = join(root, 'CLAUDE.md');
  const fileExists = existsSync(claudeMdPath);

  // 1. File exists
  checks.push({
    name: 'file-exists',
    status: fileExists ? 'pass' : 'fail',
    detail: fileExists ? 'CLAUDE.md found' : 'CLAUDE.md not found at project root',
  });

  if (!fileExists) {
    return buildResult(checks);
  }

  const content = readFileSync(claudeMdPath, 'utf-8');

  // 2. Has headings
  const hasHeadings = /^## /m.test(content);
  checks.push({
    name: 'has-headings',
    status: hasHeadings ? 'pass' : 'fail',
    detail: hasHeadings ? 'Contains ## headings' : 'No ## headings found',
  });

  // 3. Markers well-formed
  // Strip fenced + inline code regions before scanning so that literal marker
  // strings used in documentation (e.g. `<!-- slaminar:begin:SECTION -->`)
  // don't register as unmatched markers.
  const markerScanContent = stripCodeRegions(content);
  const beginRegex = /<!--\s*slaminar:begin:(\S+)\s*-->/g;
  const endRegex = /<!--\s*slaminar:end:(\S+)\s*-->/g;

  const begins = Array.from(markerScanContent.matchAll(beginRegex), (m) => m[1]);
  const ends = Array.from(markerScanContent.matchAll(endRegex), (m) => m[1]);
  let match: RegExpExecArray | null;

  const unmatchedBegins = begins.filter(b => !ends.includes(b));
  const unmatchedEnds = ends.filter(e => !begins.includes(e));
  const markersOk = unmatchedBegins.length === 0 && unmatchedEnds.length === 0;

  if (begins.length === 0 && ends.length === 0) {
    checks.push({
      name: 'markers-well-formed',
      status: 'pass',
      detail: 'No slaminar markers found (none required)',
    });
  } else {
    checks.push({
      name: 'markers-well-formed',
      status: markersOk ? 'pass' : 'fail',
      detail: markersOk
        ? `All ${begins.length} marker(s) properly paired`
        : `Mismatched markers: unmatched begins=[${unmatchedBegins.join(',')}] ends=[${unmatchedEnds.join(',')}]`,
    });
  }

  // 4. Commands valid
  const npmRunRegex = /npm run (\S+)/g;
  const commands: string[] = [];
  while ((match = npmRunRegex.exec(content)) !== null) {
    // Strip trailing backtick/punctuation
    commands.push(match[1].replace(/[`'".,;)}\]]+$/, ''));
  }

  if (commands.length === 0) {
    checks.push({
      name: 'commands-valid',
      status: 'pass',
      detail: 'No npm run commands referenced',
    });
  } else {
    // Read package.json scripts
    const pkgPath = join(root, 'package.json');
    let scripts: Record<string, string> = {};
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        scripts = pkg.scripts || {};
      } catch {
        // ignore parse errors
      }
    }

    const missing = commands.filter(cmd => !(cmd in scripts));
    if (missing.length === 0) {
      checks.push({
        name: 'commands-valid',
        status: 'pass',
        detail: `All ${commands.length} npm run command(s) found in package.json`,
      });
    } else {
      checks.push({
        name: 'commands-valid',
        status: 'warn',
        detail: `Commands not in package.json scripts: ${missing.join(', ')}`,
      });
    }
  }

  return buildResult(checks);
}

function buildResult(checks: ValidationCheck[]): ValidationResult {
  return {
    checks,
    passCount: checks.filter(c => c.status === 'pass').length,
    failCount: checks.filter(c => c.status === 'fail').length,
    warnCount: checks.filter(c => c.status === 'warn').length,
  };
}

/**
 * Replace fenced and inline code regions with spaces (newlines preserved) so
 * that literal marker-like strings used in documentation don't trip regex
 * scanners that look for real slaminar markers.
 */
function stripCodeRegions(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
}
