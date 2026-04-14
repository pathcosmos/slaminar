import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { ValidationCheck, ValidationResult } from '../types/index.js';

const PLUGIN_REL_PATH = '.claude/plugins/slaminar-generated/plugin.json';
const REQUIRED_FIELDS = ['name', 'description', 'version'] as const;

function check(name: string, status: 'pass' | 'fail' | 'warn', detail: string): ValidationCheck {
  return { name, status, detail };
}

export function validatePlugin(root: string): ValidationResult {
  const checks: ValidationCheck[] = [];

  const pluginPath = join(root, PLUGIN_REL_PATH);

  // 1. plugin.json exists
  if (!existsSync(pluginPath)) {
    checks.push(check('plugin.json exists', 'fail', `Not found at ${PLUGIN_REL_PATH}`));
    return tally(checks);
  }
  checks.push(check('plugin.json exists', 'pass', `Found at ${PLUGIN_REL_PATH}`));

  // 2. Valid JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(readFileSync(pluginPath, 'utf-8'));
  } catch {
    checks.push(check('Valid JSON', 'fail', 'plugin.json is not valid JSON'));
    return tally(checks);
  }
  checks.push(check('Valid JSON', 'pass', 'plugin.json is valid JSON'));

  // 3. Required fields
  const missing = REQUIRED_FIELDS.filter(f => !(f in parsed));
  if (missing.length > 0) {
    checks.push(check('Required fields', 'fail', `Missing fields: ${missing.join(', ')}`));
  } else {
    checks.push(check('Required fields', 'pass', 'All required fields present'));
  }

  // 4. Skills directory exists
  const skillsRef = typeof parsed.skills === 'string' ? parsed.skills : './skills';
  const pluginDir = join(root, '.claude/plugins/slaminar-generated');
  const skillsDir = resolve(pluginDir, skillsRef);

  if (!existsSync(skillsDir)) {
    checks.push(check('Skills directory exists', 'fail', `Skills directory not found at ${skillsRef}`));
    return tally(checks);
  }
  checks.push(check('Skills directory exists', 'pass', `Skills directory found at ${skillsRef}`));

  // 5. Skill files exist
  try {
    const mdFiles = readdirSync(skillsDir).filter(f => f.endsWith('.md'));
    if (mdFiles.length === 0) {
      checks.push(check('Skill files exist', 'fail', 'No .md files found in skills directory'));
    } else {
      checks.push(check('Skill files exist', 'pass', `Found ${mdFiles.length} skill file(s)`));
    }
  } catch {
    checks.push(check('Skill files exist', 'fail', 'Could not read skills directory'));
  }

  return tally(checks);
}

function tally(checks: ValidationCheck[]): ValidationResult {
  return {
    checks,
    passCount: checks.filter(c => c.status === 'pass').length,
    failCount: checks.filter(c => c.status === 'fail').length,
    warnCount: checks.filter(c => c.status === 'warn').length,
  };
}
