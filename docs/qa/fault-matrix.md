# Fault-Injection Matrix — slaminar v0.9.2

> 작성일: 2026-04-17 · Phase Q3 · 기준: v0.9.1 (365 unit + 60 E2E)

8 개 실패 카테고리 (F1–F8) × 주요 커맨드 (sparse) 매트릭스. 각 셀은 기대 행동 (exit code + stderr pattern + side-effect) 을 명세하고, 실제 주입 테스트는 `tests/fault-injection/{네트워크, fs, corrupt, input, concurrency, version}.test.ts` 에서 검증.

## 주입 도구

| 카테고리 | 주입 방식 |
|---|---|
| F1 네트워크 | **MSW** — `setupServer()` 로 fetch 가로챔, timeout/404/500/손상 JSON 시뮬 |
| F2 파일 시스템 | **tmp dir + chmod** — `chmod 000` 으로 EACCES, 읽기 전용 부모 디렉토리 |
| F3 손상 파일 | **직접 write** — 테스트 setup 에서 고장난 JSON 직접 배치 |
| F4 입력 | **인자 전달** — 존재 않는 path, 빈 dir, git 없음 |
| F5 AI provider | `SLAMINAR_AI_PROVIDER` env + MSW 로 API 응답 모킹 |
| F6 동시성 | **`child_process.spawn`** — 동일 cwd 에 두 init 병렬 발사 |
| F7 사용자 입력 | 잘못된 CLI 플래그 값 |
| F8 버전 | `minSlaminarVersion` 가짜 catalog fixture + `version` 필드 조작 |

## F1 — Network

| # | 케이스 | 영향 커맨드 | Expected Exit | Expected stderr pattern | Side-effect |
|---|---|---|---|---|---|
| F1.a | fetch timeout (>5s 응답 없음) | `catalog update`, `catalog source test`, `recommend --catalog <url>` | 0 (bundled fallback) or 1 | "catalog unreachable" OR "timeout" | 기존 cache 손상 X |
| F1.b | DNS 실패 (invalid host) | 같음 | 0 or 1 | "fetch failed" OR "ENOTFOUND" | cache 손상 X |
| F1.c | HTTP 404 | 같음 | 0 (bundled fallback) | "404" OR "catalog not found" | cache 손상 X |
| F1.d | HTTP 500 | 같음 | 0 (bundled fallback) | "500" OR "server error" | cache 손상 X |
| F1.e | 200 + 손상 JSON | 같음 | 0 (bundled fallback) | "schema" OR "parse" | 기존 cache 손상 X |
| F1.f | 200 + 유효 JSON (캐시 갱신) | `catalog update` | 0 | "updated" / diff 출력 | 새 cache 저장 + prev 백업 |
| F1.g | ETag 304 (캐시 변경 없음) | `catalog update` | 0 | "no change" | cache 변경 X |

## F2 — Filesystem

| # | 케이스 | 영향 커맨드 | Expected Exit | Expected stderr pattern | Side-effect |
|---|---|---|---|---|---|
| F2.a | CLAUDE.md 가 read-only (EACCES on write) | `init`, `update` | 1 | "permission denied" OR "EACCES" | **기존 백업 자동 롤백** (P0-2 동작 확인) |
| F2.b | `.slaminar/` 디렉토리 생성 불가 (부모 read-only) | `init` | 1 | "EACCES" | 원본 파일 변경 X |
| F2.c | 디스크 소진 (ENOSPC — 시뮬 어려움, skip 또는 writeManifest 큰 payload 로 간접) | `init` | 1 | "ENOSPC" OR "no space" | partial write rollback |
| F2.d | Symlink loop (path → path 자기참조) | `scan`, `init` | 1 | "ELOOP" OR recursion guard | crash 아님 |
| F2.e | 읽기 전용 `~/.config/slaminar/` | `setup --yes` | 1 | "permission" | defaults.json 저장 X |

## F3 — Corrupt Files

| # | 케이스 | 영향 커맨드 | Expected Exit | Expected 행동 | Ref |
|---|---|---|---|---|---|
| F3.a | 손상 `defaults.json` | `init`, `doctor`, `setup` | 0 (fallback) | built-in defaults 로 복귀, 경고 없이 silent | 기존 `setup/defaults.test.ts` 커버 — 재확인 |
| F3.b | 손상 `auth.json` | `init`, `doctor` | 0 (AI off 로 간주) | detectAiProvider → local | 기존 `auth/config.test.ts` 커버 |
| F3.c | 손상 `manifest.json` (backup manifest) | `uninstall` | 0 or 1 | **graceful — 부분 복원 시도, manifest 읽기 실패 시 경고** | **신규 — v0.9.1 에서 확인 필요** |
| F3.d | 손상 catalog cache | `recommend`, `init` | 0 | 번들 catalog 로 fallback | 기존 `catalog-cache.test.ts` 커버 |
| F3.e | 손상 `plugin.json` (이미 설치된) | `check`, `status` | 2 (fail) | validator 가 감지 | 기존 `validator/plugin-schema.test.ts` 커버 |
| F3.f | 손상 `.slaminar/config.json` | `init`, `update` | 1 or graceful | 경고 + rebuild | **신규 확인** |

## F4 — Bad Input

| # | 케이스 | 영향 커맨드 | Expected Exit | Expected stderr pattern |
|---|---|---|---|---|
| F4.a | 존재 않는 path | `init`, `scan`, `analyze`, `recommend`, `update`, `status`, `check`, `uninstall` | 1 | "not found" OR "does not exist" |
| F4.b | 빈 디렉토리 (git 없음, package.json 없음) | 같음 | 0 or 1 | maturity=greenfield, language=unknown 으로 처리 |
| F4.c | path 가 파일 (디렉토리 아님) | 같음 | 1 | "not a directory" |
| F4.d | symlink (normal case) | 같음 | 0 | normal 처리 |
| F4.e | path traversal (`../../etc`) | 같음 | 1 or normal | scan 이 디렉토리 아니면 fail — path 검증 없음 (Obs) |

## F5 — AI Provider

| # | 케이스 | 영향 커맨드 | Expected Exit | Expected 행동 |
|---|---|---|---|---|
| F5.a | HTTP 401 (invalid key) | `init` (AI 활성) | 0 | "AI enhancement failed, using local draft" 경고 + local fallback |
| F5.b | HTTP 429 rate limit | `init` | 0 | 같음 (재시도 없음, graceful fallback) |
| F5.c | 빈 응답 body (`""` or `{}`) | `init` | 0 | draft 유지 (enhanceWithAI return draft unchanged) |
| F5.d | 타임아웃 (>60s 응답 없음) | `init` | 0 | timeout 감지 후 fallback |
| F5.e | 미설정 (`SLAMINAR_AI_PROVIDER=local`) | `init` | 0 | local 모드, AI 호출 0 |

## F6 — Concurrency (★ 전수 미테스트 — v0.9.2 핵심)

| # | 케이스 | 주입 방식 | Expected 행동 | 현재 구현 |
|---|---|---|---|---|
| F6.a | 동시 init 2 회 (같은 cwd) | `spawn` × 2, 각각 큰 fixture | **둘 중 하나는 실패 or 둘 다 성공** — manifest 에 양쪽 백업 기록 모두 존재 | **★ 현재 race 존재 — P1-1 로 이관되나 여기서 재현·문서화** |
| F6.b | init + 동시 uninstall | `spawn`, uninstall 이 init 보다 늦게 시작 | uninstall 이 stale manifest 읽을 수 있음 | **★ 위험 시나리오 — lock 필요** |
| F6.c | catalog cache 동시 write | `catalog update` 두 번 병렬 | 하나는 fail, 하나는 성공 (cache 덮어쓰기) | 현재 graceful — 하지만 backup 교차 X |
| F6.d | defaults.json 동시 write | `setup --yes` × 2 (env 다르게) | last-write-wins, corruption 없음 | 현재 검증 없음 |

## F7 — Invalid CLI Input

| # | 케이스 | 커맨드 | Expected Exit | Expected stderr pattern |
|---|---|---|---|---|
| F7.a | `--token-tier fast` (유효 값 아님) | `init`, `recommend` | 1 | "must be one of: conservative, smart, rich" |
| F7.b | `--catalog-mode bogus` | `catalog config`, `catalog source add` | 1 | "invalid mode" |
| F7.c | `--catalog-mode bogus` on init/recommend/discover | 해당 커맨드 | **현재 미검증 — validation 누락** | **★ Bug 3/4 in Q1 — P0 로 승격 고려** |
| F7.d | `--catalog <malformed-url>` | init, recommend | 1 or graceful | URL parse 에러 |
| F7.e | `setup --reconfigure invalid` | setup | 1 | "section must be one of" |
| F7.f | `fileCountCap` 음수 / 0 | setup --yes (env) | fallback to default | "must be positive integer" validation |

## F8 — Version Mismatch

| # | 케이스 | 영향 | Expected | 현재 |
|---|---|---|---|---|
| F8.a | catalog `minSlaminarVersion: "99.0.0"` | `catalog update` / `recommend` | exit 1 or 경고 후 skip | **★ 미구현 검증 — 현재 이 필드를 honor 하지 않는 듯** |
| F8.b | `defaults.json version: 99` | 모든 커맨드 | graceful parse (merge) | `loadDefaults` 가 version 체크 안 함 — silent downgrade |
| F8.c | `manifest.json` 포맷 변경 | `uninstall` | graceful parse or ignore | 현재 스키마 필드 체크 없음 |

## Fix 승격 후보 (v0.9.2)

Phase Q3 실행 중 확인해야 할 P0 후보:
- **F7.c (Bug 3/4)**: init/recommend/discover 의 `--catalog-mode` validation 누락 → P0 승격 유력
- **F8.a**: `minSlaminarVersion` 미 honor → UX 문제, P0 승격 가능
- **F3.c**: 손상 manifest 에 대한 uninstall 행동 → 현재 `[]` 로 fallback, 데이터 유실 경고 부재

Phase Q3 실행 후 이 매트릭스는 실제 테스트 결과로 업데이트.
