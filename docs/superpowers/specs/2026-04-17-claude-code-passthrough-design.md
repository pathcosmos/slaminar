# Claude Code Passthrough — Design Spec (v0.8.2)

- **Status**: Approved for implementation (2026-04-17)
- **Target release**: v0.8.2 (patch)
- **Authors**: pathcosmos · Claude (collaborative design via `superpowers:brainstorming`)
- **Relates to**: [`2026-04-17-global-setup-plan.md`](./2026-04-17-global-setup-plan.md) (auth/setup context) · `src/skill/SKILL.md` (workflow carrier)

---

## Context

v0.8.1까지 Claude Code에서 `/slaminar`를 호출하면 slaminar가 **자체 AI provider**(Cloudflare/Anthropic)를 호출해 CLAUDE.md enhancement를 수행합니다. 결과적으로:

1. 사용자가 이미 Claude Code를 Max/Pro 구독으로 쓰고 있어도 **별도 API 키**(Cloudflare 토큰 또는 `sk-ant-...`)를 발급·저장해야 함
2. 두 번의 AI 호출이 중첩됨 — slaminar 내부 enhancement + outer Claude 응답 요약
3. 두 provider 간 품질/한도 차이로 일관성 낮음

Claude Code `/slaminar` 호출 맥락에선 **outer Claude가 이미 실행 중**입니다. 그 맥락에서 slaminar의 AI enhancement는 잉여입니다.

### 목표

- **API 키 없이도 Claude Code 안에선 고품질 CLAUDE.md 생성**
- Outer Claude (Max/Pro 구독)가 실제 코드베이스를 읽고 enhance → 규칙 기반보다 우수
- Claude Code 외부(직접 `slaminar init`) 사용자는 영향 X

### 원칙

1. **코어 코드 변경 zero** — `--no-ai` 플래그와 ownership markers는 이미 존재. 재사용만 함
2. **SKILL.md가 Workflow의 유일한 carrier** — "Claude Code 맥락"의 정의는 "SKILL.md를 통해 라우팅됐다"
3. **하위 호환** — 외부 CLI 실행 경로 불변, 이전 릴리스에서 설정된 auth는 계속 작동

---

## Architecture

### 두 가지 실행 맥락

```
┌──────────────────────────────────────────────────────┐
│ (A) Claude Code 내부 호출 (/slaminar 스킬)           │
│                                                      │
│  User → Claude Code → SKILL.md workflow 로드         │
│       → outer Claude가 `slaminar init --no-ai` 실행  │
│       → slaminar: scan/analyze/recommend/place (AI X)│
│       → 로컬 규칙 CLAUDE.md 생성 (ownership markers) │
│       → outer Claude가 파일 Read + 코드 분석         │
│       → 마커 안쪽 내용 Edit로 enhance                │
│       → 마커 바깥/사용자 영역 건드리지 않음          │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ (B) 외부 CLI 직접 호출 (변경 없음)                   │
│                                                      │
│  User: $ slaminar init ~/myproject                   │
│       → provider 감지 (auth.json/env)                │
│       → AI 있으면 slaminar가 enhance                 │
│       → 없으면 자동 --no-ai 모드로 fallback          │
└──────────────────────────────────────────────────────┘
```

경로 (A)는 SKILL.md가 `--no-ai`를 강제함. 경로 (B)는 기존 그대로.

### 핵심 invariants

| Invariant | 이유 |
|---|---|
| Claude Code 맥락에선 항상 `--no-ai` | outer Claude가 enhancement 담당, slaminar의 provider 호출은 잉여 |
| Ownership markers (`<!-- slaminar:begin:X -->` ... `<!-- slaminar:end:X -->`) 보존 | `slaminar update`의 incremental merge에 필수 |
| 마커 바깥은 사용자 영역 | outer Claude도 건드리지 않음 (기존 규칙) |
| slaminar 코어 코드 0줄 변경 | SKILL.md workflow 변경만으로 완성 |

---

## SKILL.md Workflow 변경

### 현재 (v0.8.1)

```
Step 1: Check if the slaminar CLI is available
Step 2: Dry-run analysis → `slaminar init --dry-run <path>`
Step 3: Ask the user to proceed
Step 4: Execute → `slaminar init <path>`
Step 5: (Optional) Install recommended tools
```

### 변경 (v0.8.2)

```
Step 1: Check if the slaminar CLI is available
        (same as before)

Step 2: Dry-run analysis with `--no-ai`
        → `slaminar init --dry-run --no-ai <path>`
        Rationale: preview the local-rules output that Claude Code will work
                   from in Step 4.

Step 3: Ask the user to proceed
        (same as before)

Step 4: Execute local-rules pipeline
        → `slaminar init --no-ai <path>`
        Rationale: slaminar generates CLAUDE.md with ownership markers using
                   local rules only — no API key / no external provider call.

Step 5 [NEW]: Enhance with the agent's own project context
  - `Read` the generated <path>/CLAUDE.md
  - `Read` key project files: package.json, pyproject.toml, src/ entry points,
    existing docs, git log — whatever you need to understand the project deeply
  - For each section between `<!-- slaminar:begin:SECTION -->` and
    `<!-- slaminar:end:SECTION -->`, `Edit` the content in place to improve it:
      * Add project-specific nuance that rule-based generation missed
      * Correct any framework/pattern misclassifications
      * Include actual command examples from the codebase (not templates)
      * Expand "Architecture" with real module relationships
  - **NEVER remove or alter the ownership marker lines themselves** — they're
    load-bearing for `slaminar update` incremental merges
  - **NEVER edit content outside the markers** — that's user-owned territory

Step 6: Verify
        → `slaminar check <path>` (exit 0 = clean)

Step 7 [was 5]: (Optional) Install recommended tools
```

### Step 5 개선 가이드라인 (구체화)

outer Claude가 enhancement할 때 참고할 섹션별 기준:

| 섹션 | 개선 포인트 |
|---|---|
| `overview` | 단순 "a typescript project" → 실제 도메인/목적 (e.g., "authentication middleware for FastAPI") |
| `architecture` | 규칙 기반이 모르는 module graph, 주요 interface, 데이터 흐름 |
| `commands` | package.json scripts 그대로 복붙이 아닌 실제 자주 쓰는 워크플로우 |
| `conventions` | lint 룰, 네이밍, 테스트 패턴 — 코드 샘플에서 귀납적으로 추출 |
| `notes` | 프로젝트 특이사항, 레거시 구간, TODO 등 |

이 가이드라인은 SKILL.md 본문에도 간결히 포함.

---

## Out of Scope (v0.9+에서 재고)

- **자동 env-var 감지 (`SLAMINAR_AGENT_MODE=1`)**: Claude Code가 서브프로세스 실행 시 env를 set하도록 하는 별도 조정 필요. 현재 Claude Code 쪽에 해당 기능 없음. 필요성도 불확실.
- **`slaminar plan` / `slaminar apply` 2-phase CLI**: 구조적으로 더 깨끗하지만 breaking API change. 현재 수요 미약.
- **`claude` CLI 서브프로세스 호출 (원래 제안)**: outer Claude가 이미 실행 중인 상황에선 불필요. 반대로 CI/비-Claude-Code 맥락에서 Claude-grade 품질을 원할 때 유용할 수 있지만 별도 설계.

---

## 변경 파일

| 파일 | 변경 | 라인 |
|---|---|---|
| `src/skill/SKILL.md` | Workflow 재작성 (Step 2/4 --no-ai, Step 5 신설, Step 6 verify, Step 7 번호 이동) | ~30 |
| `docs/getting-started-walkthrough.md` | Phase 1 설치 후 "Claude Code 내부 vs 외부 CLI" 서브섹션 추가 | ~50 |
| `CHANGELOG.md` | v0.8.2 섹션: "Claude Code passthrough via SKILL.md" | ~40 |
| `README.md` / `README.ko.md` | Implementation History §Phase 15 (v0.8.2) 추가, D15.1–D15.3 Decision IDs + Cross-Reference Index 업데이트 | ~50 (양쪽 합쳐) |
| `package.json` | version 0.8.1 → 0.8.2 | 1 |
| `src/version.ts` | SLAMINAR_VERSION → '0.8.2' | 1 |

**slaminar 코어 코드 변경 0**

---

## 릴리스 & 버전

- **v0.8.1 → v0.8.2** — patch bump만 (세 번째 숫자)
- 사용자 정책(2026-04-17 메모리 기록): "always patch only" 준수
- 코어 변경 0 이므로 semver patch가 정확히 맞음 — 문서 + SKILL.md만 변경
- `chore(release): v0.8.2 — Claude Code passthrough via SKILL.md` 단일 커밋

---

## 검증

### Manual end-to-end

1. **Baseline 캡처**:
   ```bash
   mkdir -p /tmp/slaminar-passthrough-test && cd /tmp/slaminar-passthrough-test
   echo '{"name":"test","scripts":{"build":"tsc"}}' > package.json
   slaminar@0.8.1 init --no-ai .
   cat CLAUDE.md > /tmp/baseline-local-rules.md
   rm -rf CLAUDE.md .claude .slaminar
   ```

2. **새 SKILL.md 설치** (v0.8.2 개발 중):
   ```bash
   cd <slaminar-dev-repo>
   npm run build && slaminar skill install --force
   ```

3. **Claude Code에서 호출**:
   - Claude Code 열기
   - `/slaminar /tmp/slaminar-passthrough-test`
   - Outer Claude가:
     - Step 2/4에서 `--no-ai` 사용 확인 (API 키 요구 X)
     - Step 5에서 파일 Read + Edit 수행 확인
     - 마커 line 손상 없음 확인
   - 결과 CLAUDE.md 품질이 baseline(`/tmp/baseline-local-rules.md`)보다 명확히 향상됐는지

4. **Regression 검증 (외부 CLI 직접)**:
   ```bash
   cd /tmp/slaminar-passthrough-test2
   slaminar init --no-ai .   # baseline 재확인
   slaminar init .            # provider flow (configured auth) 정상 동작
   ```

5. **Ownership marker 보존 검증**:
   - Step 3 완료 후 `slaminar update .` 실행
   - 사용자 영역 (마커 바깥) 변경 0건
   - 마커 내부 섹션은 재생성 (outer Claude가 enhance한 내용은 덮여씀 — 이건 의도 대로. 다음 Step 5에서 또 enhance)

### 자동 검증

- `npm test` — 기존 338 테스트 유지, 새 테스트 없음 (SKILL.md는 content-only 변경)
- `npx tsc --noEmit` — 0 에러 (소스 변경 없음이므로 자동)
- `grep "\-\-no\-ai" src/skill/SKILL.md` — 최소 2건 (Step 2 + Step 4) 확인

---

## 의사결정 기록 (Implementation History 반영용)

| ID | 제목 | Rationale |
|---|---|---|
| **D15.1** | Claude Code 맥락에선 `--no-ai` 강제, slaminar 자체 AI 호출 금지 | outer Claude가 이미 실행 중인데 중첩 AI 호출은 잉여. API 키 요구 제거. |
| **D15.2** | Enhancement 경계는 ownership markers | `slaminar update`의 incremental merge 계약을 깨지 않음. 사용자 영역 보호 일관성. |
| **D15.3** | 자동 감지(env var) 대신 SKILL.md가 workflow carrier | env var 감지는 Claude Code 쪽 변경 필요 + 오탐 위험. SKILL.md는 "Claude Code 맥락"의 정확한 정의 — "이 skill을 통해 호출됐다". |

---

## 참고 파일

- `src/skill/SKILL.md:30-49` — 현재 Workflow (변경 대상)
- `src/cli.ts:64` — `--no-ai` 플래그 이미 존재 (재사용)
- `src/placer/markers.ts` — ownership marker 파서 (invariant 보장 코드)
- `src/core/updater.ts` — incremental merge 로직 (marker 의존성 증거)
- `docs/getting-started-walkthrough.md` — 사용자 경험 문서 (업데이트 대상)
