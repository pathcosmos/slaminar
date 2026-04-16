# slaminar

[![Tests](https://img.shields.io/badge/tests-204%20passing-brightgreen)](https://github.com/pathcosmos/slaminar)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구**

아무 코드베이스에 `slaminar init`을 실행하면, 프로젝트를 자동 분석하고 맞춤형 CLAUDE.md, Claude Code 플러그인, 그리고 생태계 도구 추천을 생성합니다.

[English Documentation](./README.md)

---

## 목차

- [데모](#slaminar)
- [주요 기능](#주요-기능)
- [설치](#설치)
- [사용법](#사용법)
- [프로젝트 분석 능력](#프로젝트-분석-능력)
- [생성물](#생성물)
- [동적 카탈로그](#동적-카탈로그)
  - [커스텀 카탈로그 작성](#커스텀-카탈로그-작성)
  - [카탈로그 설정 영속화](#카탈로그-설정-영속화)
- [검증 시스템](#검증-시스템)
- [에러 처리 및 안전장치](#에러-처리-및-안전장치)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [개발](#개발)
- [구현 과정](#구현-과정)
- [로드맵](#로드맵)
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

46개 Claude Code 생태계 도구를 포함한 온라인 카탈로그에서 프로젝트에 맞는 도구를 자동 선별합니다 (릴리즈와 독립적으로 업데이트 가능).

**추천 로직:**
- 다차원 스코어링 (언어/프레임워크 매칭, 성숙도 적합도, 태그 매칭)
- 충돌/중복 감지 (caveman ↔ everything-claude-code 등)
- 성숙도별 도구 수 제한 (greenfield: 2개, early: 3개, growing: 5개, mature: 7개)
- 외부 인증 필요 도구 자동 제외
- `--catalog <url>` 플래그로 사설/기업용 카탈로그 지원

**카탈로그 포함 도구 (46개):**

15개 카테고리에 걸쳐 46개 도구를 제공합니다. 토큰/성능, 계획, 프론트엔드, 테스트, 메모리, 보안, 품질, 팀 워크플로우, DevOps, 데이터베이스, 프레임워크별 스킬 등 — 전체 목록은 [동적 카탈로그](#카탈로그-도구-46개) 섹션 또는 `slaminar catalog list`로 확인할 수 있습니다.

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

**Config 스키마 및 기본값:**

`.slaminar/config.json` (팀용, 커밋):
```json
{
  "slaminarVersion": "0.1.0",
  "excludeAuthTools": true,
  "fileCountCap": 10000,
  "approvedTools": [],
  "catalogVersion": "",
  "catalogUrl": "",
  "catalogMode": "replace"
}
```

| 필드 | 설명 |
|------|------|
| `slaminarVersion` | 이 config를 생성한 slaminar 버전 |
| `excludeAuthTools` | 외부 인증 필요 도구 자동 제외 |
| `fileCountCap` | 파일 트리 분석 시 최대 스캔 파일 수 |
| `approvedTools` | 팀이 승인한 도구 이름 (빈 배열 = 모든 추천 허용) |
| `catalogVersion` | 세팅 시점의 카탈로그 버전 (향후 버전 고정 기능용 예약) |
| `catalogUrl` | 커스텀 카탈로그 URL (빈 문자열 = 공식 카탈로그). `slaminar catalog config --url`로 설정 |
| `catalogMode` | `replace` (기본) 또는 `extend`. `slaminar catalog config --mode`로 설정 |

`.slaminar/config.local.json` (개인용, gitignore):
```json
{
  "aiMode": "auto",
  "personalTools": []
}
```

| 필드 | 설명 |
|------|------|
| `aiMode` | `auto` (프로바이더 자동 감지), `ai` (AI 필수), `local` (AI 사용 안 함) |
| `personalTools` | 사용자별 도구 추가 예약 필드 (아직 미활성 — [로드맵](#로드맵) 참고) |

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

# AI 개선 비활성화 (로컬 규칙만 사용)
slaminar init --no-ai .

# 커스텀/사설 도구 카탈로그 사용
slaminar init --catalog https://company.com/catalog.json .
```

### AI 개선 (선택적)

`slaminar login`을 한 번만 실행하면 모든 프로젝트에서 AI 기반 CLAUDE.md 개선이 자동 적용됩니다.

```bash
slaminar login       # 인터랙티브 설정 (최초 1회)
slaminar whoami      # 현재 로그인 상태 확인
slaminar auth test   # 토큰 및 API 호출 진단
slaminar auth switch cloudflare   # 프로바이더 전환
slaminar logout      # 자격 증명 제거
```

#### `slaminar login` 플로우

```
? 어떤 AI 프로바이더를 사용하시겠어요?
❯ Cloudflare Workers AI  (무료 10K/일 · 추천)
  Anthropic Claude API   (유료 · 최고 품질)

→ 브라우저가 토큰 발급 페이지로 열림
? 토큰 붙여넣기: *****
  ✓ Token valid
  ○ Account access: Workers AI-only 토큰 정상
  ✓ Workers AI inference: 17 tokens used (956ms)

? 사용할 모델:
❯ Llama 3.3 70B ★  (추천)
  Llama 3.1 8B
  Mistral Small 3.1 24B
  Gemma 3 12B

✓ ~/.config/slaminar/auth.json 저장 완료 (권한 0600)
```

#### 설정 저장 위치

| 위치 | 우선순위 | 용도 |
|------|---------|------|
| CLI 플래그 (`--no-ai`) | 1 (최고) | 일회성 비활성 |
| 환경변수 (`CLOUDFLARE_*`, `ANTHROPIC_API_KEY`) | 2 | CI/일회성 |
| `~/.config/slaminar/auth.json` (0600) | 3 | `slaminar login`으로 저장 |
| (없음) | 4 | 로컬 규칙만 사용 |

#### 프로바이더 및 모델

**Cloudflare Workers AI (권장):**
- 무료 한도: 10,000 Neurons/day (실질적 무제한)
- 필요 권한: `Workers AI: Read` (최소 권한)
- 토큰 발급: https://dash.cloudflare.com/profile/api-tokens
- 기본 모델: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (24K context)
- 가능한 모델: Llama 3.3/3.1, Mistral Small 3.1, Gemma 3, Qwen 2.5 Coder

**Anthropic Claude:**
- 최고 품질, 유료
- API 키: https://console.anthropic.com/settings/keys
- 모델: `claude-sonnet-4`
- 추가 의존성: `npm install @anthropic-ai/sdk`

#### 강제 프로바이더 선택

```bash
export SLAMINAR_AI_PROVIDER=cloudflare   # 또는 anthropic, local
```

#### 팀 사용

- `~/.config/slaminar/auth.json`은 **개인 파일** — git에 커밋되지 않음
- 팀원 각자 `slaminar login` 실행
- 팀 설정(`.slaminar/config.json`)은 승인된 도구 목록만 공유, 토큰은 절대 저장 X
- CI에서는 환경변수 사용 (`CLOUDFLARE_API_TOKEN` GitHub Secret 등)

#### 인라인 프롬프트

AI 미설정 상태에서 `slaminar init` 실행 시 자동으로 설정 제안:

```
$ slaminar init .

⚠  AI 프로바이더가 설정되지 않았습니다.
   설정하면 CLAUDE.md가 AI로 자동 개선됩니다 (Cloudflare 무료 옵션 제공).

? 지금 설정할까요? (건너뛰면 로컬 규칙으로 진행) [Y/n]: _
```

### 개별 명령어

```bash
# 프로젝트 스캔 (JSON 출력)
slaminar scan .

# 프로젝트 분석 (JSON 출력)
slaminar analyze .

# 도구 추천 (JSON 출력)
slaminar recommend .
slaminar recommend --catalog https://example.com/catalog.json .

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

### 카탈로그 관리

도구 카탈로그는 slaminar를 업그레이드하지 않아도 독립적으로 업데이트할 수 있습니다:

```bash
slaminar catalog update                    # 최신 카탈로그 가져오기 + diff 표시
slaminar catalog update --catalog <url>    # 커스텀 URL에서 가져오기
slaminar catalog list                      # 전체 도구 테이블 보기
slaminar catalog search <query>            # 이름, 태그, 설명으로 검색
slaminar catalog check                     # 사용 중단 도구 감지 + 대체 도구 안내
slaminar catalog info <name>               # 도구 상세 정보
slaminar catalog status                    # 캐시 상태 (나이, 유효성, 소스)
slaminar catalog rollback                  # 이전 카탈로그 버전 복원
slaminar catalog config                    # 카탈로그 URL + 모드 영속 설정 보기/변경
```

**사용 중단 감지:** 카탈로그의 도구에는 `deprecated: true` 플래그와 선택적으로 `deprecatedReason`(사유), `replacedBy`(대체 도구) 필드가 있을 수 있습니다. `slaminar catalog check`를 실행하면 추천된 도구 중 사용 중단된 것을 찾아 사유와 대체 도구를 안내합니다.

### AI 인증 명령어

```bash
# 인터랙티브 로그인 (프로바이더 선택 → 토큰 입력 → 모델 선택 → 검증)
slaminar login

# 현재 로그인 상태 확인
slaminar whoami

# 로그아웃 (자격 증명 삭제)
slaminar logout

# 상세 인증 상태
slaminar auth status

# 토큰 및 API 호출 진단
slaminar auth test

# 프로바이더 전환
slaminar auth switch cloudflare
slaminar auth switch anthropic
```

### 플래그

| 플래그 | 설명 | 사용 가능 명령어 |
|--------|------|-----------------|
| `--dry-run` | 미리보기만, 파일 쓰지 않음 | init, update |
| `--verbose` | 상세 분석 출력 | init, recommend, status |
| `--json` | 머신 가독 JSON 출력 | check |
| `--no-ai` | AI 개선 비활성화 | init |
| `--catalog <url>` | 커스텀 카탈로그 URL 사용 | init, recommend, catalog update |
| `--catalog-mode <mode>` | 카탈로그 모드: `extend` 또는 `replace` | init, recommend, catalog update |

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

## 동적 카탈로그

slaminar의 도구 카탈로그는 CLI 릴리즈와 독립적으로 진화하도록 설계되었습니다:

- **온라인 카탈로그**: 46개 도구를 GitHub에서 가져옴 (이 저장소의 `catalog/catalog.json`), slaminar 업그레이드 없이 업데이트 가능
- **로컬 캐시**: `~/.config/slaminar/catalog-cache.json`에 24시간 TTL로 캐시 (파일 권한 `0600`)
- **Fallback 체인**: 유효 캐시 → 원격 fetch → 만료 캐시 → 번들 폴백 (오프라인에서도 항상 동작)
- **ETag 지원**: 조건부 HTTP 요청 — 원격 카탈로그가 변경되지 않았으면 서버가 `304 Not Modified`로 응답하여 데이터 전송 없음
- **카탈로그 diff**: `slaminar catalog update` 시 추가/제거/사용중단/변경된 도구를 컬러 터미널 출력
- **커스텀 카탈로그 URL**: `--catalog <url>`로 사설/기업용 도구 레지스트리 사용
- **롤백**: `slaminar catalog rollback`으로 이전 카탈로그 버전 즉시 복원 (`catalog-cache.prev.json`에서 복구)

**Fallback 체인 동작 원리:**

```
slaminar catalog update (또는 init/recommend)
  │
  ├─ 1. 유효한 캐시가 있는가? (24시간 이내)
  │     YES → 캐시 사용
  │     NO  ↓
  ├─ 2. 원격 URL에서 fetch (ETag 있으면 조건부 요청)
  │     200 OK    → 캐시 저장, 새 카탈로그 사용
  │     304       → 캐시를 fresh로 갱신, 캐시 사용
  │     실패      ↓
  ├─ 3. 만료된 캐시가 있는가? (오래됐지만 존재)
  │     YES → 만료 캐시 사용 (경고 표시)
  │     NO  ↓
  └─ 4. 번들 카탈로그 사용 (14개 도구, 항상 사용 가능)
```

### 카탈로그 도구 (46개)

| 카테고리 | 도구 |
|----------|------|
| **토큰/성능** | caveman, everything-claude-code, moyu |
| **계획/스펙** | planning-with-files, get-shit-done, spec-kit |
| **프론트엔드** | impeccable, senior-frontend |
| **테스트/QA** | playwright-skill, tdd-guard, test-kitchen |
| **메모리/컨텍스트** | claude-mem, reporecall, knowledge-graph |
| **코드 분석** | graphify, cartographer |
| **보안** | trailofbits/skills, awesome-claude-skills-security |
| **품질 게이트** | vibeguard, review-squad, obey |
| **팀/워크플로우** | oh-my-claudecode, vibe-kanban, ccpm |
| **멀티 에이전트** | wshobson/agents, claude-code-subagents |
| **DevOps/IaC** | terraform-skill, hashicorp/agent-skills, devops-claude-skills, container-use |
| **데이터베이스** | supabase/agent-skills, pg-aiguide |
| **프레임워크별** | laravel/agent-skills, claude-on-rails, apollographql/skills, developer-kit, rafaelkamimura/claude-tools, claude-elixir-phoenix |
| **온보딩/유틸** | claude-code-templates, cc-safe-setup, preflight |
| **모니터링/LSP** | claude-hud, claude-code-lsps, homunculus |

전체 목록: `slaminar catalog list`

### 커스텀 카탈로그 작성

`--catalog <url>` 플래그로 자체 카탈로그를 사용할 수 있습니다. `RemoteCatalog` JSON 스키마를 따라야 합니다.

**최소 형식** (`tools`만 필수):

```json
{
  "tools": [
    {
      "name": "my-internal-tool",
      "repo": "company/internal-tool",
      "category": "skill",
      "description": "사내 전용 코드 리뷰 도구",
      "authRequired": false,
      "networkRequired": "none",
      "installMethod": "git-clone",
      "installCommands": ["git clone https://git.company.com/tool.git ~/.claude/skills/tool"],
      "prerequisites": [],
      "tags": ["code-review", "internal"],
      "maturityFit": ["growing", "mature"]
    }
  ]
}
```

**전체 형식** (선택 필드 포함):

```json
{
  "version": "1.0.0",
  "minSlaminarVersion": "0.2.0",
  "updatedAt": "2026-04-16T00:00:00Z",
  "tools": [],
  "suggestions": [],
  "relations": []
}
```

**CatalogTool 필드:**

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `name` | string | O | 고유 도구 이름 |
| `repo` | string | O | GitHub `owner/repo` |
| `category` | string | O | `plugin`, `skill`, `hook`, `agent`, `workflow` 중 택1 |
| `description` | string | O | 간단한 설명 |
| `authRequired` | boolean | O | 외부 인증 필요 여부 (true면 추천에서 자동 제외) |
| `networkRequired` | string | O | `none`, `partial`, `full` |
| `installMethod` | string | O | `marketplace`, `npx`, `git-clone`, `pip` |
| `installCommands` | string[] | O | 설치 쉘 명령어 |
| `prerequisites` | string[] | O | 런타임 요구사항 (예: `["python>=3.10"]`) |
| `tags` | string[] | O | 스코어링 태그 (예: `["typescript", "testing"]`) |
| `maturityFit` | string[] | O | `greenfield`, `early`, `growing`, `mature` |
| `deprecated` | boolean | — | 사용 중단 여부 |
| `deprecatedReason` | string | — | 사용 중단 사유 |
| `replacedBy` | string | — | 대체 도구 이름 |

**사용법:**

```bash
# CLI 플래그로 일회성 사용
slaminar init --catalog https://company.com/catalog.json .
slaminar recommend --catalog https://company.com/catalog.json .
slaminar catalog update --catalog https://company.com/catalog.json
```

`version`, `suggestions`, `relations`를 생략하면 기본값(빈 배열, 버전 "0.0.0")이 사용됩니다.

### 카탈로그 설정 영속화

매번 `--catalog <url>`을 붙이는 대신, 프로젝트 설정에 커스텀 카탈로그 URL과 모드를 저장할 수 있습니다:

```bash
# extend 모드로 커스텀 카탈로그 설정 (공식과 병합)
slaminar catalog config --url https://company.com/catalog.json --mode extend

# replace 모드로 커스텀 카탈로그 설정 (커스텀만 사용)
slaminar catalog config --url https://company.com/catalog.json --mode replace

# 현재 설정 확인
slaminar catalog config

# 설정 초기화 (공식 카탈로그로 복원)
slaminar catalog config --clear
```

**extend vs. replace 모드:**

| 모드 | 동작 |
|------|------|
| **extend** | 커스텀 도구가 공식 카탈로그와 **병합**됩니다. 동일 이름 도구가 있으면 커스텀 버전이 우선합니다. |
| **replace** | 커스텀 카탈로그**만** 사용됩니다. 공식 카탈로그는 무시됩니다 (번들 카탈로그는 오프라인 폴백으로 유지). |

**우선순위** (높은 순):

| 소스 | 우선순위 |
|------|:--------:|
| CLI 플래그 (`--catalog`, `--catalog-mode`) | 1 (최고) |
| 프로젝트 설정 (`.slaminar/config.json`) | 2 |
| 기본값 (공식 카탈로그, replace 모드) | 3 |

참고: `--catalog <url>`을 `--catalog-mode` 없이 사용하면 하위호환을 위해 replace 모드가 기본 적용됩니다.

**팀 시나리오:**

```bash
# 기업: 공식 카탈로그에 사내 도구 추가
slaminar catalog config --url https://tools.company.com/catalog.json --mode extend
# → 팀원이 git pull 후 공식 + 사내 도구 모두 추천받음

# 보안팀: 승인된 도구만 허용
slaminar catalog config --url https://security.company.com/approved.json --mode replace
# → 보안 승인 도구만 추천됨
```

**extend 모드 다이어그램:**

```
slaminar recommend (extend 모드)
  │
  ├─ 1. 공식 카탈로그 resolve (fallback 체인)
  │     → 46개 공식 도구
  │
  ├─ 2. 커스텀 카탈로그 fetch
  │     → N개 커스텀 도구
  │     (fetch 실패 시 → 공식만 사용 + 경고)
  │
  └─ 3. 병합: 공식 + 커스텀
        → 동일 이름: 커스텀 우선
        → relations: 중복 제거 후 합산
        → suggestions: 공식만 취급
```

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

- **AI 프로바이더 체인**: 환경변수 → auth.json → 로컬 규칙. 어디서든 중단되지 않음
- **AI 호출 실패**: HTTP/네트워크/토큰 오류 모두 graceful 처리 — 로컬 draft 반환
- **Anthropic SDK 미설치**: API 키만 있어도 SDK 없으면 자동으로 로컬 모드
- **Cloudflare Account 자동 감지 실패**: `/accounts` → `/memberships` → 수동 입력 3단계 폴백
- **Python 없음**: graphify 대신 cartographer 추천 (같은 목적, 다른 런타임)
- **모든 도구 점수 0**: 빈 추천 반환 (CLAUDE.md + 플러그인은 여전히 생성)
- **Git 없음**: git 관련 분석 건너뛰기, 성숙도 = greenfield
- **카탈로그 원격 fetch 실패**: 만료 캐시 → 번들 카탈로그 순서로 폴백

### AI 인증 예외 처리

- **잘못된 토큰**: `auth test`에서 단계별 진단 → HTTP 상태, 에러 코드, 네트워크 오류 구분
- **토큰 권한 부족**: 어떤 권한이 필요한지 친절한 안내 (예: "User: Memberships: Read 추가 권장")
- **손상된 auth.json**: JSON.parse 실패 시 자동으로 null 반환 → 로컬 모드 fallback
- **TTY 아닌 환경**: 인라인 프롬프트 자동 비활성화 (CI 친화적)
- **Ctrl+C 중단**: inquirer의 force-close 에러를 조용히 처리 (스택 트레이스 X)

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
- 인증 토큰은 `~/.config/slaminar/auth.json` (0600 권한)에 저장 — 프로젝트 디렉토리에 절대 저장 안 함

---

## 아키텍처

```
src/
├── cli.ts                        # CLI 진입점 (21 commands + global flags)
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
│   ├── catalog.ts                # 번들 도구 카탈로그 (오프라인 폴백)
│   ├── catalog-resolver.ts       # 카탈로그 해석 (캐시 → 원격 → 만료캐시 → 번들)
│   ├── catalog-cache.ts          # 로컬 캐시 (24h TTL + 롤백)
│   ├── catalog-remote.ts         # 원격 fetch (ETag 조건부 요청)
│   ├── catalog-diff.ts           # Diff 엔진 (추가/제거/사용중단/변경)
│   ├── catalog-merger.ts         # 공식 + 커스텀 카탈로그 병합 (extend 모드)
│   ├── scorer.ts                 # 다차원 스코어링 (태그, 성숙도, 범용성)
│   ├── conflict-detector.ts      # 충돌/시너지 감지
│   ├── recommender.ts            # 조정기 (필터 → 스코어 → 충돌 → 제한)
│   └── installer.ts              # 도구 설치 (marketplace/npx/git-clone/pip)
│
├── planner/                      # Phase 4: 계획
│   └── planner.ts                # GenerationPlan 조립
│
├── generator/                    # Phase 5: 생성
│   ├── claude-md.ts              # CLAUDE.md (소유권 마커 포함)
│   ├── claude-plugin.ts          # plugin.json + skills/dev.md
│   ├── ai-provider.ts            # AI 라우팅 (Cloudflare/Anthropic/local)
│   └── cloudflare-ai.ts          # Cloudflare Workers AI 어댑터 (native fetch)

├── auth/                         # AI 프로바이더 인증 (login/whoami/logout)
│   ├── config.ts                 # ~/.config/slaminar/auth.json (0600)
│   ├── models.ts                 # Cloudflare/Anthropic 모델 카탈로그
│   ├── diagnostics.ts            # 토큰 검증, /user, /memberships, 추론 테스트
│   └── wizard.ts                 # 인터랙티브 login 플로우
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

### Phase 7: Cloudflare Workers AI 통합 + 통합 인증 UX

실질적 사용자 편의성을 대폭 개선한 단계. AI 개선 기능에 Cloudflare Workers AI를 추가하고 (무료 10K/일), gh/wrangler/vercel 스타일의 `login`/`whoami`/`logout` 명령어 그룹으로 모든 AI 설정을 통일.

**주요 작업:**
- **Cloudflare Workers AI provider** — native fetch 기반, SDK 의존성 없음. 14+ 모델 지원 (Llama 3.3 70B, Mistral Small 3.1, Gemma 3 등)
- **AI provider 라우팅** — Cloudflare/Anthropic/local 자동 선택, 무료 옵션 우선
- **`slaminar login` 인터랙티브 위자드** — 프로바이더 선택 → 브라우저 자동 오픈 → 토큰 입력 → 모델 선택 → 실제 추론 테스트까지 자동
- **토큰 권한 자동 감지** — `/user`로 이메일 확인, `/memberships`로 Account ID 자동 감지 (수동 입력 제거)
- **설정 파일 보안** — `~/.config/slaminar/auth.json` (0600 권한, XDG 표준)
- **해결 우선순위** — CLI flag → 환경변수 → auth.json → local fallback
- **인라인 프롬프트** — `slaminar init`에서 AI 미설정 시 자동으로 설정 유도

**커밋:**
- `66518ef` Cloudflare Workers AI provider (free-tier)
- `627a34f` slaminar login/whoami/logout — unified AI auth UX
- `d8acd6a` Cloudflare account auto-detection via /memberships

### Phase 8: 동적 카탈로그 시스템 (v0.2.0)

도구 카탈로그를 릴리즈 사이클에서 분리. 온라인 카탈로그 (24개 도구), 로컬 캐시 (24h TTL), ETag 조건부 요청, fallback 체인, 업데이트 diff, 7개 `slaminar catalog` 서브커맨드.

### Phase 9: 커스텀 카탈로그 URL (v0.3.0)

`--catalog <url>` 플래그를 `init`, `recommend`, `catalog update` 명령어에 추가. 기업/사설 카탈로그 호스팅 지원. CLI 버전 문자열 수정 및 카탈로그 해석기 테스트 안정화.

### Phase 10: 카탈로그 설정 영속화 + 카탈로그 확장 (v0.4.0)

`catalog config` 명령어로 커스텀 카탈로그 URL과 모드(extend/replace)를 프로젝트 설정에 영속 저장. extend 모드는 커스텀 도구를 공식 카탈로그와 병합하고, replace 모드는 커스텀만 사용. 온라인 카탈로그를 24개에서 46개로 확장 — DevOps, 팀 워크플로우, 품질 게이트, 데이터베이스, 테스트, 프론트엔드, 프레임워크별 도구 추가. 14개의 새 relation 규칙 추가.

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

## 로드맵

향후 릴리즈에서 검토 중인 기능:

| 기능 | 설명 | 상태 |
|------|------|------|
| **멀티 소스 카탈로그** | 여러 카탈로그 소스(공식 + 회사 + 개인)를 우선순위 레이어로 병합 | MVP 구현 (`catalog config --mode extend`) |
| **`catalog source` CLI** | `catalog source add/remove/list/test`로 카탈로그 소스 관리 | 계획 |
| **개인 도구** | 로컬 config의 `personalTools` 필드로 사용자별 도구 추가 | 스텁 (타입만 존재) |
| **`slaminar install`** | 추천 도구를 CLI에서 직접 설치 | 계획 |
| **카탈로그 신뢰 레벨** | 외부 카탈로그의 `trusted` / `untrusted` / `verified` 신뢰 모델 | 계획 |
| **`SLAMINAR_CATALOG_SOURCES` 환경변수** | CI용 멀티 카탈로그 환경변수 설정 | 계획 |

자세한 멀티 소스 카탈로그 설계는 [`docs/superpowers/specs/2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md)를 참고하세요.

---

## 프로젝트 통계

| 항목 | 수치 |
|------|------|
| 소스 모듈 | 47개 |
| 테스트 파일 | 42개 |
| 테스트 케이스 | 213개 |
| CLI 명령어 | 21개 |
| 카탈로그 도구 | 46개 (온라인) + 14개 (번들 폴백) |
| AI 프로바이더 | 2개 (Cloudflare, Anthropic) |

---

## FAQ

### Q. 기존 CLAUDE.md가 덮어써질까 걱정됩니다.
A. 모든 기존 파일은 `.slaminar/.bk/` 아래 난독 파일명으로 먼저 백업됩니다. 또한 slaminar가 생성한 섹션은 `<!-- slaminar:begin/end -->` 마커로 감싸지며, 사용자가 직접 작성한 콘텐츠는 절대 건드리지 않습니다. `slaminar uninstall`로 언제든 원상복구 가능합니다.

### Q. 추천된 도구를 실제로 설치하나요?
A. 아니요. `slaminar init`은 파일 생성(CLAUDE.md, 플러그인, 보고서)까지만 합니다. 각 추천 도구의 설치 명령어는 결과 출력과 보고서에 포함되므로 직접 확인 후 실행할 수 있습니다. 자동 설치 기능은 향후 릴리즈에서 지원 예정입니다.

### Q. 외부 서버 인증이 필요한가요?
A. 아니요. slaminar 자체는 완전히 로컬에서 동작합니다. 카탈로그의 24개 도구 중 인증이 필요한 것은 자동 제외됩니다. AI 모드는 선택적이며 `ANTHROPIC_API_KEY` 없이도 로컬 규칙 기반으로 동작합니다.

### Q. 팀에서 함께 사용할 수 있나요?
A. `.slaminar/config.json`은 커밋하고, `.slaminar/config.local.json`과 `.slaminar/.bk/`는 gitignore 처리됩니다. 팀원은 `slaminar update`로 설정을 동기화할 수 있고, `.slaminar/reports/*.md` 보고서를 PR 리뷰 근거로 사용할 수 있습니다.

### Q. CI에서 검증할 수 있나요?
A. `slaminar check --ci`를 사용하세요. 종료 코드 0(정상), 1(경고), 2(오류)로 CI 파이프라인에 통합할 수 있습니다.

### Q. 어떤 프로젝트에 사용할 수 있나요?
A. TypeScript/JavaScript, Python, Rust, Go, Java/Kotlin/Scala, Elixir 프로젝트에 적용 가능합니다. 새 프로젝트(greenfield)부터 200+ 커밋의 성숙한 프로젝트까지 성숙도에 따라 다른 전략으로 추천합니다.

### Q. AI 개선을 꼭 설정해야 하나요?
A. 아니요. 전혀 설정하지 않아도 로컬 규칙 기반으로 완전히 동작합니다. AI를 설정하면 CLAUDE.md의 문장 품질과 설명의 구체성이 향상됩니다. Cloudflare Workers AI를 사용하면 하루 10,000 Neurons 무료 한도 내에서 충분히 사용 가능합니다 (실질적으로 무제한).

### Q. 토큰은 안전하게 저장되나요?
A. `~/.config/slaminar/auth.json`에 저장되며 파일 권한 `0600` (소유자만 읽기/쓰기)으로 보호됩니다. XDG 표준 준수. `.slaminar/` 디렉토리에는 절대 저장되지 않으므로 프로젝트 리포지토리에 토큰이 커밋될 위험이 없습니다.

### Q. Cloudflare vs Anthropic 중 무엇이 좋나요?
A. 일반 사용에는 **Cloudflare Workers AI**를 권장합니다. 무료 한도가 넉넉하고 Llama 3.3 70B로도 CLAUDE.md 개선 품질이 충분합니다. 최고 품질이 필요하거나 긴 컨텍스트 (200K+)를 써야 한다면 **Anthropic Claude**를 사용하세요. `slaminar auth switch`로 언제든 전환 가능합니다.

### Q. Cloudflare 토큰에 어떤 권한이 필요한가요?
A. 최소 `Workers AI: Read` 하나만 있으면 동작합니다. 추가로 다음을 주면 UX가 개선됩니다:
- `User: User Details: Read` — 로그인 시 이메일 자동 표시
- `User: Memberships: Read` — Account ID 자동 감지 (수동 입력 제거)
- `AI Gateway: Read` — 미래 캐싱/분석 기능용 (선택)

### Q. CI에서 AI를 사용하고 싶은데 어떻게 하나요?
A. CI에서는 환경변수를 사용하세요. `CLOUDFLARE_API_TOKEN`과 `CLOUDFLARE_ACCOUNT_ID`를 GitHub Secret 등으로 저장하고 워크플로우에서 env로 전달하면 auth.json 없이도 동작합니다. 해결 우선순위는 환경변수 > auth.json입니다.

### Q. 사설 도구 카탈로그를 사용할 수 있나요?
A. 네. 일회성으로는 `--catalog <url>` 플래그를 사용하고, 프로젝트에 영속 설정하려면 `slaminar catalog config --url <url> --mode extend` (공식과 병합) 또는 `--mode replace` (커스텀만 사용)를 실행하세요. 자세한 내용은 [카탈로그 설정 영속화](#카탈로그-설정-영속화)를 참고하세요.

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

## 버전 정책

**[Semantic Versioning](https://semver.org/)** 을 준수합니다. 버전 히스토리는 [CHANGELOG.md](./CHANGELOG.md) 참조.

| 버전 대역 | 단계 | 의미 |
|----------|------|------|
| `0.1.x` ~ `0.x.y` | **Alpha (현재)** | API 변경 가능, 초기 피드백 수집 |
| `0.9.x` | **Beta** | 기능 동결, 안정성 검증 |
| `1.0.0+` | **Stable** | API 안정, breaking change 시 major bump |

### 릴리스 방법 (maintainer 전용)

```bash
npm run release:patch   # 0.1.0 → 0.1.1 (버그 수정)
npm run release:minor   # 0.1.0 → 0.2.0 (새 기능)
npm run release:major   # 0.x.y → 1.0.0 (breaking change, 1.0부터)
```

위 명령어는 자동으로:
1. 테스트 실행 + 빌드
2. `package.json` 버전 bump
3. Git tag 생성 (`v0.1.1` 형식)
4. CHANGELOG.md 커밋에 포함

이후 `git push --follow-tags && npm publish` 로 게시.

**변경 유형 가이드:**
- **patch**: 버그 수정, 내부 리팩토링, 문서
- **minor**: 새 CLI 명령어/플래그, 새 AI 프로바이더, 새 도구 카탈로그 항목
- **major** (1.0+ 이후): CLI 명령어 제거/리네임, config 스키마 breaking change

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
- 기타 카탈로그에 포함된 모든 도구
