import { verify } from '../core/verifier.js';
import type { ValidationResult } from '../types/index.js';

export interface CheckResult {
  exitCode: number;
  summary: string;
  verification: ValidationResult;
}

export function runCheck(root: string): CheckResult {
  const verification = verify(root);

  let exitCode = 0;
  if (verification.failCount > 0) exitCode = 2;
  else if (verification.warnCount > 0) exitCode = 1;

  const summary = `${verification.passCount} pass, ${verification.failCount} fail, ${verification.warnCount} warn`;

  return { exitCode, summary, verification };
}
