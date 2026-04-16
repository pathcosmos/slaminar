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

export async function update(targetPath: string, options: { dryRun?: boolean } = {}): Promise<UpdateResult> {
  const { snapshot, profile } = analyze(targetPath);
  const recommendation = await recommend(profile);
  const plan = buildPlan(profile, snapshot, recommendation);

  const updatedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  const newFiles: string[] = [];

  if (options.dryRun) {
    for (const target of plan.targets) {
      const fullPath = join(snapshot.root, target.path);

      if (!existsSync(fullPath)) {
        newFiles.push(target.path);
      } else {
        const existing = readFileSync(fullPath, 'utf-8');
        const newContent = target.mode === 'merge'
          ? mergeWithMarkers(existing, target.content)
          : target.content;
        if (existing === newContent) {
          unchangedFiles.push(target.path);
        } else {
          updatedFiles.push(target.path);
        }
      }
    }
    return { updatedFiles, unchangedFiles, newFiles };
  }

  const manifest = readManifest(snapshot.root);
  let manifestDirty = false;

  try {
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
        manifestDirty = true;
        writeTargets(snapshot.root, [{ ...target, content: newContent, mode: 'create' }]);
        updatedFiles.push(target.path);
      }
    }
  } finally {
    if (manifestDirty) {
      writeManifest(snapshot.root, manifest);
    }
  }

  return { updatedFiles, unchangedFiles, newFiles };
}
