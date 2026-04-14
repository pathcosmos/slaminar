import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { scan } from './scanner.js';
import { detectLanguage } from '../analyzer/language-detector.js';
import { mapStructure } from '../analyzer/structure-mapper.js';
import { extractConventions } from '../analyzer/convention-extractor.js';
import { analyzeDependencies } from '../analyzer/dependency-analyzer.js';
import { detectMaturity } from '../analyzer/maturity-detector.js';
import type { ProjectSnapshot, ProjectProfile, AiContextSummary } from '../types/index.js';

function extractDescription(snapshot: ProjectSnapshot): string {
  for (const pkg of snapshot.packages) {
    if (pkg.description) return pkg.description;
  }
  for (const doc of snapshot.docs) {
    if (doc.type === 'readme') {
      try {
        const content = readFileSync(join(snapshot.root, doc.path), 'utf-8');
        const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        if (lines.length > 0) return lines[0].trim().slice(0, 200);
      } catch { /* skip */ }
    }
  }
  return '';
}

function summarizeAiContext(snapshot: ProjectSnapshot): AiContextSummary {
  const claudeMd = snapshot.existingAiFiles.find(f => f.type === 'claude-md');
  return {
    hasClaudeMd: !!claudeMd,
    claudeMdLines: claudeMd?.lineCount ?? 0,
    hasClaudeSettings: snapshot.existingAiFiles.some(f => f.type === 'claude-settings'),
    hasClaudePlugin: snapshot.existingAiFiles.some(f => f.type === 'claude-plugin'),
  };
}

export function analyze(targetPath: string): { snapshot: ProjectSnapshot; profile: ProjectProfile } {
  const snapshot = scan(targetPath);
  const name = snapshot.packages[0]?.name ?? basename(snapshot.root);
  const profile: ProjectProfile = {
    name,
    description: extractDescription(snapshot),
    language: detectLanguage(snapshot),
    structure: mapStructure(snapshot),
    conventions: extractConventions(snapshot),
    dependencies: analyzeDependencies(snapshot),
    maturity: detectMaturity(snapshot),
    existingAiContext: summarizeAiContext(snapshot),
  };
  return { snapshot, profile };
}
