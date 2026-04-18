# QA Phase Q3 — Fault Injection Report

> 작성일: 2026-04-18 · 릴리스 대상: v0.9.2 · 기준: v0.9.1 (365 unit + 60 E2E)

## 1. Scope & Approach

Phase Q1 의 커버리지 매트릭스에서 **가장 약한 축 4 개** (F1 network / F2 FS / F6 concurrency / F7 invalid input) + 부분만 덮이던 F3·F5·F8 을 전수 주입 테스트로 확인. 주입 도구는 사용자 결정에 따라 **순수 tmp dir 조작 + 로컬 HTTP 스텁 서버 + `child_process.spawn` 병렬** — mock-fs 미도입.

테스트 3 개 병렬 sub-agent + concurrency 테스트는 main agent 가 직접 작성.

## 2. Deliverables

### 2.1 문서
- `docs/qa/fault-matrix.md` — 8 × 28 매트릭스 (sparse) + 각 셀의 기대 행동 명세
- 이 보고서 (`docs/qa/reports/phase-q3-exceptions.md`)

### 2.2 테스트 (`tests/fault-injection/`, **47 tests** / 1 skip)

| 파일 | 테스트 수 | 카테고리 |
|---|---|---|
| `_helpers.ts` | — | 공용 tmp dir + runCli + seed/corrupt helpers |
| `network.test.ts` | 9 | F1 — 로컬 HTTP 스텁으로 timeout / DNS / 404 / 500 / 손상 JSON / 유효 JSON / ETag 304 |
| `ai-provider.test.ts` | 7 | F5 — 401 / 429 / 빈 응답 / CF envelope failure / timeout / local off / positive sanity. In-process `vi.stubGlobal('fetch')` 로 CF endpoint 하드코딩 우회 |
| `fs.test.ts` | 5 (+1 skip) | F2 — CLAUDE.md read-only, 부모 read-only, symlink loop, `~/.config` read-only. F2.c (ENOSPC) 는 포터블 재현 어려워 `it.skip` |
| `corrupt.test.ts` | 6 | F3 — `defaults.json`, `auth.json`, manifest, catalog cache, `plugin.json`, `.slaminar/config.json` 각각 손상 주입 |
| `input.test.ts` | 11 | F7 — `--token-tier`, `--catalog-mode`, `--scope`, `--trust`, `--reconfigure`, `SLAMINAR_FILE_COUNT_CAP` |
| `version.test.ts` | 6 | F8 — `minSlaminarVersion`, `defaults.json version`, 비array `manifest.json` |
| `concurrency.test.ts` | 3 | F6 — 동시 init × 2, init + uninstall, setup × 2 (shared HOME) |

**총 47 tests / 1 skipped**.

## 3. 발견된 P0 (v0.9.2 에 fix)

Phase Q3 는 **5 건 P0 bug 를 확인**하고 **같은 사이클에 fix + E2E 회귀 테스트** 를 포함.

### P0-6 · F7.f — `fileCountCap` 음수 허용
- **위치**: `src/setup/wizard.ts:318-320` — `--yes` 모드의 env 파싱
- **증상**: `SLAMINAR_FILE_COUNT_CAP=-5 slaminar setup --yes` 가 `defaults.json` 에 `-5` 저장
- **원인**: `parseInt(env) || fallback` 만 있고 `Math.max(100, …)` 누락. 인터랙티브 경로는 이미 clamp 함.
- **Fix**: env 경로에 `Math.max(100, …)` 추가 — 1 줄.

### P0-7 · F7.c — `--catalog-mode` validation 누락 4 곳
- **위치**: `src/cli.ts:123, 240, 571, 611` — init / recommend / discover / catalog update
- **증상**: `slaminar init --catalog-mode bogus <path>` 이 exit 0 으로 통과, 잘못된 값이 type cast 로 하류 전달
- **원인**: `catalog config` 와 `catalog source add` 는 validation 있지만 나머지는 raw cast
- **Fix**: `validateCatalogMode()` 헬퍼 신규 + 4 call site 에 적용

### P0-8 · F8.a — `minSlaminarVersion` 무시
- **위치**: `src/recommender/catalog-remote.ts:86-94` (schema validation 은 타입만 체크), `src/recommender/catalog-resolver.ts` (honor 코드 부재)
- **증상**: `minSlaminarVersion: "99.0.0"` 카탈로그가 조용히 사용됨
- **Fix**:
  - `meetsMinSlaminarVersion(min, installed?)` 순수 semver-like 비교 함수 신규
  - `IncompatibleCatalogVersionError` 클래스 신규 (향후 fatal 경로용)
  - resolver 에서 fetch 후 체크 → 미충족 시 경고 + bundled/cache 로 fallback

### P0-9 · F3.c — corrupt manifest 시 silent 성공
- **위치**: `src/placer/backup.ts:readManifest` (손상 시 `[]` 반환), `src/rollback/uninstaller.ts:22` (구분 불가)
- **증상**: `.slaminar/.bk/manifest.json` 이 손상돼 있으면 uninstall 이 "complete" 로 위장, 실제로는 사용자 파일 원복 0
- **원인**: "manifest 없음" 과 "manifest 손상" 을 구분하지 않음
- **Fix**:
  - `readManifestWithStatus()` 신규 — `{ records, status: 'ok' | 'missing' | 'corrupt' }` 반환
  - `UninstallResult.manifestCorrupt: boolean` 신규
  - CLI 의 uninstall action: corrupt 이면 빨간색 경고 + `process.exitCode = 1`

### P0-10 · F2.a — writer 부분 실패 silent swallow
- **위치**: `src/placer/writer.ts:29-31` — 모든 파일 실패일 때만 throw
- **증상**: 일부 대상 파일이 EACCES 여도 나머지가 성공하면 exit 0, 사용자는 CLAUDE.md 가 쓰였다고 믿음
- **원인**: 초기 `if (errors.length === targets.length)` 가 "전부 실패 아니면 괜찮다" 로 잘못 해석
- **Fix**: 어떤 파일이라도 실패하면 throw → pipeline 의 rollback catch (session backups 복원) 가 정상 작동
- **잠재 영향**: `writer.test.ts` 등 기존 테스트가 "부분 성공" 을 기대하지 않음 — 확인. 현재 365 unit 유지됨.

## 4. P1/P2 이슈 (티켓화, v0.9.3+ 로 연기)

| # | 관찰 | 위치 | 제안 타이밍 |
|---|---|---|---|
| Obs-Q3-1 | update-check 가 corrupt `defaults.json` 을 silent 하게 덮어씀 | `src/setup/update-check.ts` + `src/setup/defaults.ts` | P2 — 기능 문제 없지만 파일이 사용자 모르게 "치유" |
| Obs-Q3-2 | update 가 corrupt `.slaminar/config.json` 에 대해 default 로 fallback + 경고 없음 | `src/team/config.ts:42`, `src/core/updater.ts` | **P1** — 다음 update 시 approvedTools/catalogUrl 손실 가능 (v0.9.3 에 fix 권장) |
| Obs-Q3-3 | scanner 가 symlink loop 를 조용히 skip | `src/scanner/file-tree.ts:67` | P2 — 관찰성 개선 |
| Obs-Q3-4 | catalog fetch 실패 시 HTTP status 정보가 "Using bundled" 경고에 포함 안 됨 | `src/recommender/catalog-resolver.ts:137` 의 `catch {}` | P2 — 진단성 |
| Obs-Q3-5 | catalog fetch timeout 10 초 하드코딩 | `src/recommender/catalog-remote.ts:103` | P2 — env 노출 후보 |
| Obs-Q3-6 | AI provider 429 에 재시도 없음 | `src/generator/cloudflare-ai.ts` | 의도된 동작 — 향후 exponential backoff 고려 |

## 5. Concurrency (F6) — 별도 취급

F6 는 v0.9.2 범위 **밖**. Phase Q3 에서는 **재현·문서화만**, 실제 lock 구현은 **P1-1** 로 Phase Q4 (v0.9.3) 에 이관.

### F6.a 관찰 — parallel init × 2

현재 구현 동작:
```
[F6.a] exit1=0 exit2=0 (both succeeded — possible manifest race)
```

두 프로세스 모두 exit 0 로 성공. manifest JSON 은 v0.9.1 P0-1 atomic write 덕분에 무결. 단 두 세션의 백업 기록 중 일부가 manifest 에서 유실될 가능성이 구조적으로 남아 있음 (두 프로세스가 동시에 readManifest + append + writeManifest 를 수행하면 뒤 프로세스가 앞 프로세스의 기록을 덮어씀). `.slaminar/.bk/*.dat` 파일 자체는 남지만 manifest 에서 누락되므로 `slaminar uninstall` 이 해당 백업을 복원하지 못함.

### F6.b — init + concurrent uninstall

```
[F6.b] update exit=0, uninstall exit=0
```

crash 없이 양쪽 종료. 순서 의존적인 data 관점 영향은 Phase Q4 에서 정량화.

### F6.d — shared HOME setup × 2

```
[F6.d shared-HOME] c=0 d=0
```

last-write-wins 로 `defaults.json` 이 두 값 중 하나로 수렴, corruption 없음 (atomic writeFileSync 덕).

### Phase Q4 인풋

- `R-new-1`: 동일 프로젝트에 2 개 `init` 프로세스 병렬 → manifest 백업 기록 유실 시나리오 재현 + lock 도입 필요성 수치화
- lock 방식 후보: `proper-lockfile` 패키지 또는 자체 `.slaminar/.lock` 파일 + pid + 타임스탬프
- scope: init / update / uninstall / catalog update — 모두 manifest 또는 주요 config 쓰기 경로

## 6. 테스트 집계 (v0.9.2 기준)

| 분류 | 파일 | 테스트 | 통과 |
|---|---|---|---|
| Unit (`tests/**` except e2e/fault) | 58 | 365 | 365 |
| E2E (`tests/e2e/`) | 16 | 60 | 60 |
| Fault-injection (`tests/fault-injection/`) | 7 | 47 (+1 skip) | 46 / 1 skip |
| **합계** | **81** | **472** | **471 / 1 skip** |

## 7. 다음 스텝

1. v0.9.2 릴리스 commit (Phase Q3 + 5 P0 fix)
2. **Phase Q4** (v0.9.3): Rollback R1–R10 + **F6 concurrency lock 도입** (P1-1)
3. **Obs-Q3-2 (P1)** — `update` 의 corrupt team-config fallback 도 v0.9.3 에 fix 권장 (Phase Q4 rollback 주제와 연관)
