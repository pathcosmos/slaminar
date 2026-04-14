import { validateClaudeMd } from '../validator/claude-md.js';
import { validatePlugin } from '../validator/plugin-schema.js';
import type { ValidationResult } from '../types/index.js';

export function verify(root: string): ValidationResult {
  const claudeMdResult = validateClaudeMd(root);
  const pluginResult = validatePlugin(root);

  const checks = [...claudeMdResult.checks, ...pluginResult.checks];
  return {
    checks,
    passCount: checks.filter(c => c.status === 'pass').length,
    failCount: checks.filter(c => c.status === 'fail').length,
    warnCount: checks.filter(c => c.status === 'warn').length,
  };
}
