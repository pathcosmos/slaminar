import { execFileSync } from 'node:child_process';

export interface PrerequisiteResult {
  name: string;
  required: string;
  found: boolean;
  version: string | null;
  satisfied: boolean;
}

const VERSION_COMMANDS: Record<string, { cmd: string; args: string[] }> = {
  node: { cmd: 'node', args: ['--version'] },
  python: { cmd: 'python3', args: ['--version'] },
  git: { cmd: 'git', args: ['--version'] },
  uv: { cmd: 'uv', args: ['--version'] },
  volta: { cmd: 'volta', args: ['--version'] },
  npm: { cmd: 'npm', args: ['--version'] },
};

function getVersion(name: string): string | null {
  const spec = VERSION_COMMANDS[name];
  if (!spec) return null;
  try {
    const output = execFileSync(spec.cmd, spec.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
      timeout: 5_000,
    }).trim();
    // Extract version number (e.g., "v20.11.0" → "20.11.0", "Python 3.12.0" → "3.12.0")
    const match = output.match(/(\d+\.\d+(?:\.\d+)?)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function compareVersions(actual: string, required: string): boolean {
  // required format: ">= 18" or ">= 3.10"
  const reqMatch = required.match(/>=?\s*(\d+(?:\.\d+)?)/);
  if (!reqMatch) return true; // no requirement = satisfied
  const reqParts = reqMatch[1].split('.').map(Number);
  const actParts = actual.split('.').map(Number);
  for (let i = 0; i < reqParts.length; i++) {
    if ((actParts[i] ?? 0) > reqParts[i]) return true;
    if ((actParts[i] ?? 0) < reqParts[i]) return false;
  }
  return true; // equal
}

export function checkPrerequisite(name: string, minVersion?: string): PrerequisiteResult {
  const version = getVersion(name);
  const found = version !== null;
  const required = minVersion ?? '';
  const satisfied = found && (!minVersion || compareVersions(version!, minVersion));
  return { name, required, found, version, satisfied };
}

export function checkAllPrerequisites(requirements: string[]): PrerequisiteResult[] {
  return requirements.map(req => {
    const match = req.match(/^(\S+)\s*(>=?\s*\S+)?$/);
    if (!match) return { name: req, required: '', found: false, version: null, satisfied: false };
    const [, name, ver] = match;
    return checkPrerequisite(name, ver?.trim());
  });
}
