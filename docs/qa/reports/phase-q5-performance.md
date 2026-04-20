# QA Phase Q5 — Performance Benchmark Report

> 작성일: 2026-04-20 · 릴리스 대상: v0.9.4 · 기준: v0.9.3 (475 tests)

## 1. Scope & Approach

Phase Q5 는 regression 방지를 위한 **수치화된 성능 baseline** 을 수립하고 Top 3 병목을 식별. hyperfine 이 환경에 없어 **의존성 없는 자체 러너** 로 전환 (`scripts/bench-cli.mjs`, `scripts/bench-lib.mjs`). 실행은 `npm run bench` (또는 개별 `bench:cli` / `bench:lib`).

## 2. Deliverables

### 2.1 벤치마크 인프라

- `scripts/bench-cli.mjs` — subprocess (`spawnSync` + `performance.now()`) 로 CLI wall-time 측정. 3 fixture × 3 tier × n=8 = 72 runs + warmup. Mean/stddev/min/max 를 JSON + MD 로 `docs/benchmarks/raw/` 에 저장.
- `scripts/bench-lib.mjs` — `dist/core/scanner.js`, `dist/core/pipeline.js`, `dist/recommender/recommender.js` 를 직접 import. scan / analyze / recommend 개별 측정 (n=15 / n=10). Node 시작 비용 제외.
- `tests/bench/pipeline-phases.bench.ts` — vitest bench (experimental) 버전. vitest 3.x 의 describe.each + bench 조합에서 summary 집계가 불안정해 **참고용으로 유지**하되 주 측정은 scripts/ 를 사용.
- `package.json`: `bench:cli`, `bench:lib`, `bench` scripts 신규.

### 2.2 문서

- `docs/benchmarks/2026-04-20-baseline.md` — 정식 baseline (수치 + 측정 방법 + Top 3 병목 + regression 계약)
- `docs/benchmarks/raw/cli-wall-time-2026-04-20.{json,md}` — 자동 생성 raw
- `docs/benchmarks/raw/lib-phases-2026-04-20.{json,md}` — 자동 생성 raw
- 이 보고서 (`docs/qa/reports/phase-q5-performance.md`)

## 3. 핵심 수치

### 3.1 CLI wall-time (100–130ms 범위)

| Fixture | 파일 수 | mean wall-time |
|---|---|---|
| small | 20 | 102–104ms |
| medium | 500 | 105–107ms |
| large | 5000 | 121–124ms |

250× 파일 증가에 wall-time 22% 증가 → **상수 startup 이 dominant**.

### 3.2 Library phase breakdown (pipeline 만, Node 시작 제외)

| Fixture | scan | analyze | recommend (cold) |
|---|---|---|---|
| small | 287µs | 271µs | 685µs |
| medium | 2.1ms | 2.2ms | 197µs (warm) |
| large | **13.6ms** | 13.5ms | 176µs (warm) |

- scan = ~3µs per file (선형)
- analyze ≈ scan (5 analyzers 비용 ~0)
- recommend cold 685µs → warm 200µs

## 4. Top 3 병목

| # | 병목 | 정량 | 등급 | 개선 후보 |
|---|---|---|---|---|
| 1 | Node.js startup + module load | CLI wall-time 의 ~85% (~90ms/100ms) | **P2** | esbuild single-bundle / bun compile / compile-cache |
| 2 | scan 의 파일 트리 walk | large (5000 files) 13.6ms, 선형 | P2 | `fs.readdir { recursive, withFileTypes }` / promise-batch |
| 3 | recommend cold catalog load | 첫 호출 ~500µs overhead | **P3** | module-level memoize — 현재 CLI 모델에선 효과 0 |

**결론**: **이번 릴리스에는 P0 성능 fix 없음**. 현재 wall-time 은 사용자 체감 쾌적 범위 (100–130ms). 최적화는 baseline 수립 후 사용자 요청 기반으로 진행 — Q5 의 목표는 regression 방지 수치 고정.

## 5. Regression 계약

- 매 릴리스 전 `npm run bench` 실행 → raw/ 아래 새 타임스탬프 파일 생성 → baseline 대비 **±10%** 이내 확인
- 10% 이상 regression 시 release-commit 에서 flag + 이유 명시
- Baseline 갱신은 **의도된** architecture 변경 (예: bundler 도입) 후에만 수행 + 새 baseline 파일을 `docs/benchmarks/YYYY-MM-DD-baseline.md` 로 추가 (덮어쓰기 아님). 이전 baseline 은 역사 기록으로 유지.

## 6. 다른 관찰

- **Tier 는 wall-time 에 영향 없음** — 모든 fixture 에서 < 2ms 차이. 사용자는 tier 선택을 "성능 tradeoff" 가 아니라 "추천 깊이 tradeoff" 로 이해하면 됨. Q6 문서에 반영.
- **stddev 작음** (대부분 mean 의 5% 이내) — FS 캐시가 잘 동작. 로컬 재현성 높음.
- **`discover` batch apply 는 측정 안 함** — subprocess 경계가 있어 per-project wall-time 은 위 CLI bench 가 근사. 전체 batch time 은 fixture 수에 선형.

## 7. 다음 스텝

1. v0.9.4 commit: bench 인프라 + baseline 문서 (코드 변경 없음, P0 없음 — "infrastructure + measurement only" 릴리스)
2. **Phase Q6** (v0.9.5): 최종 QA 보고서 — Q1–Q5 전체 roll-up, P0/P1/P2 status, 향후 QA 반복 주기 권고
