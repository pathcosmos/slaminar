import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyze } from './pipeline.js';
import { recommend } from '../recommender/recommender.js';
import { buildPlan } from '../planner/planner.js';
import { backupFile, readManifest, writeManifest } from '../placer/backup.js';
import { mergeWithMarkers } from '../placer/markers.js';
import { writeTargets } from '../placer/writer.js';

export interface UpdateResult {
  updatedFiles: string[];
  unchangedFiles: string[];
  newFiles: string[];
}

export function update(targetPath: string): UpdateResult {
  const { snapshot, profile } = analyze(targetPath);
  const recommendation = recommend(profile);
  const plan = buildPlan(profile, snapshot, recommendation);

  const updatedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  const newFiles: string[] = [];

  const manifest = readManifest(snapshot.root);

  for (const target of plan.targets) {
    const fullPath = join(snapshot.root, target.path);

    if (!existsSync(fullPath)) {
      // New file
      writeTargets(snapshot.root, [target]);
      newFiles.push(target.path);
      continue;
    }

    const existing = readFileSync(fullPath, 'utf-8');
    let newContent: string;

    if (target.mode === 'merge') {
      newContent = mergeWithMarkers(existing, target.content);
    } else {
      newContent = target.content;
    }

    if (existing === newContent) {
      unchangedFiles.push(target.path);
    } else {
      const record = backupFile(snapshot.root, target.path);
      manifest.push(record);
      writeTargets(snapshot.root, [{ ...target, content: newContent, mode: 'create' }]);
      updatedFiles.push(target.path);
    }
  }

  if (updatedFiles.length > 0) {
    writeManifest(snapshot.root, manifest);
  }

  return { updatedFiles, unchangedFiles, newFiles };
}
