# Phase 4: Verification & Reporter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add post-placement verification (CLAUDE.md validation, plugin schema check) and terminal reporter with progress display + markdown reports, completing the 7-phase pipeline.

**Architecture:** Verifier validates generated files after placement. Reporter formats pipeline output as terminal tables and saves markdown reports to `.slaminar/reports/`.

**Tech Stack:** TypeScript, vitest, chalk, cli-table3

---

### Task 1: CLAUDE.md Validator

Create `src/validator/claude-md.ts` + test. Validates:
- Commands referenced in CLAUDE.md exist in package.json scripts
- Markdown structure is sound (has headings)
- Slaminar markers are well-formed (matching begin/end)

### Task 2: Plugin Schema Validator

Create `src/validator/plugin-schema.ts` + test. Validates:
- plugin.json is valid JSON with required fields (name, description, version)
- Referenced skill files exist on disk

### Task 3: Verifier Coordinator

Create `src/core/verifier.ts` + test. Runs all validators, produces verification report.

### Task 4: Terminal Reporter

Create `src/reporter/terminal.ts` + test. Formats InitResult as colored terminal output with tables (chalk + cli-table3).

### Task 5: Markdown Reporter

Create `src/reporter/markdown.ts` + test. Generates `.slaminar/reports/YYYY-MM-DD-init.md` report.

### Task 6: Wire into pipeline + CLI

Update pipeline.ts init to run verify + report. Add `status` and `health` CLI commands.
