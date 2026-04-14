import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PackageInfo } from '../types/index.js';

function readJson(filePath: string): Record<string, unknown> | null {
  try { return JSON.parse(readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

function readText(filePath: string): string | null {
  try { return readFileSync(filePath, 'utf-8'); }
  catch { return null; }
}

function parseTomlValue(content: string, key: string): string | null {
  const match = content.match(new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm'));
  return match?.[1] ?? null;
}

function parsePackageJson(root: string): PackageInfo | null {
  const pkg = readJson(join(root, 'package.json'));
  if (!pkg) return null;
  return {
    manager: 'npm',
    name: (pkg.name as string) ?? null,
    version: (pkg.version as string) ?? null,
    description: (pkg.description as string) ?? null,
    scripts: (pkg.scripts as Record<string, string>) ?? {},
    dependencies: Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
    devDependencies: Object.keys((pkg.devDependencies as Record<string, string>) ?? {}),
    filePath: 'package.json',
  };
}

function parseCargoToml(root: string): PackageInfo | null {
  const content = readText(join(root, 'Cargo.toml'));
  if (!content) return null;
  return {
    manager: 'cargo', name: parseTomlValue(content, 'name'),
    version: parseTomlValue(content, 'version'), description: parseTomlValue(content, 'description'),
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'Cargo.toml',
  };
}

function parsePyprojectToml(root: string): PackageInfo | null {
  const content = readText(join(root, 'pyproject.toml'));
  if (!content) return null;
  return {
    manager: 'pip', name: parseTomlValue(content, 'name'),
    version: parseTomlValue(content, 'version'), description: parseTomlValue(content, 'description'),
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'pyproject.toml',
  };
}

function parseGoMod(root: string): PackageInfo | null {
  const content = readText(join(root, 'go.mod'));
  if (!content) return null;
  const moduleMatch = content.match(/^module\s+(.+)$/m);
  return {
    manager: 'go', name: moduleMatch?.[1]?.trim() ?? null,
    version: null, description: null,
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'go.mod',
  };
}

function parsePomXml(root: string): PackageInfo | null {
  if (!existsSync(join(root, 'pom.xml'))) return null;
  const content = readText(join(root, 'pom.xml'));
  if (!content) return null;
  const nameMatch = content.match(/<artifactId>([^<]+)<\/artifactId>/);
  return {
    manager: 'maven', name: nameMatch?.[1] ?? null,
    version: null, description: null,
    scripts: {}, dependencies: [], devDependencies: [], filePath: 'pom.xml',
  };
}

export function scanPackageInfo(root: string): PackageInfo[] {
  const results: PackageInfo[] = [];
  for (const parser of [parsePackageJson, parseCargoToml, parsePyprojectToml, parseGoMod, parsePomXml]) {
    const result = parser(root);
    if (result) results.push(result);
  }
  return results;
}
