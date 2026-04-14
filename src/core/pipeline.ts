import { readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { scan } from './scanner.js';
import { detectLanguage } from '../analyzer/language-detector.js';
import { mapStructure } from '../analyzer/structure-mapper.js';
import { extractConventions } from '../analyzer/convention-extractor.js';
import { analyzeDependencies } from '../analyzer/dependency-analyzer.js';
import { detectMaturity } from '../analyzer/maturity-detector.js';
import { recommend } from '../recommender/recommender.js';
import { buildPlan } from '../planner/planner.js';
import { backupFile, restoreFile, readManifest, writeManifest } from '../placer/backup.js';
import { writeTargets } from '../placer/writer.js';
import { verify } from './verifier.js';
import { generateReport, saveReport } from '../reporter/markdown.js';
import { ensureGitignore, saveTeamConfig, loadTeamConfig } from '../team/config.js';
import type { ProjectSnapshot, ProjectProfile, AiContextSummary, GenerationPlan, RecommendationPlan, ValidationResult } from '../types/index.js';

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

export interface InitResult {
  profile: ProjectProfile;
  recommendation: RecommendationPlan;
  plan: GenerationPlan;
  writtenFiles: string[];
  backedUpFiles: string[];
  verification: ValidationResult;
  reportPath: string;
}

export function init(targetPath: string): InitResult {
  const { snapshot, profile } = analyze(targetPath);
  const recommendation = recommend(profile);
  const plan = buildPlan(profile, snapshot, recommendation);

  // Ensure .slaminar/.gitignore exists
  ensureGitignore(snapshot.root);

  // Save team config with approved tools
  const teamConfig = loadTeamConfig(snapshot.root);
  teamConfig.approvedTools = recommendation.recommended.map(r => r.tool.name);
  saveTeamConfig(snapshot.root, teamConfig);

  // Backup existing files that will be overwritten
  const backedUpFiles: string[] = [];
  const existingManifest = readManifest(snapshot.root);
  for (const target of plan.targets) {
    if (target.mode === 'merge') {
      try {
        const record = backupFile(snapshot.root, target.path);
        existingManifest.push(record);
        backedUpFiles.push(target.path);
      } catch {
        // File may not exist yet, skip backup
      }
    }
  }
  if (backedUpFiles.length > 0) {
    writeManifest(snapshot.root, existingManifest);
  }

  // Write generated files with rollback on failure
  let writtenFiles: string[] = [];
  try {
    writtenFiles = writeTargets(snapshot.root, plan.targets);
  } catch (err) {
    // Rollback: restore backed-up files
    for (const record of existingManifest) {
      try {
        restoreFile(snapshot.root, record);
      } catch { /* best effort */ }
    }
    throw new Error(`Failed to write generated files: ${err instanceof Error ? err.message : String(err)}. Backed-up files have been restored.`);
  }

  // Verify and report (non-critical — don't fail init if these fail)
  let verification;
  try {
    verification = verify(snapshot.root);
  } catch {
    verification = { checks: [], passCount: 0, failCount: 0, warnCount: 0 };
  }

  let reportPath = '';
  try {
    const reportContent = generateReport({ profile, recommendation, plan, writtenFiles, backedUpFiles });
    reportPath = saveReport(snapshot.root, reportContent);
  } catch {
    // Report saving is non-critical
  }

  return { profile, recommendation, plan, writtenFiles, backedUpFiles, verification, reportPath };
}
