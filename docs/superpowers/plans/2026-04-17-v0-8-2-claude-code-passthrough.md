# v0.8.2 Claude Code Passthrough Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver v0.8.2 — when invoked via Claude Code's `/slaminar` skill, slaminar produces a local-rules CLAUDE.md that the calling Claude agent enhances in-place. Removes the need for an Anthropic API key inside Claude Code and reuses the user's Max/Pro subscription quality.

**Architecture:** Documentation + SKILL.md workflow change only. The slaminar TypeScript runtime is not modified — the existing `--no-ai` flag, ownership markers, and `slaminar check` command already provide every primitive needed. The caller (outer Claude) becomes the AI enhancer via Edit tool inside marker-bounded sections.

**Tech Stack:** Markdown (SKILL.md + docs + CHANGELOG + READMEs). No runtime code. Version bump in `package.json` + `src/version.ts`. Verified by `npm run build`, `npm test`, and manual CLI smoke.

---

## File Structure

Complete list of files touched and their responsibility:

| File | Status | Purpose |
|---|---|---|
| `src/skill/SKILL.md` | modify | Workflow rewrite: Steps 2/4 add `--no-ai`, Step 5 new (enhancement via Edit), Step 6 new (verify), Step 7 renumbered |
| `docs/getting-started-walkthrough.md` | modify | Add "Claude Code vs Direct CLI" subsection after Phase 1 explaining the two routing paths |
| `CHANGELOG.md` | modify | Prepend v0.8.2 section documenting passthrough, zero core code change, invariants |
| `README.md` | modify | Add Phase 15 entry (Implementation History), D15.1–D15.3 Cross-Reference Index rows, update stats |
| `README.ko.md` | modify | Mirror Phase 15 + D15.1–D15.3 rows (language parity invariant) |
| `CLAUDE.md` | modify (already staged) | Release Policy section (committed together with release — was added earlier in session) |
| `package.json` | modify | `version: "0.8.1"` → `"0.8.2"` |
| `src/version.ts` | modify | `SLAMINAR_VERSION = '0.8.1'` → `'0.8.2'` |

**No new files.** No `src/` TypeScript modules touched. No test files touched (existing 338 tests must continue to pass).

---

## Task 1: Update SKILL.md workflow

**Files:**
- Modify: `src/skill/SKILL.md`

**Goal:** Replace the 5-step workflow block with the new 7-step workflow that forces `--no-ai` and introduces the Step 5 enhancement delegation.

- [ ] **Step 1: Read the current SKILL.md**

Run: `cat src/skill/SKILL.md`
Confirm the current workflow block spans approximately lines 22–53 (Workflow → Other Commands).

- [ ] **Step 2: Replace the workflow block using Edit**

Find this exact `old_string`:

````
## Workflow

### Step 1: Check if the slaminar CLI is available

Run: `which slaminar || npx slaminar --version`

If it is missing, advise the user to install globally: `npm install -g slaminar`.

### Step 2: Dry-run analysis

Run: `slaminar init --dry-run <path>`

Report to the user:
- Project profile (language, framework, pattern, maturity)
- Which files would be generated
- Which tools are recommended and why
- Which tools were excluded and why

### Step 3: Ask the user to proceed

Present the dry-run results and ask:
> "Shall I proceed with this configuration? Let me know if anything should change."

### Step 4: Execute

If approved, run: `slaminar init <path>`

Show the verification output after completion.

### Step 5: (Optional) Install recommended tools

For each recommended tool, ask if the user wants to install it. Run the install commands printed in the recommendation output.
````

Replace with this `new_string`:

````
## Workflow

**Important:** Every pipeline step inside Claude Code passes `--no-ai`. The outer Claude (you) handles enhancement in Step 5 using the agent's own project context — no Anthropic API key or Cloudflare token is required.

### Step 1: Check if the slaminar CLI is available

Run: `which slaminar || npx slaminar --version`

If it is missing, advise the user to install globally: `npm install -g slaminar`.

### Step 2: Dry-run analysis with local rules

Run: `slaminar init --dry-run --no-ai <path>`

Report to the user:
- Project profile (language, framework, pattern, maturity)
- Which files would be generated
- Which tools are recommended and why
- Which tools were excluded and why

### Step 3: Ask the user to proceed

Present the dry-run results and ask:
> "Shall I proceed with this configuration? Let me know if anything should change."

### Step 4: Execute the local-rules pipeline

If approved, run: `slaminar init --no-ai <path>`

This generates CLAUDE.md with slaminar ownership markers using local rules only. No external AI provider is called.

### Step 5: Enhance with your own project context

slaminar has written a rule-based CLAUDE.md. Your job is to raise it to Claude-grade quality using the project context you can see:

1. `Read` `<path>/CLAUDE.md` to see what slaminar generated.
2. `Read` key project files to build understanding: `package.json` / `pyproject.toml` / `Cargo.toml`, src/ entry points, existing docs, recent `git log --oneline -20`.
3. For each section delimited by `<!-- slaminar:begin:SECTION -->` and `<!-- slaminar:end:SECTION -->`, use `Edit` to improve the content. Section-specific guidance:
   - **overview** — replace generic framework labels with the actual domain and purpose you infer from the code
   - **architecture** — add real module relationships and data flows the local rules missed
   - **commands** — list the workflows actually used, not just every `npm run` script
   - **conventions** — extract naming, testing, and lint patterns from real code samples
   - **notes** — flag project-specific quirks, legacy areas, or TODOs worth warning future maintainers about

**Invariants — do not break these:**
- NEVER remove or alter the `<!-- slaminar:begin:X -->` / `<!-- slaminar:end:X -->` marker lines themselves. They are load-bearing for `slaminar update` incremental merges — touching them breaks future regeneration.
- NEVER edit content outside the markers. That region belongs to the human user — slaminar and you must both leave it alone.

### Step 6: Verify

Run: `slaminar check <path>`

Exit code 0 means CLAUDE.md, plugin, and markers are all well-formed. If non-zero, inspect the reported issues and fix them (typically a missing marker or a referenced `npm run` command that doesn't exist).

### Step 7: (Optional) Install recommended tools

For each recommended tool, ask if the user wants to install it. Run the install commands printed in the recommendation output.
````

- [ ] **Step 3: Verify no other `slaminar init` invocations in SKILL.md need `--no-ai`**

Run: `grep -n "slaminar init" src/skill/SKILL.md`

Expected output: three references — two in the workflow (Step 2 + Step 4, both with `--no-ai`) and one in the "Other Commands" section (`slaminar update <path>` — that one correctly stays without `--no-ai` since update is a different command and the user may want their configured provider for non-SKILL-triggered runs).

- [ ] **Step 4: Rebuild so dist/skill/SKILL.md is in sync**

Run: `npm run build`
Expected: `[copy-assets] .../src/skill/SKILL.md → .../dist/skill/SKILL.md`

- [ ] **Step 5: Sanity check the rebuild**

Run: `grep -c "\-\-no\-ai" dist/skill/SKILL.md`
Expected: `2` (Step 2 + Step 4).

---

## Task 2: Update getting-started-walkthrough.md

**Files:**
- Modify: `docs/getting-started-walkthrough.md`

**Goal:** Add a subsection explaining that Claude Code's `/slaminar` skill path uses `--no-ai` + agent enhancement, distinct from direct CLI use.

- [ ] **Step 1: Locate the insertion point**

Run: `grep -n "^## 🧭 Phase 2" docs/getting-started-walkthrough.md`
The new subsection goes immediately before this heading, at the end of Phase 1 content.

- [ ] **Step 2: Insert the subsection**

Use Edit with this `old_string` (the last content inside Phase 1):

```
### 1.4 설치 후 즉시 검증

```bash
slaminar --version           # → 0.8.0
slaminar skill status        # 스킬 설치 상태 확인
```

예상 출력:
```
Claude Code Skill Status
  Path:      ~/.claude/skills/slaminar/SKILL.md
  Installed: yes
  Content:   matches bundled version
  Bundled:   available
```

---

## 🧭 Phase 2: `slaminar setup` — 첫 실행 위자드
```

Replace with this `new_string` (includes version bump to 0.8.2 in the example and adds §1.5):

```
### 1.4 설치 후 즉시 검증

```bash
slaminar --version           # → 0.8.2
slaminar skill status        # 스킬 설치 상태 확인
```

예상 출력:
```
Claude Code Skill Status
  Path:      ~/.claude/skills/slaminar/SKILL.md
  Installed: yes
  Content:   matches bundled version
  Bundled:   available
```

### 1.5 실행 맥락 두 가지 — Claude Code 내부 vs 외부 CLI (v0.8.2+)

slaminar는 **어디서 호출되느냐**에 따라 AI 처리 방식이 달라집니다. 이 차이를 이해하면 API 키가 왜 필요할 수도, 안 필요할 수도 있는지 알 수 있습니다.

| 경로 | 명령 | AI 처리 | API 키 필요 |
|---|---|---|---|
| **(A) Claude Code 내부** | `/slaminar` 스킬 호출 | `--no-ai`로 로컬 규칙 CLAUDE.md 생성 후 **outer Claude(Max/Pro 구독)가 직접 Read/Edit로 enhance** | **없음** ✓ |
| **(B) 외부 CLI 직접** | `$ slaminar init` | 설정된 provider(Cloudflare/Anthropic) 또는 `--no-ai` | provider 설정 시 필요 |

#### 경로 (A) — Claude Code에서

Claude Code에서 `/slaminar`를 입력하면 SKILL.md 워크플로가 실행됩니다. Outer Claude(지금 대화 중인 Claude)가:

1. `slaminar init --dry-run --no-ai <path>` → 분석 미리보기
2. 사용자에게 진행 확인
3. `slaminar init --no-ai <path>` → ownership marker가 박힌 CLAUDE.md 생성 (로컬 규칙)
4. **Read + Edit로 CLAUDE.md 개선** ← 핵심: 실제 코드베이스를 읽고 섹션별로 깊이 있게 보강
5. `slaminar check <path>` → 검증

이 경로는 Anthropic API 키도, Cloudflare 토큰도 필요 없습니다. Claude Code가 이미 실행 중인 자신의 AI 자원을 그대로 재사용합니다.

#### 경로 (B) — 터미널에서 직접

```bash
$ slaminar init ~/my-project
```

이 경로는 Phase 2의 `slaminar setup` 결과(`~/.config/slaminar/auth.json`)를 읽어 설정된 provider로 AI enhancement를 수행합니다. 설정이 없으면 자동 `--no-ai` 모드로 fallback되어 로컬 규칙 CLAUDE.md를 만듭니다.

**둘 다 동일한 CLAUDE.md 포맷**을 생성하며, ownership markers도 양쪽에서 똑같이 작동합니다. 따라서 경로 (A)로 만든 CLAUDE.md를 나중에 터미널에서 `slaminar update`로 갱신해도, 또 그 반대도 완벽히 호환됩니다.

---

## 🧭 Phase 2: `slaminar setup` — 첫 실행 위자드
```

- [ ] **Step 3: Confirm the insertion**

Run: `grep -n "1\.5 실행 맥락" docs/getting-started-walkthrough.md`
Expected: one match returning a single line number.

Run: `grep -c "^### 1\." docs/getting-started-walkthrough.md`
Expected: `5` (originally 4 subsections §1.1–§1.4; now §1.5 added).

---

## Task 3: Add Phase 15 to README.md (English)

**Files:**
- Modify: `README.md`

**Goal:** Insert `### Phase 15: Claude Code Passthrough (v0.8.2)` with decisions D15.1–D15.3, and append three rows to the Cross-Reference Index table.

- [ ] **Step 1: Insert Phase 15 block before the Cross-Reference Index**

Run: `grep -n "^### Cross-Reference Index" README.md`
Note the line number; the Phase 15 block goes directly before it.

Use Edit with this `old_string`:

```
**Cross-refs.** [CHANGELOG v0.8.0](./CHANGELOG.md#080--2026-04-17) · [spec: `2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) + [spec §v0.8](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · tests: `tests/recommender/{catalog-sources,catalog-source-persistence,catalog-merger,catalog-resolver}.test.ts`.

### Cross-Reference Index (v0.5 → v0.8)
```

Replace with this `new_string`:

```
**Cross-refs.** [CHANGELOG v0.8.0](./CHANGELOG.md#080--2026-04-17) · [spec: `2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) + [spec §v0.8](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · tests: `tests/recommender/{catalog-sources,catalog-source-persistence,catalog-merger,catalog-resolver}.test.ts`.

### Phase 15: Claude Code Passthrough (v0.8.2)

**Motivation.** Up to v0.8.1, invoking `/slaminar` inside Claude Code forced users to configure a separate AI provider (Cloudflare or Anthropic) even though an outer Claude agent was already running. This duplicated AI calls and demanded an API key that users with a Max/Pro Claude subscription should never have needed.

**Shipped.**
- `src/skill/SKILL.md` — 7-step workflow rewrite that forces `--no-ai` in Steps 2 and 4 and adds Step 5 (outer Claude enhances in place) and Step 6 (verify with `slaminar check`)
- `docs/getting-started-walkthrough.md` — new §1.5 explaining the two execution contexts
- Core TypeScript code unchanged — this release reuses the existing `--no-ai` flag and ownership marker system

**Decisions.**

- **D15.1 — Force `--no-ai` inside Claude Code; slaminar never calls an external provider from the skill path.** Alternative: let the outer agent decide per-invocation. Rationale: an outer Claude is already the best available model and already running; nested AI calls add latency, cost, and configuration friction for zero marginal quality. Evidence: `src/skill/SKILL.md` Steps 2 & 4 both pass `--no-ai`; `src/cli.ts` `--no-ai` flag handling.
- **D15.2 — Enhancement boundary is slaminar's existing ownership markers.** Alternative: introduce a new "agent-editable region" primitive. Rationale: markers are already load-bearing for `slaminar update` incremental merges and already enforce the "slaminar region vs user region" split. Adding another layer would risk contract drift. Evidence: `src/placer/markers.ts`, `src/core/updater.ts`.
- **D15.3 — SKILL.md is the sole "Claude Code context" carrier; no env-var auto-detection.** Alternative: read `SLAMINAR_AGENT_MODE=1` or inspect parent process to force the passthrough mode. Rationale: SKILL.md already defines "this was invoked via Claude Code" precisely — being inside a Claude Code skill call is exactly the signal we need, no extra channel required. Env-var detection would add false-positive risk without new capability. Evidence: `src/skill/SKILL.md` frontmatter + workflow.

**Cross-refs.** [CHANGELOG v0.8.2](./CHANGELOG.md#082--2026-04-17) · [spec: `2026-04-17-claude-code-passthrough-design.md`](./docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md) · no new tests (existing 338 continue to pass).

### Cross-Reference Index (v0.5 → v0.8)
```

- [ ] **Step 2: Append the D15 rows to the Cross-Reference Index table**

Find this `old_string`:

```
| D14.8 | Stable `cli-adhoc` ID vs hashed env IDs | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
```

Replace with this `new_string`:

```
| D14.8 | Stable `cli-adhoc` ID vs hashed env IDs | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
| D15.1 | Force `--no-ai` in Claude Code context | v0.8.2 | `2026-04-17-claude-code-passthrough-design.md` | `src/skill/SKILL.md` | — |
| D15.2 | Enhancement boundary = ownership markers | v0.8.2 | same | `src/placer/markers.ts`, `src/core/updater.ts` | — |
| D15.3 | SKILL.md carrier, no env-var auto-detection | v0.8.2 | same | `src/skill/SKILL.md` | — |
```

- [ ] **Step 3: Update the heading range "v0.5 → v0.8" to "v0.5 → v0.8.2"**

Find: `### Cross-Reference Index (v0.5 → v0.8)`
Replace with: `### Cross-Reference Index (v0.5 → v0.8.2)`

Run: `grep -c "Cross-Reference Index (v0.5 → v0.8" README.md`
Expected: `1` (the old heading is gone after the edit).

- [ ] **Step 4: Update Project Stats CLI command count**

Run: `grep -n "CLI commands" README.md`

Find the current line that looks like:
```
| CLI commands | 28 |
```

No change needed here — v0.8.2 adds no new CLI commands. Just confirm the value still reads `28`.

---

## Task 4: Mirror Phase 15 into README.ko.md (language parity)

**Files:**
- Modify: `README.ko.md`

**Goal:** Same structural change as Task 3 in Korean. Every D15.x decision ID must appear with the exact same count in both READMEs (enforced by `grep -c`).

- [ ] **Step 1: Insert Phase 15 block before Cross-Reference Index**

Use Edit with this `old_string`:

```
**교차 링크.** [CHANGELOG v0.8.0](./CHANGELOG.md#080--2026-04-17) · [spec: `2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) + [spec §v0.8](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · 테스트: `tests/recommender/{catalog-sources,catalog-source-persistence,catalog-merger,catalog-resolver}.test.ts`.

### 교차 참조 인덱스 (v0.5 → v0.8)
```

Replace with this `new_string`:

```
**교차 링크.** [CHANGELOG v0.8.0](./CHANGELOG.md#080--2026-04-17) · [spec: `2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) + [spec §v0.8](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · 테스트: `tests/recommender/{catalog-sources,catalog-source-persistence,catalog-merger,catalog-resolver}.test.ts`.

### Phase 15: Claude Code Passthrough (v0.8.2)

**동기.** v0.8.1까지 Claude Code에서 `/slaminar`를 호출하면 slaminar가 자체 AI provider(Cloudflare/Anthropic)를 호출해 enhancement를 수행했습니다. 이미 outer Claude(Max/Pro 구독)가 실행 중인데도 별도 API 키 발급을 강요했고, AI 호출이 중첩되어 지연/비용 낭비가 있었습니다.

**산출물.**
- `src/skill/SKILL.md` — 7단계 workflow 재작성: Step 2/4에 `--no-ai` 강제, Step 5(outer Claude가 in-place enhance) 신설, Step 6(`slaminar check` 검증) 신설
- `docs/getting-started-walkthrough.md` — §1.5 "Claude Code 내부 vs 외부 CLI" 두 실행 맥락 설명 추가
- TypeScript 코어 코드 **변경 0** — 기존 `--no-ai` 플래그와 ownership marker 시스템을 그대로 재사용

**의사결정.**

- **D15.1 — Claude Code 맥락에선 `--no-ai` 강제, slaminar가 외부 provider를 호출하지 않음.** 대안: 외부 에이전트가 실행마다 선택. 근거: outer Claude가 이미 최고 품질 모델이며 실행 중인데 중첩 AI 호출은 지연/비용 낭비이고 API 키 설정 마찰까지 유발. 증거: `src/skill/SKILL.md` Step 2와 Step 4 모두 `--no-ai` 전달, `src/cli.ts`의 `--no-ai` 플래그 처리.
- **D15.2 — Enhancement 경계는 slaminar 기존 ownership markers.** 대안: "agent 편집 가능 영역"이라는 새 primitive 도입. 근거: 마커는 이미 `slaminar update` incremental merge에 필수이며 "slaminar 영역 vs 사용자 영역" 구분을 강제하고 있음. 층을 더 쌓으면 contract drift 위험. 증거: `src/placer/markers.ts`, `src/core/updater.ts`.
- **D15.3 — SKILL.md가 "Claude Code 맥락"의 유일한 carrier, env-var 자동 감지 없음.** 대안: `SLAMINAR_AGENT_MODE=1` 읽기 또는 parent process 검사로 passthrough 모드 강제. 근거: SKILL.md는 이미 "Claude Code를 통해 호출됐다"는 정확한 정의 — Claude Code skill 호출 안에 있다는 것 자체가 우리가 필요한 신호이므로 별도 채널 불필요. env-var 감지는 새 기능 없이 false-positive 위험만 추가. 증거: `src/skill/SKILL.md` frontmatter + workflow.

**교차 링크.** [CHANGELOG v0.8.2](./CHANGELOG.md#082--2026-04-17) · [spec: `2026-04-17-claude-code-passthrough-design.md`](./docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md) · 신규 테스트 없음 (기존 338개 계속 통과).

### 교차 참조 인덱스 (v0.5 → v0.8)
```

- [ ] **Step 2: Append the D15 rows to the Korean Cross-Reference Index**

Find this `old_string`:

```
| D14.8 | 고정 `cli-adhoc` ID vs 해시된 env ID | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
```

Replace with this `new_string`:

```
| D14.8 | 고정 `cli-adhoc` ID vs 해시된 env ID | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
| D15.1 | Claude Code 맥락에 `--no-ai` 강제 | v0.8.2 | `2026-04-17-claude-code-passthrough-design.md` | `src/skill/SKILL.md` | — |
| D15.2 | Enhancement 경계 = ownership markers | v0.8.2 | same | `src/placer/markers.ts`, `src/core/updater.ts` | — |
| D15.3 | SKILL.md가 carrier, env-var 자동 감지 없음 | v0.8.2 | same | `src/skill/SKILL.md` | — |
```

- [ ] **Step 3: Update the heading range**

Find: `### 교차 참조 인덱스 (v0.5 → v0.8)`
Replace with: `### 교차 참조 인덱스 (v0.5 → v0.8.2)`

- [ ] **Step 4: Verify parity between READMEs**

Run:
```bash
for id in D15.1 D15.2 D15.3; do
  en=$(grep -c "$id" README.md)
  ko=$(grep -c "$id" README.ko.md)
  echo "$id: en=$en ko=$ko"
  [ "$en" = "$ko" ] || echo "MISMATCH"
done
```
Expected output: each `$id` line shows `en=2 ko=2` (once in Phase 15 block, once in the Cross-Reference Index table). No `MISMATCH` lines.

---

## Task 5: Add CHANGELOG v0.8.2 entry

**Files:**
- Modify: `CHANGELOG.md`

**Goal:** Prepend a new `[0.8.2]` section immediately after the top-of-file preamble and before the existing `[0.8.1]` section.

- [ ] **Step 1: Insert the v0.8.2 section**

Use Edit with this `old_string`:

```
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.1] — 2026-04-17
```

Replace with this `new_string`:

```
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.2] — 2026-04-17

### Added — Claude Code Passthrough via SKILL.md

When invoked through Claude Code's `/slaminar` skill, slaminar now produces a local-rules CLAUDE.md and the calling Claude agent enhances it in place. No external AI provider is called from the skill path; users with a Max/Pro Claude subscription can use slaminar without configuring any API key.

**SKILL.md Workflow rewrite (`src/skill/SKILL.md`):**
- Step 2 (dry-run) now passes `--no-ai`
- Step 4 (execute) now passes `--no-ai`
- Step 5 is new: outer Claude uses `Read` to load the generated CLAUDE.md and relevant project files, then uses `Edit` to improve content inside `<!-- slaminar:begin:SECTION -->` ... `<!-- slaminar:end:SECTION -->` blocks
- Step 6 is new: `slaminar check <path>` verifies marker integrity + CLAUDE.md well-formedness
- Step 7 (install recommended tools) is the renumbered original Step 5

**Documentation (`docs/getting-started-walkthrough.md`):**
- New §1.5 "실행 맥락 두 가지 — Claude Code 내부 vs 외부 CLI" explaining the two routing paths and when an API key is (or isn't) required

**Enhancement invariants:**
- Ownership markers are load-bearing for `slaminar update` incremental merges — the outer Claude never modifies the marker lines themselves
- Content outside markers is user-owned — the outer Claude never edits it
- Direct CLI use (`slaminar init` from terminal) is unchanged: provider flow (Cloudflare/Anthropic) or local fallback per the `~/.config/slaminar/auth.json` state produced by `slaminar setup`

### Changed

- `package.json`, `src/version.ts` bumped 0.8.1 → 0.8.2 (patch only per project release policy recorded 2026-04-17)
- `CLAUDE.md` — added "Release Policy" section documenting the patch-only versioning rule

### Not Changed (deliberate)

- No TypeScript source files modified (0 lines of runtime code changed)
- No new tests added (existing 338 tests continue to pass unchanged — this release is content/doc only)
- No breaking changes

### Stats

- 61 source modules, 55 test files, **338 tests passing** (unchanged from v0.8.1)
- Package size unchanged (SKILL.md content change only)
- Design spec: [`docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md`](./docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md)

[0.8.2]: https://github.com/pathcosmos/slaminar/compare/v0.8.1...v0.8.2

## [0.8.1] — 2026-04-17
```

- [ ] **Step 2: Verify ordering and link presence**

Run: `head -40 CHANGELOG.md | grep -E "^## \[0\.|^### "`
Expected first three headings: `## [0.8.2] — 2026-04-17`, `### Added — Claude Code Passthrough via SKILL.md`, `### Changed`.

Run: `grep -c "\[0.8.2\]:" CHANGELOG.md`
Expected: `1` (the new compare link).

---

## Task 6: Version bump

**Files:**
- Modify: `package.json`
- Modify: `src/version.ts`

**Goal:** Bump the patch segment from 0.8.1 to 0.8.2 in both sources of truth.

- [ ] **Step 1: Bump package.json**

Use Edit:
- `old_string`: `  "version": "0.8.1",`
- `new_string`: `  "version": "0.8.2",`

- [ ] **Step 2: Bump src/version.ts**

Use Edit:
- `old_string`: `export const SLAMINAR_VERSION = '0.8.1';`
- `new_string`: `export const SLAMINAR_VERSION = '0.8.2';`

- [ ] **Step 3: Confirm both bumped**

Run: `node -e "console.log(require('./package.json').version)" && grep SLAMINAR_VERSION src/version.ts`
Expected:
```
0.8.2
export const SLAMINAR_VERSION = '0.8.2';
```

---

## Task 7: Full verification before commit

**Files:** (read-only checks)

**Goal:** Confirm nothing regressed. No code changed but tsc must still type-check, build must still succeed, and all 338 tests must still pass.

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 2: Build (also copies SKILL.md into dist/)**

Run: `npm run build`
Expected output includes: `[copy-assets] .../src/skill/SKILL.md → .../dist/skill/SKILL.md`.

- [ ] **Step 3: Test suite**

Run: `npm test -- --run 2>&1 | tail -6`
Expected tail:
```
 Test Files  55 passed (55)
      Tests  338 passed (338)
```

- [ ] **Step 4: SKILL.md content check**

Run: `grep -c "\-\-no\-ai" src/skill/SKILL.md dist/skill/SKILL.md`
Expected: both files return `4` (Workflow intro note + Step 2 command + Step 4 command + pre-existing Flags section line).

Also run: `grep -n "^Run: \`slaminar init.*--no-ai" src/skill/SKILL.md`
Expected: exactly 2 matches — the Step 2 dry-run and the Step 4 execute command lines.

- [ ] **Step 5: Korean/English parity check**

Run:
```bash
for id in D15.1 D15.2 D15.3; do
  en=$(grep -c "$id" README.md)
  ko=$(grep -c "$id" README.ko.md)
  [ "$en" = "$ko" ] || echo "MISMATCH $id: en=$en ko=$ko"
done
echo "parity check complete"
```
Expected: only `parity check complete` — no `MISMATCH` lines.

- [ ] **Step 6: npm publish dry-run**

Run: `npm publish --dry-run 2>&1 | tail -10`
Expected to include:
```
npm notice name: slaminar
npm notice version: 0.8.2
```
and ends with `+ slaminar@0.8.2`.

---

## Task 8: Release commit

**Files:** (git operation)

**Goal:** Single squash-worthy commit containing all 8 files with a clear release message.

- [ ] **Step 1: Stage the exact file list**

Run:
```bash
git add \
  CHANGELOG.md CLAUDE.md package.json src/version.ts \
  src/skill/SKILL.md \
  docs/getting-started-walkthrough.md \
  README.md README.ko.md
```

- [ ] **Step 2: Verify the staging**

Run: `git diff --cached --stat`
Expected: exactly 8 files listed (the 8 above, each with a small `+`/`-` summary).

- [ ] **Step 3: Create the release commit**

Run:
```bash
git commit -m "$(cat <<'EOF'
chore(release): v0.8.2 — Claude Code passthrough via SKILL.md

When invoked via Claude Code's /slaminar skill, slaminar now produces a
local-rules CLAUDE.md and the calling Claude agent enhances it in place.
No API key is required in that path.

Changes:
- src/skill/SKILL.md — 7-step workflow rewrite; Steps 2/4 pass --no-ai,
  Step 5 delegates enhancement to the outer Claude via Read/Edit on
  marker-bounded sections, Step 6 verifies with `slaminar check`
- docs/getting-started-walkthrough.md — new §1.5 explaining Claude Code
  context vs direct CLI
- README.md / README.ko.md — Phase 15 entry + Cross-Reference Index rows
  for D15.1 through D15.3 (language parity maintained)
- CHANGELOG.md — v0.8.2 section
- CLAUDE.md — Release Policy section codifying patch-only version bumps
- package.json / src/version.ts — 0.8.1 → 0.8.2

Core TypeScript code: 0 lines changed.
Tests: 338 pass, unchanged.
Design spec: docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Confirm clean working tree**

Run: `git status --short`
Expected: empty output.

Run: `git log --oneline -3`
Expected first line: `<hash> chore(release): v0.8.2 — Claude Code passthrough via SKILL.md`.

---

## Task 9: Tag and push to GitHub

**Files:** (git operation)

**Goal:** Annotated tag `v0.8.2`, push main + tag to `origin`.

- [ ] **Step 1: Create annotated tag**

Run:
```bash
git tag -a v0.8.2 -m "v0.8.2 — Claude Code passthrough via SKILL.md"
```

- [ ] **Step 2: Confirm tag exists locally**

Run: `git tag --sort=-v:refname | head -5`
Expected first line: `v0.8.2`.

- [ ] **Step 3: Push main**

Run: `git push origin main`
Expected: a line like `<old>..<new>  main -> main`.

- [ ] **Step 4: Push tag**

Run: `git push origin v0.8.2`
Expected: `* [new tag]  v0.8.2 -> v0.8.2`.

---

## Task 10: npm publish

**Files:** (npm operation)

**Goal:** Publish `slaminar@0.8.2` to the public npm registry and verify propagation.

- [ ] **Step 1: Publish**

Run: `npm publish`

The `prepublishOnly` script (`npm run build && npm test`) runs automatically first — that's our safety gate. If the build or tests fail, publish aborts.

Expected final line: `+ slaminar@0.8.2`.

- [ ] **Step 2: Verify via direct registry GET (bypass `npm view` CDN cache)**

Run: `curl -s https://registry.npmjs.org/slaminar/latest | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['name'], d['version'])"`

Expected: `slaminar 0.8.2`.

- [ ] **Step 3: Verify via `npm view` (may need a minute for CDN propagation)**

Run: `npm view slaminar@0.8.2 version`
Expected: `0.8.2`.

If 404, wait ~60 seconds and retry — this is normal CDN propagation latency, not a failure.

- [ ] **Step 4: Record success**

The release is complete. URLs the user can visit:
- GitHub: `https://github.com/pathcosmos/slaminar/releases/tag/v0.8.2`
- npm: `https://www.npmjs.com/package/slaminar/v/0.8.2`

---

## Self-Review (mandatory before handoff)

Run through each spec requirement and confirm a task covers it:

| Spec requirement | Task coverage |
|---|---|
| `src/skill/SKILL.md` workflow rewrite (Steps 2/4/5/6/7) | Task 1 |
| `docs/getting-started-walkthrough.md` §1.5 new subsection | Task 2 |
| `CHANGELOG.md` v0.8.2 section | Task 5 |
| `README.md` Phase 15 + D15.1-D15.3 rows | Task 3 |
| `README.ko.md` parity | Task 4 (incl. parity check) |
| `package.json` / `src/version.ts` 0.8.1 → 0.8.2 | Task 6 |
| `CLAUDE.md` Release Policy committed | Task 8 stages it |
| Verification: tsc + build + tests + `--no-ai` grep + parity | Task 7 |
| Single release commit | Task 8 |
| GitHub tag + push | Task 9 |
| npm publish + registry verify | Task 10 |

**All spec requirements have a concrete task. No placeholders in any step — every step has explicit commands, exact file paths, or exact text replacements. Type consistency: SKILL.md Step 6 uses `slaminar check <path>` which is the documented command name (verified in existing `src/cli.ts`).** Plan self-review passes.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-04-17-v0-8-2-claude-code-passthrough.md`.

**Two execution options:**

1. **Subagent-Driven** (recommended for complex multi-file refactors) — dispatch a fresh subagent per task with review between each. For this plan, may be overkill since tasks are doc edits with exact text replacements.

2. **Inline Execution** (recommended for this plan) — execute tasks sequentially in this session using `superpowers:executing-plans`. Content edits with exact `old_string`/`new_string` are well-suited for inline execution with a single verification pass at Task 7.

Ask the user to choose.
