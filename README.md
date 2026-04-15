# slaminar

[![Tests](https://img.shields.io/badge/tests-157%20passing-brightgreen)](https://github.com/pathcosmos/slaminar)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구**

아무 코드베이스에 `slaminar init`을 실행하면, 프로젝트를 자동 분석하고 맞춤형 CLAUDE.md, Claude Code 플러그인, 그리고 생태계 도구 추천을 생성합니다.

---

## 목차

- [데모](#slaminar)
- [주요 기능](#주요-기능)
- [설치](#설치)
- [사용법](#사용법)
- [프로젝트 분석 능력](#프로젝트-분석-능력)
- [생성물](#생성물)
- [검증 시스템](#검증-시스템)
- [에러 처리 및 안전장치](#에러-처리-및-안전장치)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [개발](#개발)
- [구현 과정](#구현-과정)
- [프로젝트 통계](#프로젝트-통계)
- [FAQ](#faq)
- [기여](#기여)
- [라이선스](#라이선스)

```
$ slaminar init /path/to/your-project

━━━ slaminar init complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Profile:
  ┌──────────┬────────────┐
  │ Name     │ your-app   │
  │ Language │ typescript │
  │ Pattern  │ spa        │
  │ Maturity │ growing    │
  └──────────┴────────────┘

  Generated Files:
  ┌──────────────────────────────────────────────────┬────────┐
  │ File                                             │ Action │
  ├──────────────────────────────────────────────────┼────────┤
  │ CLAUDE.md                                        │ create │
  │ .claude/plugins/slaminar-generated/plugin.json   │ create │
  │ .claude/plugins/slaminar-generated/skills/dev.md │ create │
  └──────────────────────────────────────────────────┴────────┘

  Recommended Tools:
  ┌──────────────────────┬───────┬─────────────┐
  │ Tool                 │ Score │ Install      │
  ├──────────────────────┼───────┼─────────────┤
  │ impeccable           │ 65    │ marketplace  │
  │ everything-claude-code│ 55   │ git-clone    │
  │ planning-with-files  │ 45    │ npx          │
  └──────────────────────┴───────┴─────────────┘

  Verification: ✅ 9/9 checks pass

  Report saved: .slaminar/reports/2026-04-14-init.md
```

---

## 주요 기능

### 7단계 파이프라인

```
scan → analyze → recommend → plan → generate → place → verify
```

| 단계 | 역할 |
|------|------|
| **Scan** | 프로젝트 구조, 패키지 매니저, Git 히스토리, AI 컨텍스트 파일, CI/CD, 문서 수집 |
| **Analyze** | 언어/프레임워크 감지, 아키텍처 패턴, 코딩 컨벤션, 의존성 분석, 성숙도 판정 |
| **Recommend** | 다차원 스코어링 + 충돌/시너지 감지 + 성숙도별 도구 수 제한으로 지능적 추천 |
| **Plan** | 생성 계획 수립 (어떤 파일을 create/merge할지) |
| **Generate** | CLAUDE.md (소유권 마커 포함) + Claude Code 플러그인 (plugin.json + skills) 생성 |
| **Place** | 기존 파일 난독 백업 → 마커 기반 머지 → 파일 배치 |
| **Verify** | CLAUDE.md 명령어 검증, plugin.json 스키마 검증, 생성 파일 무결성 확인 |

### 지능적 도구 추천

14개 Claude Code 생태계 도구 카탈로그에서 프로젝트에 맞는 도구를 자동 선별합니다.

**추천 로직:**
- 다차원 스코어링 (언어/프레임워크 매칭, 성숙도 적합도, 태그 매칭)
- 충돌/중복 감지 (caveman ↔ everything-claude-code 등)
- 성숙도별 도구 수 제한 (greenfield: 2개, early: 3개, growing: 5개, mature: 7개)
- 외부 인증 필요 도구 자동 제외

**카탈로그 포함 도구:**

| 도구 | 기능 | 설치 방법 |
|------|------|----------|
| caveman | 토큰 65% 절약 | marketplace |
| planning-with-files | 마크다운 기반 계획 수립 | npx |
| impeccable | 프론트엔드 디자인 품질 | marketplace |
| playwright-skill | 브라우저 자동 테스트 | marketplace |
| get-shit-done | 스펙 기반 개발 | npx |
| claude-mem | 세션 메모리 | npx |
| graphify | 코드 → 지식 그래프 | pip |
| cartographer | 코드베이스 매핑 | marketplace |
| trailofbits/skills | 보안 리뷰 | marketplace |
| everything-claude-code | 성능 최적화 | git-clone |
| claude-hud | 실시간 모니터링 | marketplace |
| homunculus | 패턴 학습 | marketplace |

### 안전한 파일 관리

- **소유권 마커**: `<!-- slaminar:begin:SECTION -->` / `<!-- slaminar:end:SECTION -->`으로 slaminar 생성 섹션 추적. 사용자가 수동으로 추가한 콘텐츠는 절대 건드리지 않음
- **난독 백업**: `.slaminar/.bk/{hex6}_{timestamp}.dat` — IDE/AI가 인식하지 않는 형태로 백업
- **증분 업데이트**: `slaminar update`는 변경된 섹션만 업데이트
- **완전 롤백**: `slaminar uninstall`로 모든 변경 되돌리기

### 팀 협업

| 파일 | Git 커밋 | 용도 |
|------|---------|------|
| `.slaminar/config.json` | YES | 팀 설정 (승인 도구, 카탈로그 버전) |
| `.slaminar/config.local.json` | NO | 개인 설정 (AI 모드, 개인 도구) |
| `.slaminar/reports/*.md` | YES | 세팅 보고서 (PR 리뷰용) |
| `.slaminar/.bk/` | NO | 백업 파일 |

---

## 설치

```bash
npm install -g slaminar
```

또는 npx로 직접 실행:

```bash
npx slaminar init .
```

### 요구사항

- Node.js >= 18
- Git (선택 — git 히스토리 분석용)

---

## 사용법

### 기본 — 프로젝트 세팅

```bash
# 미리보기 (파일 쓰지 않음)
slaminar init --dry-run .

# 실행
slaminar init .

# 상세 출력
slaminar init --verbose .
```

### 개별 명령어

```bash
# 프로젝트 스캔 (JSON 출력)
slaminar scan .

# 프로젝트 분석 (JSON 출력)
slaminar analyze .

# 도구 추천 (JSON 출력)
slaminar recommend .

# 헬스 체크
slaminar status .

# 증분 업데이트 (변경분만)
slaminar update .

# 도구 제거
slaminar remove caveman

# 전체 제거 + 복원
slaminar uninstall .

# CI 검증 (비대화형, 종료 코드)
slaminar check .
slaminar check --json .
```

### 글로벌 플래그

| 플래그 | 설명 |
|--------|------|
| `--dry-run` | 미리보기만, 파일 쓰지 않음 (init, update) |
| `--verbose` | 상세 분석 출력 |
| `--json` | 머신 가독 JSON 출력 (check) |

### Claude Code 스킬

Claude Code에서 `/slaminar`로 실행 가능:

```
사용자: /slaminar
Claude: 프로젝트 분석 중... (slaminar init --dry-run)
       결과를 보여주고 승인 요청
```

---

## 프로젝트 분석 능력

### 지원 언어/프레임워크

| 언어 | 프레임워크 감지 | 패키지 매니저 |
|------|----------------|--------------|
| TypeScript/JavaScript | React, Vue, Svelte, Angular, Next, Nuxt, Express, Fastify, Koa, Hono, NestJS | npm (package.json) |
| Python | Django, Flask, FastAPI | pip (pyproject.toml) |
| Rust | Actix, Axum | cargo (Cargo.toml) |
| Go | Gin, Echo | go (go.mod) |
| Java/Kotlin/Scala | Spring | maven (pom.xml) |
| Elixir | Phoenix | - |

### 아키텍처 패턴 감지

| 패턴 | 감지 기준 |
|------|----------|
| CLI | commander, yargs, meow 등 CLI 프레임워크 의존성 |
| SPA | React/Vue/Svelte + Vite/Webpack |
| API | Express/Fastify/Koa 등 서버 프레임워크 |
| Fullstack | SPA + API 동시 감지 |
| Library | 패키지 매니저 있지만 프레임워크 없음 |
| Monorepo | 복수 패키지 매니저 파일 |

### 성숙도 판정

| 성숙도 | 기준 | 추천 도구 수 |
|--------|------|-------------|
| greenfield | Git 없음, 패키지 없음, 소스 없음 | 최대 2개 |
| early | < 10 커밋 | 최대 3개 |
| growing | 10-200 커밋 | 최대 5개 |
| mature | 200+ 커밋 또는 5+ 기여자 + CI | 최대 7개 |

### 컨벤션 감지

- **네이밍**: camelCase, kebab-case, snake_case (소스 파일명 분석)
- **테스트 프레임워크**: vitest, jest, pytest 등
- **린터/포매터**: ESLint, Prettier
- **커밋 스타일**: conventional, emoji, freeform
- **문서 언어**: ko, en, ja, zh (파일명 패턴)

---

## 생성물

### CLAUDE.md

소유권 마커로 섹션을 관리합니다:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code...

<!-- slaminar:begin:overview -->
## Overview
프로젝트 설명, 언어, 프레임워크, 패턴, 성숙도
<!-- slaminar:end:overview -->

<!-- slaminar:begin:commands -->
## Build & Development Commands
package.json scripts에서 자동 추출
<!-- slaminar:end:commands -->

## 내가 직접 쓴 섹션       ← slaminar가 절대 건드리지 않음
커스텀 콘텐츠...

<!-- slaminar:begin:architecture -->
## Architecture
아키텍처 패턴, 레이아웃, 진입점, 테스트 패턴
<!-- slaminar:end:architecture -->
```

**기존 CLAUDE.md가 있는 경우:**
1. 난독 파일명으로 백업 (`.slaminar/.bk/a7f3c2_1713081600.dat`)
2. 마커 내 섹션만 업데이트
3. 마커 밖 사용자 콘텐츠 완전 보존

### Claude Code 플러그인

```
.claude/plugins/slaminar-generated/
├── plugin.json          # 플러그인 매니페스트
└── skills/
    └── dev.md           # 개발 워크플로우 (빌드/테스트/린트 명령어)
```

### 보고서

`.slaminar/reports/YYYY-MM-DD-init.md` — 마크다운 보고서 자동 생성:
- 프로젝트 프로파일
- 생성된 파일 목록
- 추천/제외 도구 + 사유
- 검증 결과

팀에서 PR에 포함시켜 리뷰할 수 있습니다.

---

## 검증 시스템

`slaminar init` 완료 후 자동 검증:

| 검증 항목 | 내용 |
|----------|------|
| file-exists | CLAUDE.md 존재 확인 |
| has-headings | ## 제목 존재 |
| markers-well-formed | slaminar 마커 쌍 일치 |
| commands-valid | npm run 명령어가 package.json에 존재하는지 |
| plugin.json exists | 플러그인 파일 존재 |
| Valid JSON | plugin.json 파싱 가능 |
| Required fields | name, description, version 필드 존재 |
| Skills directory | 스킬 디렉토리 존재 |
| Skill files | .md 스킬 파일 존재 |

```bash
# CI에서 사용
slaminar check --ci .
# 종료 코드: 0=정상, 1=경고, 2=오류
```

---

## 에러 처리 및 안전장치

### 에러 처리

- 모든 CLI 명령어에 try/catch — 스택 트레이스 대신 사용자 친화 메시지
- 경로 검증 — 존재하지 않는 경로, 파일(디렉토리 아님) 감지
- JSON 파싱 방어 — 손상된 manifest/config 파일에 대한 graceful 처리
- 부분 쓰기 처리 — 일부 파일 쓰기 성공, 나머지 실패 시 에러 리포트

### 롤백 전략

- **init 실패 시**: 이미 백업된 파일 자동 복원
- **manifest 안전**: finally 블록에서 기록 — 부분 실패에도 백업 추적 유지
- **세션 격리**: 현재 세션의 백업만 롤백 (이전 세션 건드리지 않음)

### Fallback 전략

- **AI 모드 불가**: 로컬 규칙 기반으로 자동 전환 (ANTHROPIC_API_KEY 없거나 SDK 미설치)
- **Python 없음**: graphify 대신 cartographer 추천 (같은 목적, 다른 런타임)
- **모든 도구 점수 0**: 빈 추천 반환 (CLAUDE.md + 플러그인은 여전히 생성)
- **Git 없음**: git 관련 분석 건너뛰기, 성숙도 = greenfield

---

## 기술 스택

| 구성 요소 | 기술 |
|----------|------|
| 언어 | TypeScript (ESM) |
| 런타임 | Node.js >= 18 |
| CLI | commander |
| 터미널 출력 | chalk + cli-table3 |
| 테스트 | vitest (TDD) |
| 빌드 | tsc |
| 개발 | tsx |

### 보안

- 모든 쉘 실행에 `execFileSync` 사용 (`execSync`/`exec` 금지) — command injection 방지
- Git 명령어에 10초 타임아웃 — 무한 블로킹 방지
- 인수는 배열로 전달, 쉘 문자열 연결 금지

---

## 아키텍처

```
src/
├── cli.ts                        # CLI 진입점 (9 commands + global flags)
├── types/index.ts                # 모든 공유 타입
│
├── core/                         # 파이프라인 코어
│   ├── scanner.ts                # 스캔 조정기 (모든 스캐너 호출)
│   ├── pipeline.ts               # analyze() + init() (롤백 포함)
│   ├── verifier.ts               # 검증 조정기
│   └── updater.ts                # 증분 업데이트 (변경 감지)
│
├── scanner/                      # Phase 1: 데이터 수집
│   ├── file-tree.ts              # 디렉토리 구조 (.gitignore 인식, 파일 수 상한)
│   ├── git-info.ts               # Git 메타데이터 (타임아웃, 기여자 제한)
│   ├── ai-files.ts               # CLAUDE.md, .claude/ 감지
│   └── package-info.ts           # npm, cargo, pip, go, maven 매니페스트
│
├── analyzer/                     # Phase 2: 프로파일링
│   ├── language-detector.ts      # 언어/프레임워크/빌드도구/런타임
│   ├── structure-mapper.ts       # CLI/SPA/API/library/monorepo 패턴
│   ├── convention-extractor.ts   # 네이밍, 테스트, 린터, 커밋 스타일, 문서 언어
│   ├── dependency-analyzer.ts    # 주요 의존성 분류 (AI, DB, 서버 등)
│   └── maturity-detector.ts      # greenfield/early/growing/mature
│
├── recommender/                  # Phase 3: 지능적 추천
│   ├── catalog.ts                # 14개 도구 카탈로그
│   ├── scorer.ts                 # 다차원 스코어링 (태그, 성숙도, 범용성)
│   ├── conflict-detector.ts      # 충돌/시너지 감지 (4개 규칙)
│   ├── recommender.ts            # 조정기 (필터 → 스코어 → 충돌 → 제한)
│   └── installer.ts              # 도구 설치 (marketplace/npx/git-clone/pip)
│
├── planner/                      # Phase 4: 계획
│   └── planner.ts                # GenerationPlan 조립
│
├── generator/                    # Phase 5: 생성
│   ├── claude-md.ts              # CLAUDE.md (소유권 마커 포함)
│   ├── claude-plugin.ts          # plugin.json + skills/dev.md
│   └── ai-provider.ts            # Claude API 라우팅 (로컬 폴백)
│
├── placer/                       # Phase 6: 배치
│   ├── backup.ts                 # 난독 백업 (.dat) + manifest
│   ├── markers.ts                # 소유권 마커 추출/머지
│   └── writer.ts                 # 파일 쓰기 (merge/create 모드)
│
├── validator/                    # Phase 7: 검증
│   ├── claude-md.ts              # CLAUDE.md 유효성 (명령어, 마커, 구조)
│   └── plugin-schema.ts          # plugin.json 스키마 검증
│
├── reporter/                     # 출력
│   ├── terminal.ts               # 컬러 테이블 (chalk + cli-table3)
│   ├── markdown.ts               # 마크다운 보고서 생성
│   └── progress.ts               # PhaseTimer (--verbose용)
│
├── team/                         # 팀 협업
│   └── config.ts                 # team/local config 분리 + .gitignore
│
├── rollback/                     # 롤백
│   └── uninstaller.ts            # 전체 제거 + 개별 도구 제거
│
├── ci/                           # CI/CD
│   └── check.ts                  # 비대화형 검증 (종료 코드)
│
├── runtime/                      # 런타임 관리
│   ├── prerequisite.ts           # 버전 확인 (Node/Python/Git/uv/volta)
│   └── detector.ts               # 런타임 감지 (uv/volta 매니저 판별)
│
└── skill/                        # Claude Code 통합
    └── SKILL.md                  # /slaminar 스킬 정의
```

---

## 개발

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 개발 모드
npm run dev -- init .

# 테스트
npm test              # 전체 실행
npm run test:watch    # 워치 모드

# 단일 테스트
npx vitest run tests/scanner/file-tree.test.ts
```

---

## 구현 과정

### Phase 1: Core Foundation

프로젝트 스캐폴딩, 타입 시스템, 4개 스캐너 (file-tree, git-info, ai-files, package-info), 5개 분석기 (language, structure, convention, dependency, maturity) 구현. `slaminar scan`과 `slaminar analyze` 명령어 동작.

**커밋:**
- `ecbff54` scaffold project
- `8535939` ~ `bcb10b1` 4개 스캐너 (TDD)
- `ffb8355` scanner coordinator
- `5cfaad0` ~ `560e3f9` 5개 분석기
- `162aa65` analyzer pipeline

### Phase 2: Recommendation Engine

14개 도구 카탈로그, 다차원 스코어링, 충돌/시너지 감지, 추천 조정기 구현. `slaminar recommend` 명령어 동작.

**커밋:**
- `936147f` recommendation types
- `12c7971` catalog (14 tools)
- `f01a127` conflict detector
- `13adfa4` multi-dimensional scorer
- `d7b004c` recommender coordinator + CLI

### Phase 3: Generation & Placement

CLAUDE.md 생성기 (소유권 마커), Claude Code 플러그인 생성기, 난독 백업 시스템, 마커 기반 머지, 파일 배치. `slaminar init` 전체 파이프라인 완성.

**커밋:**
- `cf11bc8` generation types
- `cc74e6c` CLAUDE.md generator
- `93c2a18` plugin generator
- `cca2242` backup system
- `ecd28fd` ownership markers
- `e4218f3` planner + writer + init CLI

### Phase 4: Verification & Reporter

CLAUDE.md 유효성 검증, plugin.json 스키마 검증, 터미널 컬러 테이블 리포터, 마크다운 보고서 생성. 7단계 파이프라인 완성.

**커밋:**
- `43ea5f8` plugin schema validator
- `4d8bdde` CLAUDE.md validator
- `05dacae` terminal reporter
- `3b1facc` markdown reporter
- `919f779` verifier coordinator + status CLI

### Phase 5+6: Team, CI, Rollback

팀 config 분리, 증분 업데이트, uninstall/remove 롤백, CI 검증, 나머지 CLI 명령어.

**커밋:**
- `8bd9bbb` team config
- `8669c2d` incremental updater
- `00e1d70` uninstall/remove
- `0042357` CI check
- `716d1bb` wire all CLI commands

### 품질 개선 (3차례 리뷰)

**1차 리뷰 — 에러 처리:**
- 글로벌 에러 핸들러 (9 commands)
- init 롤백 (실패 시 백업 복원)
- ensureGitignore + team config 저장
- manifest finally 블록
- JSON 파싱 방어

**2차 리뷰 — 코드 리뷰:**
- 롤백 over-restore 버그 수정
- package.json main/prepare 수정
- git 타임아웃 + 기여자 제한
- 충돌 메시지 winner 표시
- ESM import 수정
- flattenTree 성능 최적화

**3차 리뷰 — 잔여 이슈:**
- `--dry-run` 플래그
- `--verbose` 플래그
- pipeline.test.ts + planner.test.ts
- prerequisite checker + runtime detector
- installer + AI provider
- SKILL.md
- naming convention 감지
- docs/ 하위 스캔

---

## 프로젝트 통계

| 항목 | 수치 |
|------|------|
| 소스 모듈 | 37개 |
| 테스트 파일 | 34개 |
| 테스트 케이스 | 157개 |
| 커밋 | 48개 |
| CLI 명령어 | 9개 |
| 카탈로그 도구 | 14개 |

---

## FAQ

### Q. 기존 CLAUDE.md가 덮어써질까 걱정됩니다.
A. 모든 기존 파일은 `.slaminar/.bk/` 아래 난독 파일명으로 먼저 백업됩니다. 또한 slaminar가 생성한 섹션은 `<!-- slaminar:begin/end -->` 마커로 감싸지며, 사용자가 직접 작성한 콘텐츠는 절대 건드리지 않습니다. `slaminar uninstall`로 언제든 원상복구 가능합니다.

### Q. 추천된 도구를 실제로 설치하나요?
A. `slaminar init`은 파일 생성까지만 합니다. 도구 설치는 `installer` 모듈을 통해 별도 지원됩니다. 각 도구의 설치 명령어는 추천 결과에 포함되므로 사용자가 직접 확인 후 설치할 수 있습니다.

### Q. 외부 서버 인증이 필요한가요?
A. 아니요. slaminar 자체는 완전히 로컬에서 동작합니다. 카탈로그에 포함된 14개 도구 중 인증이 필요한 것은 자동 제외됩니다. AI 모드는 선택적이며 `ANTHROPIC_API_KEY` 없이도 로컬 규칙 기반으로 동작합니다.

### Q. 팀에서 함께 사용할 수 있나요?
A. `.slaminar/config.json`은 커밋하고, `.slaminar/config.local.json`과 `.slaminar/.bk/`는 gitignore 처리됩니다. 팀원은 `slaminar update`로 설정을 동기화할 수 있고, `.slaminar/reports/*.md` 보고서를 PR 리뷰 근거로 사용할 수 있습니다.

### Q. CI에서 검증할 수 있나요?
A. `slaminar check --ci`를 사용하세요. 종료 코드 0(정상), 1(경고), 2(오류)로 CI 파이프라인에 통합할 수 있습니다.

### Q. 어떤 프로젝트에 사용할 수 있나요?
A. TypeScript/JavaScript, Python, Rust, Go, Java/Kotlin/Scala, Elixir 프로젝트에 적용 가능합니다. 새 프로젝트(greenfield)부터 200+ 커밋의 성숙한 프로젝트까지 성숙도에 따라 다른 전략으로 추천합니다.

---

## 기여

Issues와 Pull Requests를 환영합니다.

### 기여 절차

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD 권장)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### 개발 원칙

- **TDD**: 모든 기능은 테스트 먼저 작성
- **작은 커밋**: 하나의 관심사에 하나의 커밋
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:` 등
- **보안**: 쉘 실행은 항상 `execFileSync` (arguments as array)
- **한국어 문서**: 코드 주석은 영어, 사용자 문서는 한국어 우선

### 새 도구 카탈로그에 추가하기

1. `src/recommender/catalog.ts`에 `CatalogTool` 엔트리 추가
2. 필수 정보: name, repo, category, installMethod, installCommands, tags, maturityFit
3. 인증 필요 여부 (`authRequired`), 네트워크 필요 여부 (`networkRequired`) 정확히 기재
4. `tests/recommender/catalog.test.ts` 업데이트

---

## 라이선스

MIT

---

## 작성자

**pathcosmos** ([@pathcosmos](https://github.com/pathcosmos))

## 관련 프로젝트

- [sincenety](https://github.com/pathcosmos/sincenety) — Claude Code 작업 세션 자동 기록 도구 (같은 작성자)
- [mdmizer](https://github.com/pathcosmos/mdmizer) — 마크다운 저장소 뷰어 SPA (같은 작성자)

## 감사

Claude Code 생태계의 다양한 도구 제작자들에게 감사드립니다:
- [caveman](https://github.com/JuliusBrussee/caveman) — 토큰 절약
- [planning-with-files](https://github.com/OthmanAdi/planning-with-files) — 마크다운 계획 수립
- [impeccable](https://github.com/pbakaus/impeccable) — 프론트엔드 디자인
- [graphify](https://github.com/safishamsi/graphify) — 지식 그래프
- 기타 카탈로그에 포함된 14개 도구
