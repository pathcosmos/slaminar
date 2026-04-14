# Phase 2: Recommendation Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build slaminar's intelligent tool recommendation engine so that `slaminar recommend` analyzes a project and suggests Claude Code ecosystem tools with scoring, conflict detection, and prerequisite checking.

**Architecture:** Recommender reads a catalog of known tools, scores each against the ProjectProfile using multi-dimensional factors, detects conflicts/overlaps, enforces tool count limits by maturity, and outputs a RecommendationPlan. Catalog is a TypeScript data structure (not external file parsing in Phase 2).

**Tech Stack:** TypeScript (ESM), vitest

---

## File Structure

```
src/
├── types/
│   └── index.ts                          # Add recommendation types
├── recommender/
│   ├── catalog.ts                        # Tool catalog data + lookup
│   ├── scorer.ts                         # Multi-dimensional scoring
│   ├── conflict-detector.ts              # Overlap/synergy/conflict detection
│   └── recommender.ts                    # Coordinator: score → filter → limit → output
├── core/
│   └── pipeline.ts                       # Add recommend phase
└── cli.ts                                # Add recommend command
tests/
├── recommender/
│   ├── catalog.test.ts
│   ├── scorer.test.ts
│   ├── conflict-detector.test.ts
│   └── recommender.test.ts
```

---

### Task 1: Recommendation Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add recommendation types to src/types/index.ts**

Append these types at the end of the file:

```typescript
// ─── Recommender types ─────────────────────────────────────

export interface CatalogTool {
  name: string;
  repo: string;
  category: 'plugin' | 'skill' | 'hook' | 'agent' | 'workflow';
  description: string;
  authRequired: boolean;
  networkRequired: 'none' | 'partial' | 'full';
  installMethod: 'marketplace' | 'npx' | 'git-clone' | 'pip';
  installCommands: string[];
  prerequisites: string[];             // e.g., ["node >= 18", "python >= 3.10"]
  tags: string[];                      // e.g., ["frontend", "react", "design"]
  maturityFit: ProjectMaturity[];      // which maturity levels benefit
}

export interface ScoredTool {
  tool: CatalogTool;
  score: number;                       // 0-100
  reasons: string[];                   // why this score
}

export interface ToolConflict {
  tools: [string, string];
  relation: 'synergy' | 'overlap' | 'conflict';
  resolution: string;
  winner?: string;                     // which tool to keep if overlap/conflict
}

export interface RecommendationPlan {
  recommended: ScoredTool[];
  excluded: { tool: CatalogTool; reason: string }[];
  conflicts: ToolConflict[];
  maxTools: number;
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add recommendation engine types"
```

---

### Task 2: Tool Catalog

**Files:**
- Create: `src/recommender/catalog.ts`
- Create: `tests/recommender/catalog.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { getCatalog, findToolByName, getToolsByTag } from '../../src/recommender/catalog.js';

describe('catalog', () => {
  it('returns non-empty catalog', () => {
    const catalog = getCatalog();
    expect(catalog.length).toBeGreaterThan(5);
  });

  it('all tools have required fields', () => {
    for (const tool of getCatalog()) {
      expect(tool.name).toBeTruthy();
      expect(tool.repo).toBeTruthy();
      expect(tool.installMethod).toBeTruthy();
      expect(tool.installCommands.length).toBeGreaterThan(0);
      expect(typeof tool.authRequired).toBe('boolean');
    }
  });

  it('finds tool by name', () => {
    const tool = findToolByName('caveman');
    expect(tool).not.toBeNull();
    expect(tool!.name).toBe('caveman');
  });

  it('returns null for unknown tool', () => {
    expect(findToolByName('nonexistent')).toBeNull();
  });

  it('finds tools by tag', () => {
    const frontendTools = getToolsByTag('frontend');
    expect(frontendTools.length).toBeGreaterThan(0);
    expect(frontendTools.every(t => t.tags.includes('frontend'))).toBe(true);
  });

  it('excludes auth-required tools when filtered', () => {
    const noAuth = getCatalog().filter(t => !t.authRequired);
    expect(noAuth.length).toBeGreaterThan(0);
    expect(noAuth.every(t => !t.authRequired)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement catalog.ts with 12+ tools**

The catalog should include at minimum:
- caveman (token saving, universal)
- planning-with-files (planning, universal)
- impeccable (frontend design)
- playwright-skill (browser testing)
- get-shit-done (spec-driven dev)
- claude-mem (session memory)
- graphify (knowledge graph, pip, partial network)
- cartographer (codebase mapping)
- trailofbits/skills (security)
- everything-claude-code (performance optimization)
- claude-hud (monitoring)
- homunculus (pattern learning)

Each tool entry must have accurate installMethod, installCommands, prerequisites, tags, and maturityFit.

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 3: Multi-dimensional Scorer

**Files:**
- Create: `src/recommender/scorer.ts`
- Create: `tests/recommender/scorer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { scoreTool } from '../../src/recommender/scorer.js';
import type { CatalogTool, ProjectProfile } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test', description: '', maturity: 'growing',
    language: { primary: 'typescript', secondary: ['css'], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: [], testPattern: null, srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: null, linter: 'eslint', formatter: null, commitStyle: 'conventional', docLanguage: 'ko' },
    dependencies: { total: 20, notable: [{ name: 'react', category: 'ui-framework' }], devTools: ['typescript', 'vite'] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

function makeTool(overrides: Partial<CatalogTool> = {}): CatalogTool {
  return {
    name: 'test-tool', repo: 'user/repo', category: 'skill', description: 'test',
    authRequired: false, networkRequired: 'none', installMethod: 'marketplace',
    installCommands: ['claude plugin install test'], prerequisites: [],
    tags: [], maturityFit: ['early', 'growing', 'mature'],
    ...overrides,
  };
}

describe('scoreTool', () => {
  it('scores higher for matching tags', () => {
    const profile = makeProfile();
    const frontendTool = makeTool({ tags: ['frontend', 'react'] });
    const backendTool = makeTool({ tags: ['backend', 'python'] });
    expect(scoreTool(frontendTool, profile).score).toBeGreaterThan(scoreTool(backendTool, profile).score);
  });

  it('scores zero for auth-required tools', () => {
    const profile = makeProfile();
    const authTool = makeTool({ authRequired: true });
    expect(scoreTool(authTool, profile).score).toBe(0);
  });

  it('scores lower for maturity mismatch', () => {
    const profile = makeProfile({ maturity: 'greenfield' });
    const matureTool = makeTool({ maturityFit: ['mature'] });
    const universalTool = makeTool({ maturityFit: ['greenfield', 'early', 'growing', 'mature'] });
    expect(scoreTool(universalTool, profile).score).toBeGreaterThan(scoreTool(matureTool, profile).score);
  });

  it('provides reasons for score', () => {
    const profile = makeProfile();
    const tool = makeTool({ tags: ['frontend', 'react'] });
    const result = scoreTool(tool, profile);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('scores higher for universal tools', () => {
    const profile = makeProfile();
    const universalTool = makeTool({ tags: ['universal'], maturityFit: ['greenfield', 'early', 'growing', 'mature'] });
    const result = scoreTool(universalTool, profile);
    expect(result.score).toBeGreaterThan(30);
  });
});
```

- [ ] **Step 2: Implement scorer.ts**

Scoring factors (weights):
- Tag match with project characteristics: +20 per match (framework, language, pattern)
- Maturity fit: +15 if project maturity is in maturityFit, 0 if not
- Universal tag: +10 (tools good for all projects)
- Auth required: score = 0 (hard filter)
- No tests + testing tool: +15 bonus
- Has existing CLAUDE.md (2000+ lines) + CLAUDE.md generator: -10 (redundant)

Score range: 0-100, capped.

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 4: Conflict Detector

**Files:**
- Create: `src/recommender/conflict-detector.ts`
- Create: `tests/recommender/conflict-detector.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../src/recommender/conflict-detector.js';
import type { CatalogTool } from '../../src/types/index.js';

function makeTool(name: string, tags: string[] = []): CatalogTool {
  return {
    name, repo: `user/${name}`, category: 'skill', description: name,
    authRequired: false, networkRequired: 'none', installMethod: 'marketplace',
    installCommands: [`install ${name}`], prerequisites: [], tags,
    maturityFit: ['early', 'growing', 'mature'],
  };
}

describe('detectConflicts', () => {
  it('detects overlap between caveman and everything-claude-code', () => {
    const tools = [makeTool('caveman', ['token-saving']), makeTool('everything-claude-code', ['token-saving', 'performance'])];
    const conflicts = detectConflicts(tools);
    expect(conflicts.some(c => c.relation === 'overlap')).toBe(true);
  });

  it('detects synergy between planning-with-files and get-shit-done', () => {
    const tools = [makeTool('planning-with-files', ['planning']), makeTool('get-shit-done', ['spec-driven'])];
    const conflicts = detectConflicts(tools);
    expect(conflicts.some(c => c.relation === 'synergy')).toBe(true);
  });

  it('returns empty for no conflicts', () => {
    const tools = [makeTool('caveman', ['token-saving']), makeTool('impeccable', ['frontend'])];
    const conflicts = detectConflicts(tools);
    expect(conflicts.filter(c => c.relation !== 'synergy')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Implement conflict-detector.ts**

Known conflict/overlap/synergy pairs defined as data. Check all pairs in the recommendation set.

- [ ] **Step 3: Run tests, verify pass**
- [ ] **Step 4: Commit**

---

### Task 5: Recommender Coordinator + CLI

**Files:**
- Create: `src/recommender/recommender.ts`
- Create: `tests/recommender/recommender.test.ts`
- Modify: `src/core/pipeline.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { recommend } from '../../src/recommender/recommender.js';
import type { ProjectProfile } from '../../src/types/index.js';

function makeProfile(overrides: Partial<ProjectProfile> = {}): ProjectProfile {
  return {
    name: 'test', description: '', maturity: 'growing',
    language: { primary: 'typescript', secondary: ['css'], framework: 'react', runtime: 'node', buildTool: 'vite' },
    structure: { pattern: 'spa', entryPoints: [], testPattern: null, srcLayout: 'feature-based' },
    conventions: { naming: 'camelCase', testFramework: null, linter: 'eslint', formatter: null, commitStyle: 'conventional', docLanguage: 'ko' },
    dependencies: { total: 20, notable: [{ name: 'react', category: 'ui-framework' }], devTools: ['typescript'] },
    existingAiContext: { hasClaudeMd: false, claudeMdLines: 0, hasClaudeSettings: false, hasClaudePlugin: false },
    ...overrides,
  };
}

describe('recommend', () => {
  it('returns recommendations for React SPA', () => {
    const plan = recommend(makeProfile());
    expect(plan.recommended.length).toBeGreaterThan(0);
    expect(plan.recommended.length).toBeLessThanOrEqual(plan.maxTools);
  });

  it('excludes auth-required tools', () => {
    const plan = recommend(makeProfile());
    expect(plan.recommended.every(r => !r.tool.authRequired)).toBe(true);
    expect(plan.excluded.some(e => e.reason.includes('auth'))).toBe(true);
  });

  it('limits tools by maturity', () => {
    const earlyPlan = recommend(makeProfile({ maturity: 'early' }));
    const maturePlan = recommend(makeProfile({ maturity: 'mature' }));
    expect(earlyPlan.maxTools).toBeLessThanOrEqual(3);
    expect(maturePlan.maxTools).toBeGreaterThanOrEqual(5);
  });

  it('sorts by score descending', () => {
    const plan = recommend(makeProfile());
    for (let i = 1; i < plan.recommended.length; i++) {
      expect(plan.recommended[i - 1].score).toBeGreaterThanOrEqual(plan.recommended[i].score);
    }
  });

  it('handles greenfield with minimal recommendations', () => {
    const plan = recommend(makeProfile({ maturity: 'greenfield' }));
    expect(plan.recommended.length).toBeLessThanOrEqual(2);
  });

  it('detects conflicts in recommendations', () => {
    const plan = recommend(makeProfile());
    // conflicts array should exist (may be empty)
    expect(Array.isArray(plan.conflicts)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement recommender.ts**

Coordinator flow:
1. Get catalog (filtered: authRequired = false)
2. Score each tool against profile
3. Filter score > 0
4. Sort by score descending
5. Detect conflicts, resolve overlaps (keep higher scorer)
6. Apply maxTools limit by maturity:
   - greenfield: 2
   - early: 3
   - growing: 5
   - mature: 7
7. Return RecommendationPlan

- [ ] **Step 3: Add recommend to pipeline.ts**

Add `recommend` export that calls analyze then recommend.

- [ ] **Step 4: Wire recommend command into CLI**

```typescript
program
  .command('recommend [path]')
  .description('Analyze project and recommend Claude Code tools')
  .action(async (path?: string) => {
    const targetPath = path ?? process.cwd();
    const { profile } = analyze(targetPath);
    const plan = recommend(profile);
    console.log(JSON.stringify(plan, null, 2));
  });
```

- [ ] **Step 5: Test against reference projects**

```bash
npx tsx src/cli.ts recommend /Users/lanco/aidata/temp_git/sincenety
npx tsx src/cli.ts recommend /Users/lanco/aidata/temp_git/mdmizer
```

- [ ] **Step 6: Run full test suite**
- [ ] **Step 7: Commit**

---

### Task 6: Integration Verification

- [ ] **Step 1: Build** — `npm run build`
- [ ] **Step 2: Full test suite** — `npm test`
- [ ] **Step 3: End-to-end tests**
  - sincenety: CLI pattern → get-shit-done, caveman recommended
  - mdmizer: SPA → impeccable, caveman recommended
  - empty dir: greenfield → max 2 tools
- [ ] **Step 4: Final commit**

---

## Phase 2 Completion Criteria

- [ ] `slaminar recommend [path]` — outputs RecommendationPlan JSON
- [ ] Auth-required tools always excluded
- [ ] Tool count limited by maturity
- [ ] Conflicts detected and resolved
- [ ] Scores sorted descending with reasons
- [ ] All tests pass
- [ ] Build succeeds
