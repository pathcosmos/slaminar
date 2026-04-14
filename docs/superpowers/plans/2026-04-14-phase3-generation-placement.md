# Phase 3: Generation & Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Build slaminar's file generation and placement system so that `slaminar init` produces a tailored CLAUDE.md, Claude Code plugin, backs up existing files, and places generated files — completing the core pipeline.

**Architecture:** Planner assembles a GenerationPlan from profile + recommendations. Generator produces file contents (local mode only in Phase 3). Placer backs up existing files with obfuscated names, then writes generated files. Ownership markers track slaminar-generated sections in CLAUDE.md.

**Tech Stack:** TypeScript (ESM), vitest, Node.js crypto (for backup hash names)

---

## File Structure

```
src/
├── types/index.ts                        # Add generation types
├── planner/
│   └── planner.ts                        # Build generation plan
├── generator/
│   ├── claude-md.ts                      # CLAUDE.md content generation
│   └── claude-plugin.ts                  # plugin.json + skills generation
├── placer/
│   ├── backup.ts                         # Obfuscated backup
│   ├── markers.ts                        # Ownership markers
│   └── writer.ts                         # File placement
├── core/
│   └── pipeline.ts                       # Add init (full pipeline)
└── cli.ts                                # Add init command
tests/
├── generator/
│   ├── claude-md.test.ts
│   └── claude-plugin.test.ts
├── placer/
│   ├── backup.test.ts
│   └── markers.test.ts
└── planner/
    └── planner.test.ts
```

---

### Task 1: Generation Types

Add to src/types/index.ts:

```typescript
// ─── Generation types ──────────────────────────────────────

export interface GenerationTarget {
  path: string;
  content: string;
  mode: 'create' | 'merge';
}

export interface BackupRecord {
  originalPath: string;
  backupPath: string;
  timestamp: number;
}

export interface GenerationPlan {
  targets: GenerationTarget[];
  backups: BackupRecord[];
  toolInstalls: { tool: string; commands: string[] }[];
}
```

---

### Task 2: CLAUDE.md Generator

Create `src/generator/claude-md.ts` — generates CLAUDE.md content from ProjectProfile with ownership markers.

Function: `generateClaudeMd(profile: ProjectProfile, snapshot: ProjectSnapshot): string`

Output structure:
```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- slaminar:begin:overview -->
## Overview
{project description}
<!-- slaminar:end:overview -->

<!-- slaminar:begin:build-commands -->
## Build & Development Commands
{from package.json scripts}
<!-- slaminar:end:build-commands -->

<!-- slaminar:begin:architecture -->
## Architecture
{pattern, layout, entry points}
<!-- slaminar:end:architecture -->

<!-- slaminar:begin:conventions -->
## Conventions
{naming, test framework, linter, commit style}
<!-- slaminar:end:conventions -->
```

Tests: verify markers present, verify scripts extracted, verify architecture section matches profile.

---

### Task 3: Claude Plugin Generator

Create `src/generator/claude-plugin.ts` — generates plugin.json and skill files.

Function: `generatePlugin(profile: ProjectProfile, snapshot: ProjectSnapshot): GenerationTarget[]`

Generates:
- `.claude/plugins/slaminar-generated/plugin.json`
- `.claude/plugins/slaminar-generated/skills/dev.md` (build/test/lint workflow)

Tests: verify plugin.json is valid JSON, verify skill references correct commands.

---

### Task 4: Backup System

Create `src/placer/backup.ts` — backs up files with obfuscated names.

Functions:
- `backupFile(root: string, relativePath: string): BackupRecord` — backup a single file
- `restoreFile(root: string, record: BackupRecord): void` — restore from backup
- `readManifest(root: string): BackupRecord[]` — read backup manifest
- `writeManifest(root: string, records: BackupRecord[]): void` — write backup manifest

Backup path: `.slaminar/.bk/{hex6}_{timestamp}.dat`
Manifest: `.slaminar/.bk/manifest.json`

Tests: backup creates .dat file, restore recovers original, manifest tracks records.

---

### Task 5: Ownership Markers

Create `src/placer/markers.ts` — manages slaminar ownership markers in CLAUDE.md.

Functions:
- `extractMarkedSections(content: string): Map<string, string>` — parse existing markers
- `mergeWithMarkers(existing: string, generated: string): string` — merge preserving user content

Tests: extracts sections, preserves user content outside markers, updates marker content.

---

### Task 6: Planner + Writer + init CLI

Create `src/planner/planner.ts` — builds GenerationPlan.
Create `src/placer/writer.ts` — writes files to disk.
Modify `src/core/pipeline.ts` — add `init` function.
Modify `src/cli.ts` — add `init` command.

`slaminar init` flow:
1. analyze (scan + analyze)
2. recommend
3. plan (build generation plan)
4. generate (produce file contents)
5. place (backup + write)
6. Output summary

---

### Task 7: Integration Verification

Build, test, run `slaminar init` on a temp directory, verify files generated correctly.
