# slaminar

[![Tests](https://img.shields.io/badge/tests-250%20passing-brightgreen)](https://github.com/pathcosmos/slaminar)
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
  - [Claude Code 스킬 자동 배포](#claude-code-스킬-자동-배포)
- [사용법](#사용법)
  - [첫 실행 세팅 (v0.6+)](#첫-실행-세팅-v06)
  - [프로젝트 발견 & 일괄 적용 (v0.7+)](#프로젝트-발견--일괄-적용-v07)
  - [환경 진단 (`slaminar doctor`)](#환경-진단-slaminar-doctor)
  - [Claude Code 스킬 레퍼런스](#claude-code-스킬-레퍼런스)
- [프로젝트 분석 능력](#프로젝트-분석-능력)
- [생성물](#생성물)
- [동적 카탈로그](#동적-카탈로그)
  - [커스텀 카탈로그 작성](#커스텀-카탈로그-작성)
  - [카탈로그 설정 영속화](#카탈로그-설정-영속화)
  - [카탈로그 연합 (v0.8+)](#카탈로그-연합-v08)
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

**85개 Claude Code 생태계 도구**(catalog v2.3.0, 2026-04-20)를 포함한 온라인 카탈로그에서 프로젝트에 맞는 도구를 자동 선별합니다. 카탈로그는 `https://raw.githubusercontent.com/pathcosmos/slaminar/main/catalog/catalog.json`에서 서빙되며 **CLI 릴리즈와 독립적으로 업데이트**됩니다.

**추천 로직:**
- 다차원 스코어링 (언어/프레임워크 매칭, 성숙도 적합도, 태그 매칭)
- 충돌/중복 감지 (caveman ↔ everything-claude-code 등)
- 성숙도별 도구 수 제한 (greenfield: 2개, early: 3개, growing: 5개, mature: 7개)
- 토큰 비용 티어(`conservative` / `smart` / `rich`)로 고비용 도구 필터링
- 외부 인증 필요 도구 자동 제외
- `--catalog <url>` 플래그로 사설/기업용 카탈로그 지원

**카탈로그 포함 도구 (85개):**

섹션별로 구성된 전체 85개 도구. 토큰/성능, 계획, 프론트엔드, 테스트, 메모리, 보안, 품질, 팀, DevOps, 데이터베이스, 프레임워크, 문서, 다이어그램, AI 인프라, 메타 등 — 전체 목록은 `slaminar catalog list` 또는 섹션별 상세 레퍼런스 [`docs/catalog-tools-reference.md`](docs/catalog-tools-reference.md)에서 확인.

### 카탈로그 엔트리 작성 방식

카탈로그의 각 도구는 작고 명확한 스키마의 JSON 객체입니다. 실제 등록된 `marp` 도구를 최소 예시로 보여드립니다:

```json
{
  "name": "marp",
  "repo": "marp-team/marp",
  "category": "workflow",
  "description": "Markdown 프레젠테이션 생태계 — VS Code 확장 + CLI.",
  "authRequired": false,
  "networkRequired": "none",
  "installMethod": "npm-global",
  "installCommands": ["npm install -g @marp-team/marp-cli"],
  "prerequisites": ["node>=18"],
  "tags": ["presentation", "slides", "markdown", "cli"],
  "maturityFit": ["greenfield", "early", "growing", "mature"]
}
```

주요 필드 규칙:
- `installMethod`는 `marketplace | npx | git-clone | pip | npm-global | npm-dev | npm-init` 중 하나여야 함 (enum 강제)
- `category`는 `plugin | skill | hook | agent | workflow` 중 하나
- `maturityFit`는 `greenfield | early | growing | mature`의 부분집합
- `tags`는 프로젝트의 언어/프레임워크와 매칭되어 추천 스코어에 기여

**전체 스키마·작성 규칙·검증 워크플로**: [`docs/catalog-authoring-guide.md`](docs/catalog-authoring-guide.md)
**섹션별 도구 상세 레퍼런스**: [`docs/catalog-tools-reference.md`](docs/catalog-tools-reference.md)
**무인증·경량 설치 후보군(172개)**: [`docs/catalog-noauth-candidates-2026-04.md`](docs/catalog-noauth-candidates-2026-04.md)

### 안전한 파일 관리

- **소유권 마커**: `<!-- slaminar:begin:SECTION -->` / `<!-- slaminar:end:SECTION -->`으로 slaminar 생성 섹션 추적. 사용자가 수동으로 추가한 콘텐츠는 절대 건드리지 않음
- **난독 백업**: `.slaminar/.bk/{hex6}_{timestamp}.dat` — IDE/AI가 인식하지 않는 형태로 백업
- **증분 업데이트**: `slaminar update`는 변경된 섹션만 업데이트
- **완전 롤백**: `slaminar uninstall`로 모든 변경 되돌리기

### Claude Code 스킬 통합

v0.5.0부터 slaminar 전역 설치 시 자동으로 Claude Code 스킬로 등록되어 `/slaminar`로 호출하거나 자연어("이 프로젝트 세팅해줘", "slaminar `../other-repo` 에 돌려줘")로도 트리거할 수 있습니다.

- **자동 배포** — npm postinstall 훅이 SKILL.md를 `~/.claude/skills/slaminar/`에 배치. 수동 단계 불필요. 어떤 실패도 `npm install`을 중단시키지 않으며, CI와 전이적 설치(다른 패키지의 의존성으로 설치될 때)에서는 자동으로 건너뜁니다. `SLAMINAR_SKIP_POSTINSTALL=1`로 명시적 옵트아웃 가능.
- **경로 파라미터화** — 스킬이 선택적 `<path>`를 수용. 사용자가 요청에 폴더를 언급하면 Claude가 `slaminar init <path>`로 전달하고, 지정이 없으면 현재 작업 디렉토리(`.`)를 사용.
- **Content-hash 멱등성** — 번들된 SKILL.md와 설치된 사본이 동일하면 재설치는 no-op. 수정된 SKILL.md는 `~/.config/slaminar/skill-backups/`에 백업된 뒤 교체되며, `slaminar skill uninstall` 시 가장 최근 백업이 복원됩니다.
- **명시적 명령어** — 수동 제어가 필요할 때 `slaminar skill install/uninstall/status`로 자동 설치와 동일한 흐름 실행.

전체 명령어 표면은 [Claude Code 스킬 레퍼런스](#claude-code-스킬-레퍼런스), postinstall 동작 계약은 [Claude Code 스킬 자동 배포](#claude-code-스킬-자동-배포) 섹션을 참고하세요.

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

### Claude Code 스킬 자동 배포

전역 설치(`npm install -g slaminar`) 시, slaminar는 자기 자신을 Claude Code 스킬로도 등록하여 `/slaminar`로 호출하거나 "이 프로젝트 세팅해줘" 같은 자연어로도 트리거할 수 있게 해줍니다. 스킬은 다음 경로에 배치됩니다:

```
~/.claude/skills/slaminar/SKILL.md
```

**경로 파라미터** — 스킬은 선택적 타겟 경로를 지원합니다. 사용자가 폴더를 언급하면("`~/work/other-repo` 에 slaminar 돌려줘"), Claude가 `slaminar init <path>`로 전달합니다. 지정하지 않으면 현재 디렉토리를 사용합니다.

**스킬 관리 명령어:**

```bash
slaminar skill status      # 스킬 설치 여부와 번들 버전 일치 여부 확인
slaminar skill install     # 재설치 (기존 내용이 다르면 백업 생성)
slaminar skill install --force
slaminar skill uninstall   # 제거 (백업이 있으면 이전 SKILL.md 복원)
```

**자동 설치 옵트아웃**:

```bash
SLAMINAR_SKIP_POSTINSTALL=1 npm install -g slaminar
```

postinstall 훅은 CI 환경(`CI=true`)과 로컬/의존성 설치 시 자동으로 건너뛰며, **어떤 경우에도 `npm install`을 실패시키지 않습니다** — 오류 발생 시 경고만 출력하고 종료 코드 0으로 정상 종료합니다.

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

### 첫 실행 세팅 (v0.6+)

단일 명령어로 slaminar가 필요로 하는 모든 전역 설정을 순차적으로 진행합니다. 필요할 때 섹션만 재설정할 수 있습니다.

```bash
slaminar setup                          # 인터랙티브 6단계 위자드 (첫 실행)
slaminar setup --reconfigure auth       # AI 프로바이더만 재설정
slaminar setup --reconfigure catalog    # 카탈로그 URL/mode만 재설정
slaminar setup --reconfigure defaults   # aiMode / excludeAuthTools / fileCountCap / versionCheck
slaminar setup --reconfigure skill      # Claude Code 스킬 자동 설치 선호
slaminar setup --yes                    # 비대화형 (CI) — SLAMINAR_* 환경변수 사용
slaminar setup --no-discovery           # Step 6 프로젝트 스캔 단계를 건너뜀
slaminar setup --yes --apply-to-discovered   # CI: 발견된 모든 프로젝트에 init/update 일괄 적용
```

비대화형 `--yes` 모드가 읽는 환경 변수:

| 환경변수 | 용도 |
|---|---|
| `SLAMINAR_AI_PROVIDER` | `cloudflare` 또는 `anthropic` |
| `SLAMINAR_CF_TOKEN`, `SLAMINAR_CF_ACCOUNT_ID`, `SLAMINAR_CF_MODEL` | Cloudflare 자격 증명 |
| `SLAMINAR_ANTHROPIC_KEY`, `SLAMINAR_ANTHROPIC_MODEL` | Anthropic 자격 증명 |
| `SLAMINAR_CATALOG_URL`, `SLAMINAR_CATALOG_MODE` | 커스텀 카탈로그 |
| `SLAMINAR_DEFAULT_AI_MODE` | `auto` / `ai` / `local` |
| `SLAMINAR_EXCLUDE_AUTH_TOOLS` | `true` / `false` |
| `SLAMINAR_FILE_COUNT_CAP` | 정수 |
| `SLAMINAR_VERSION_CHECK` | `true` / `false` — 주간 npm 버전 체크 |
| `SLAMINAR_DISCOVER_ROOTS` | Step 6 discovery가 스캔할 루트들 (쉼표/공백 구분) |
| `SLAMINAR_BATCH_APPROVED` | 배치 적용할 프로젝트 루트들 (발견된 항목의 부분 집합) |
| `SLAMINAR_BATCH_DRY_RUN` | `true` — 배치 적용을 강제로 dry-run으로 |
| `SLAMINAR_ONLY_NEW` | `true` — `status === 'new'` 프로젝트로 제한 |
| `SLAMINAR_IMPORT_TEAM_CATALOG` | `true` — 팀 `catalogUrl`을 사용자 defaults로 자동 임포트 |

### 프로젝트 발견 & 일괄 적용 (v0.7+)

사용자가 지정한 루트들에서 Claude Code 프로젝트를 찾고, 선택적으로 모두에 대해 `init` / `update`를 일괄 실행합니다.

```bash
slaminar discover ~/work ~/projects              # 1회성 스캔 + ASCII 테이블
slaminar discover                                # defaults.json의 마지막 루트 재사용
slaminar discover ~/work --json                  # 기계 판독용 JSON 출력
slaminar discover ~/work --apply --dry-run       # 스캔 + 모든 init/update 미리보기
slaminar discover ~/work --apply --only-new      # "new"로 분류된 프로젝트만 처리
slaminar discover ~/work --no-cache              # 캐시 무시하고 강제 재스캔 (TTL 24h)
```

**분류 기준:**

| 상태 | 의미 | 제안 액션 |
|---|---|---|
| `new` | `.claude/`만 있고 `CLAUDE.md` 없음 | `init` |
| `configured` | `.slaminar/config.json` 있음 | `update` |
| `existing` | `CLAUDE.md`는 있으나 `.claude/` 없음 | `init-merge` (기존 내용 보존) |
| `unsupported` | 언어나 signature 감지 불가 | `skip` |

**안전성 참고:**

- 프로젝트 signature가 확인되면 그 아래로 내려가지 않아 `$HOME` 전체 스캔도 빠릅니다.
- `node_modules`, `.git`, `.venv`, `.cache`, `.turbo`, macOS `Library/`, `Applications/` 등은 기본적으로 제외됩니다.
- 심볼릭 링크는 따라가지 않으며, `realpath` inode 추적으로 순환도 방지합니다.
- 일괄 실행은 항상 `~/.config/slaminar/setup-logs/batch-<timestamp>.md`에 감사 로그를 남깁니다.
- 스캔 결과는 `~/.config/slaminar/discovery-cache.json`에 캐시됩니다 (TTL 24h). 강제 갱신은 `--no-cache`.

### 환경 진단 (`slaminar doctor`)

읽기 전용 헬스 체크. 종료 코드는 `0` (모두 통과), `1` (경고), `2` (실패).

```bash
slaminar doctor            # 사람이 읽을 수 있는 보고서
slaminar doctor --json     # CI용 기계 판독 가능 JSON
```

체크 항목:

- Node.js / git 버전
- slaminar 버전 + 스킬 설치 상태
- AI 프로바이더 가용성 (auth.json + env 변수)
- 카탈로그 캐시 신선도
- `~/.config/slaminar/`, `~/.claude/skills/slaminar/` 쓰기 권한
- `defaults.json` 유효성

### AI 개선 (선택적)

AI 기반 CLAUDE.md 개선은 `slaminar setup` 진행 중에 설정되며, 이후 모든 프로젝트에 자동 적용됩니다.

#### 설정 저장 위치

| 위치 | 우선순위 | 용도 |
|------|---------|------|
| CLI 플래그 (`--no-ai`) | 1 (최고) | 일회성 비활성 |
| 환경변수 (`CLOUDFLARE_*`, `ANTHROPIC_API_KEY`) | 2 | CI/일회성 |
| `~/.config/slaminar/auth.json` (0600) | 3 | `slaminar setup`으로 저장 |
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

### AI 인증 관리

v0.6부터 `login` / `whoami` / `logout` / `auth` 명령어는 제거되었습니다. 아래 대체 경로를 사용하세요.

```bash
# 인증 재설정 (프로바이더 선택 → 토큰 → 모델 → 검증)
slaminar setup --reconfigure auth

# 현재 로그인 상태 확인 + 토큰/API 호출 진단
slaminar doctor

# 로그아웃 (직접 파일 삭제 — 매우 드물게 필요)
rm ~/.config/slaminar/auth.json
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

### Claude Code 스킬 레퍼런스

`npm install -g slaminar` (또는 수동으로 `slaminar skill install`) 이후 스킬 파일이 `~/.claude/skills/slaminar/SKILL.md`에 자리잡고, Claude Code가 자동으로 인식합니다.

**Claude가 인식하는 호출 패턴:**

| 사용자 발화 | Claude 실행 명령 |
|---|---|
| `/slaminar` | `slaminar init --dry-run .` → 승인 요청 → `slaminar init .` |
| "이 프로젝트에 Claude Code 세팅해줘" | 위와 동일, 현재 CWD |
| "slaminar 돌려줘" | 위와 동일, 현재 CWD |
| "slaminar `../legacy-app` 에 돌려줘" | `slaminar init --dry-run ../legacy-app` → 승인 요청 → `slaminar init ../legacy-app` |
| "`~/work/other-repo` 을 slaminar로 분석" | 위와 동일, 해석된 절대 경로 사용 |
| "slaminar update this repo" | `slaminar update <path>` |
| "slaminar status" | `slaminar status <path>` |

SKILL.md 템플릿은 사용자 요청에서 `<path>`(절대/상대/`~`-프리픽스)를 추출하고, 언급이 없으면 `.`를 사용하도록 Claude에게 지시합니다.

**스킬 관리 서브커맨드** (스킬 자체 관리용):

```bash
slaminar skill status                # 설치 상태 + 번들 버전과의 내용 일치 여부 보고
slaminar skill install               # ~/.claude/skills/slaminar/SKILL.md에 설치/업데이트
slaminar skill install --force       # 내용이 동일해도 강제 덮어쓰기 (백업은 여전히 생성)
slaminar skill uninstall             # 제거 + 가장 최근 백업이 있으면 복원
```

**예시 — 새 머신에 최초 설치:**

```text
$ slaminar skill status

Claude Code Skill Status
  Path:      /Users/me/.claude/skills/slaminar/SKILL.md
  Installed: no
  Bundled:   available

$ slaminar skill install

✓ Skill installed at /Users/me/.claude/skills/slaminar/SKILL.md
```

**예시 — 수정한 SKILL.md 위에 재설치:**

```text
$ slaminar skill install

✓ Skill updated at /Users/me/.claude/skills/slaminar/SKILL.md
  Previous version backed up to /Users/me/.config/slaminar/skill-backups/SKILL_a1b2c3_1713412800.md
```

**예시 — 백업 복원이 동반되는 제거:**

```text
$ slaminar skill uninstall

✓ Uninstalled and restored previous SKILL.md from /Users/me/.config/slaminar/skill-backups/SKILL_a1b2c3_1713412800.md
```

**`npm install -g` 중 옵트아웃:**

```bash
SLAMINAR_SKIP_POSTINSTALL=1 npm install -g slaminar   # 명시적 옵트아웃
CI=true npm install -g slaminar                       # 자동 스킵
```

postinstall 훅은 추가로 **비-전역(로컬/전이적) 설치**도 자동으로 건너뜁니다. 즉 slaminar가 다른 프로젝트의 라이브러리 의존성으로 설치되는 경우 홈 디렉토리를 건드리지 않습니다.

**안전 보장:**

- postinstall은 모든 로직을 `try/catch`로 감싸 오류를 경고 1줄로 축약하고 종료 코드 `0`으로 끝 — `npm install` 체인이 깨질 수 없습니다.
- SHA-256 내용 비교로 바이트 단위로 동일한 SKILL.md는 조용히 건너뜀 (멱등성 보장).
- 기존 SKILL.md는 `~/.config/slaminar/skill-backups/`에 복사된 뒤에야 덮어써집니다.
- `slaminar skill uninstall`은 스킬 파일을 제거하고, 백업이 있으면 가장 최근 것을 `SKILL.md`로 되돌려 씁니다 — 이전 사용자 정의 스킬이 자동 복원됩니다.

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

- **온라인 카탈로그**: 85개 도구를 GitHub에서 가져옴 (이 저장소의 `catalog/catalog.json`), slaminar 업그레이드 없이 업데이트 가능
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

### 카탈로그 도구 (85개)

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

> **상세 가이드 (v0.8.5+)**: 단계별 작성 방법, 전체 스키마 표, local file / extend·replace 패턴, 트러블슈팅은 [`docs/catalog-authoring-guide.md`](./docs/catalog-authoring-guide.md)를 참고하세요. 번들 카탈로그에 등록된 모든 도구(presentation 카테고리 포함)에 대한 "무엇이고 언제 쓰나" 큐레이션 인덱스는 [`docs/catalog-tools-reference.md`](./docs/catalog-tools-reference.md)를 보시면 됩니다.

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
  │     → 85개 공식 도구
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

### 카탈로그 연합 (v0.8+)

v0.8부터 단일 `catalogUrl` 대신 **여러 소스를 우선순위로 적층**하는 multi-source 카탈로그 연합을 제공합니다. 회사 카탈로그 + 개인 카탈로그 + 보안팀 allowlist를 동시에 조합할 수 있고, 공식 카탈로그도 그대로 유지됩니다. 기존 v0.7의 단일 URL 설정은 로드 시점에 자동으로 `*-legacy` 소스 1개로 변환되어 기존 사용자는 **무조작 업그레이드** 가능합니다.

**우선순위 레이어 (오름차순, 위가 이김):**

| Priority | Scope | 저장 위치 |
|---:|---|---|
| `-1` | `bundled` | 번들 — 항상 존재하는 최종 폴백 |
| `0` | `official` | 기본 GitHub 호스트 공식 카탈로그 |
| `100+` | `user` | `~/.config/slaminar/defaults.json → catalog.sources[]` |
| `200+` | `project` | `.slaminar/config.json → catalogSources[]` (git 커밋) |
| `500` | `env` | `SLAMINAR_CATALOG_SOURCES` 환경변수 |
| `999` | `cli` | `--catalog <url>` CLI 플래그 (adhoc) |

`replace` 모드 레이어 하나가 있으면 그보다 낮은 레이어는 **전부 사라집니다**. `extend` 레이어는 누적되며 tool 이름이 충돌하면 높은 쪽이 이깁니다.

**`slaminar catalog source`로 소스 관리:**

```bash
# 회사 카탈로그를 프로젝트 스코프로 추가 (git 커밋)
slaminar catalog source add https://tools.company.com/catalog.json \
  --scope project --mode extend --name company

# 개인 카탈로그를 사용자 스코프로 추가 (기본값으로 gitignore됨)
slaminar catalog source add ~/my-catalog.json --scope user --name personal

# 보안팀이 모든 하위 레이어를 무효화
slaminar catalog source add https://sec.company.com/approved.json \
  --scope project --mode replace --priority 300 --name security-allowlist

# 우선순위 순으로 모든 활성 레이어 확인
slaminar catalog source list

# URL을 저장 없이 한 번만 검증
slaminar catalog source test https://example.com/catalog.json

# 비활성화 (설정엔 남김) 또는 삭제
slaminar catalog source disable company
slaminar catalog source remove company
```

**CI 친화 환경변수:**

```bash
SLAMINAR_CATALOG_SOURCES="extend:https://a.example/c.json,replace:/etc/slaminar/approved.json" \
  slaminar recommend .
```

**하위호환성:**

- v0.7 사용자는 파일을 수정할 필요 없습니다. 기존 `catalogUrl` / `catalogMode`가 있으면 resolve 시마다 메모리에서 `*-legacy` 소스로 합성됩니다.
- `slaminar catalog config`는 여전히 작동하지만 deprecation 경고를 출력합니다. `catalog source`로 전환 권장.
- `--catalog <url>` 플래그도 계속 동작하며 priority 999 `cli-adhoc` 레이어로 주입됩니다.

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
├── cli.ts                        # CLI 진입점 (22 commands + global flags)
├── version.ts                    # 런타임 버전 문자열 단일 소스
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

├── auth/                         # AI 프로바이더 인증 (내부용 — setup에서 호출)
│   ├── config.ts                 # ~/.config/slaminar/auth.json (0600)
│   ├── models.ts                 # Cloudflare/Anthropic 모델 카탈로그
│   ├── diagnostics.ts            # 토큰 검증, /user, /memberships, 추론 테스트
│   └── wizard.ts                 # 인터랙티브 login 플로우 (setup Step 2에서 호출)
│
├── setup/                        # 전역 첫 실행 경험 (v0.6)
│   ├── wizard.ts                 # `slaminar setup` — 5단계 진행형 위자드
│   ├── defaults.ts               # ~/.config/slaminar/defaults.json I/O
│   ├── doctor.ts                 # `slaminar doctor` — 읽기 전용 진단
│   └── update-check.ts           # 주간 npm registry 버전 체크 (프라이버시 안전)
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
    ├── SKILL.md                  # /slaminar 스킬 정의 (경로 파라미터화)
    ├── installer.ts              # ~/.claude/skills/slaminar/ 설치/제거/상태
    └── post-install.ts           # npm postinstall 진입점 (fail-safe, 옵트아웃 인식)
```

> `scripts/copy-assets.mjs`가 `tsc` 직후 실행되어 `src/skill/SKILL.md`를 `dist/skill/`로 복사합니다 — 컴파일된 `installer.js`가 `import.meta.url`로 같은 폴더의 SKILL.md를 찾을 수 있도록. `package.json`의 `postinstall` 스크립트는 컴파일된 `dist/skill/post-install.js`를 호출합니다.

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

### Phase 11: Claude Code 스킬 자동 배포 + 경로 파라미터화 (v0.5.0)

**동기.** v0.5 이전에는 사용자가 `npm install` 후 직접 `~/.claude/skills/slaminar/`로 SKILL.md를 수동 복사해야 했습니다. 배포 갭 때문에 신규 사용자에게는 `/slaminar` 스킬이 사실상 보이지 않았습니다.

**산출물.**
- npm postinstall 훅으로 자동 설치 — `package.json:postinstall`, `src/skill/post-install.ts`
- `src/skill/installer.ts` — SHA-256 콘텐츠 체크로 idempotent 설치
- `slaminar skill {install,uninstall,status}` 명령어 그룹 — `src/cli.ts`
- `scripts/copy-assets.mjs` — 빌드 시 `SKILL.md`를 `dist/`로 복사
- SKILL.md 경로 파라미터화 (`<path>` 인자) — `src/skill/SKILL.md`

**의사결정.**

- **D11.1 — 3중 안전 postinstall 가드.** 대안: (a) try/catch 단일, (b) 쉘 `|| true`, (c) 방어적 `process.exit(0)`. **선택:** 3가지 모두 + 옵트아웃(`SLAMINAR_SKIP_POSTINSTALL=1`, `CI=true`, 전이적 설치 감지). 근거: postinstall 실패가 `npm install` 자체를 깨뜨리면 절대 안 됨 — 조용히 스킬 설치가 스킵되는 것보다 사용자 신뢰 손실이 훨씬 비쌉니다. 증거: `src/skill/post-install.ts`, `tests/skill/installer.test.ts`.
- **D11.2 — SHA-256 content-hash 멱등성 체크.** 대안: 무조건 덮어쓰기. 근거: 사용자가 SKILL.md를 커스터마이즈하는 경우 덮어쓰기는 작업물을 지웁니다. hash 일치 → no-op; 다르면 백업 후 교체. 증거: `src/skill/installer.ts:installSkill`.
- **D11.3 — 별도 빌드 스크립트로 자산 복사.** 대안: `tsconfig.json`에 `.md` 포함. 근거: `tsc`는 JS 외에는 배출하지 않음; 작은 `copy-assets.mjs`가 투명하고 빌드 시점에 예측 가능하게 실행. 증거: `scripts/copy-assets.mjs`, `package.json:build`.
- **D11.4 — 내용 불일치 덮어쓰기에만 백업.** 대안: 설치마다 백업. 근거: 대부분 재설치는 hash 일치 no-op; 무차별 백업은 `~/.config/slaminar/skill-backups/`에 중복 파일만 쌓입니다. 증거: `src/skill/installer.ts:installSkill` backup 분기.
- **D11.5 — 경로 파라미터화 SKILL.md.** 대안: 스킬 내부에서 cwd 감지. 근거: Claude Code 스킬 라우팅은 명시적 인자를 받을 때 더 잘 작동 — "slaminar `../other-repo`에 돌려줘" 같은 발화가 `slaminar init .` 대신 `slaminar init ../other-repo`로 올바르게 라우팅됩니다. 증거: `src/skill/SKILL.md` frontmatter description.

**교차 링크.** [CHANGELOG v0.5.0](./CHANGELOG.md#050--2026-04-17) · 별도 spec 없음(inline 설계) · 테스트: `tests/skill/`.

### Phase 12: 전역 설정 위자드 + Doctor + Defaults (v0.6.0)

**동기.** v0.5 이후에도 setup은 4개 명령어(`login`/`whoami`/`logout`/`auth`)로 분산되어 있었고, `TeamConfig`/`LocalConfig`의 많은 필드는 CLI setter가 없어 사용자가 JSON을 직접 편집했습니다. "내 설치가 건강한가?" 라는 질문에 답할 진단 도구가 전무했습니다. 첫 실행 경험이 파편화된 상태였습니다.

**산출물.**
- `slaminar setup` — 5단계 대화형 위자드(Environment → AI → Catalog → Defaults → Skill) — `src/setup/wizard.ts`
- `slaminar doctor` — 읽기 전용 헬스 리포트, 종료코드 0/1/2 — `src/setup/doctor.ts`
- `~/.config/slaminar/defaults.json` — 사용자 전역 설정 단일 파일 — `src/setup/defaults.ts`
- 주간 npm 버전 체크(프라이버시 안전) — commander `preAction` 훅 — `src/setup/update-check.ts`
- `login`/`whoami`/`logout`/`auth` 제거(breaking)
- `--yes` 비대화형 모드 + `SLAMINAR_*` 환경변수

**의사결정.**

- **D12.1 — 4개 명령어 대신 `setup` 단일 진입점.** 대안: `login`/`whoami` 등을 유지하고 `setup`을 aggregator로 추가. 근거: 하나의 관심사에 4개 surface가 원래 파편화의 원인이었음. aggregation이 discoverability를 살립니다. 단순한 멘탈 모델을 위해 breaking change 수용. 증거: `src/setup/wizard.ts:runSetupWizard`, CHANGELOG "Breaking" 표.
- **D12.2 — `~/.slaminar/`가 아닌 `~/.config/slaminar/`에 `defaults.json`.** 대안: `$HOME`의 dotfile. 근거: XDG Base Directory 준수; `auth.json`과 같은 위치에 둬서 사용자가 한 디렉토리만 보거나 지우면 되게. 증거: `src/setup/defaults.ts:getDefaultsPath`, `src/auth/config.ts:getConfigDir`.
- **D12.3 — 주간 버전 체크 (매 실행 X).** 대안: 매 명령어마다 체크. 근거: npm registry rate limit + 사용자는 시끄러운 CLI를 싫어함. 7일에 1회가 균형; 프라이버시 안전(식별자 없음). `--no-update-check` 플래그 또는 `telemetry.versionCheck=false`로 opt-out. 증거: `src/setup/update-check.ts`, `tests/setup/update-check.test.ts`.
- **D12.4 — CI용 `--yes` + env vars (별도 config 파일 X).** 대안: `--config-file <path>` 플래그. 근거: env vars는 CI(GitHub Actions, CircleCI secrets)에서 네이티브로 흐릅니다. 플래그 surface 최소화 — CI 특화 복잡도는 env namespace에 집중. 증거: `src/setup/wizard.ts:authFromEnv`, yes 모드의 Step 2–5가 모두 `SLAMINAR_*` env를 먼저 읽음.
- **D12.5 — Doctor 완전 읽기 전용.** 대안: auto-fix 모드(`doctor --fix`). 근거: 진단과 작업이 섞이면 "무슨 일이 일어났는지" 모호해짐; `setup --reconfigure <section>`이 명시적 fix path. 종료코드 0/1/2가 `slaminar check`와 일치 — CI 일관성. 증거: `src/setup/doctor.ts`, `tests/setup/doctor.test.ts`.
- **D12.6 — 손상된 `defaults.json`은 crash 대신 fallback.** 대안: "config 고쳐라" 에러. 근거: defaults는 민감 정보 아니며 파싱 에러로 작업이 막히면 안 됨. partial file은 유효한 섹션만 병합, 나머지는 built-in default. 증거: `src/setup/defaults.ts:loadDefaults`, `mergeWithBuiltIn`.

**교차 링크.** [CHANGELOG v0.6.0](./CHANGELOG.md#060--2026-04-17) · [spec: `2026-04-17-global-setup-plan.md`](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · 테스트: `tests/setup/{wizard,doctor,defaults,update-check}.test.ts`.

### Phase 13: 프로젝트 발견 & 일괄 적용 (v0.7.0)

**동기.** 여러 레포를 가진 1인 개발자가 slaminar를 bulk로 적용할 방법이 없었음; 위자드는 한 프로젝트씩만 세팅. 기존 `.slaminar/config.json`이 있는 프로젝트에 합류한 팀원에게 auto-import 경로도 부재. setup은 여전히 디렉토리별 수작업이었습니다.

**산출물.**
- `slaminar discover [roots...]` — 사용자 지정 루트 스캔 — `src/discover/scanner.ts`
- `slaminar setup --apply-to-discovered` — 위자드의 선택적 Step 6 — `src/setup/wizard.ts:stepDiscovery`
- 프로젝트 분류기(`new`/`configured`/`existing`/`unsupported`) — `src/discover/detector.ts`
- 마크다운 감사 로그를 남기는 일괄 적용 — `src/discover/batch.ts`
- 팀 카탈로그 자동 임포트 — `src/discover/team-import.ts`
- ASCII 테이블 리포터 — `src/reporter/discovery-table.ts`

**의사결정.**

- **D13.1 — 사용자 지정 루트, 추측된 기본값 없음.** 대안: `~/work`, `~/projects`, `~/src`를 자동 선택. 근거: false positive는 시간 낭비 + 프라이버시 우려("누가 slaminar에게 내 HOME을 훑으라 했나?"). 명시적 루트만; `defaults.json.discovery.lastRoots`에 저장해 재실행 편의성. 증거: `src/discover/scanner.ts:parseRootsInput`, `tests/discover/scanner.test.ts`.
- **D13.2 — 프로젝트 signature 확인되면 하향 중단.** 대안: 확정된 프로젝트 내부에도 depth-4까지 계속 내려감. 근거: 모노레포의 루트와 모든 서브패키지 둘 다 매칭되면 시끄럽고 낭비. 첫 히트 승리; 확정된 프로젝트 내부의 중첩 프로젝트는 의도적으로 무시. 증거: `src/discover/scanner.ts:walk`, `tests/discover/scanner.test.ts`의 "does not descend into a confirmed project".
- **D13.3 — Dry-run 기본, apply는 opt-in.** 대안: 즉시 적용 + `--dry-run` 탈출구. 근거: 여러 프로젝트에 쓰기는 백업 없으면 비가역. 대화형: "Dry-run all(권장)"이 기본. CI: 명시적 `--apply-to-discovered` 또는 `SLAMINAR_BATCH_APPROVED` 필요. 증거: `src/setup/wizard.ts:stepDiscovery`, `src/discover/batch.ts`.
- **D13.4 — `~/.config/slaminar/setup-logs/`에 일괄 감사 로그.** 대안: 로그 없음(stdout만). 근거: 20개 레포에 `setup --apply-to-discovered` 실행 시 "뭐가 일어났는지" 증거 필요 — 어느 프로젝트에 init됐고 어느 것이 update됐고 어느 것이 실패했는지. 배치당 1개 마크다운 파일(succeeded/failed/skipped 분류). 증거: `src/discover/batch.ts:writeSummary`.
- **D13.5 — "CLAUDE.md 있고 `.claude/` 없음" → `existing` + `init-merge` (skip X).** 대안: 기존 CLAUDE.md가 있으면 skip. 근거: v0.5 이전 사용자들은 CLAUDE.md를 직접 작성; slaminar의 ownership-marker 시스템이 깨끗하게 병합 가능. auto-skip은 그런 프로젝트를 생태계에서 고아로 만듭니다. 증거: `src/discover/detector.ts:classifyStatus`, `tests/discover/detector.test.ts`.
- **D13.6 — realpath inode 중복체크를 2차 심볼릭 링크 가드로.** 대안: 기본적으로 "심링크 팔로우 안 함"만. 근거: 바인드 마운트와 case-insensitive 파일시스템은 심링크 없이도 순환을 만들 수 있음; `realpath`가 belt-and-suspenders 가드. 증거: `src/discover/scanner.ts:walk` (`visitedInodes` + `realKey`).

**교차 링크.** [CHANGELOG v0.7.0](./CHANGELOG.md#070--2026-04-17) · [spec §v0.7](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · 테스트: `tests/discover/*.test.ts`, `tests/reporter/discovery-table.test.ts`.

### Phase 14: 카탈로그 연합 (v0.8.0)

**동기.** v0.3–v0.7은 정확히 하나의 커스텀 카탈로그 URL만 지원. 3-layer 시나리오(보안 allowlist + 회사 카탈로그 + 개인 도구)는 사용자가 JSON을 수동 병합 후 배포해야 했습니다. 팀은 회사 extend 추가와 별개로 "replace 모드"로 강제되는 allowlist를 원했습니다.

**산출물.**
- 6-레이어 우선순위 모델(`bundled:-1` → `official:0` → `user:100` → `project:200` → `env:500` → `cli:999`) — `src/recommender/catalog-sources.ts`
- 영속 `trust` 필드 포함 `CatalogSource` 타입 — `src/types/index.ts`
- `slaminar catalog source {add,list,remove,enable,disable,test}` CLI — `src/cli.ts`
- `~/.config/slaminar/cache/<id>.json`의 per-source 캐시 — `src/recommender/catalog-cache.ts`
- replace-floor 의미를 갖는 N-way 병합 — `src/recommender/catalog-merger.ts:mergeCatalogStack`
- `SLAMINAR_CATALOG_SOURCES` 환경변수(`mode:uri,mode:uri`)
- v0.7 legacy `catalogUrl` 자동 마이그레이션

**의사결정.**

- **D14.1 — v0.8은 Phase 1–3만; Phase 4 (trust/보안)는 v0.9.** 대안: 한 릴리스에 spec 전체(6–7일). 근거: 작게 배포하면 피드백 빠르고, enforcement UX(확인 prompts, HTTPS 정책, 서명 카탈로그)는 독립된 복잡도. `trust` 필드는 미리 저장해 추후 데이터 마이그레이션 회피. 증거: CHANGELOG v0.8.0 "Deferred to v0.9", 설계 spec Phase 표.
- **D14.2 — Read-path-only 마이그레이션 (파일 재작성 없음).** 대안: 최초 로드 시 config 파일을 자동 재작성. 근거: v0.7 사용자가 v0.8 파일럿 후 다운그레이드하면 config 파일이 알 수 없이 바뀐 걸 발견. 읽기 시점 마이그레이션은 메모리에서 `*-legacy` 소스를 합성; 파일은 사용자가 `catalog source add` 또는 `setup --reconfigure catalog`로 명시 편집할 때만 쓰기. 증거: `src/recommender/catalog-sources.ts:loadEffectiveSources`의 legacy-URL 분기, `tests/recommender/catalog-sources.test.ts`의 "synthesizes a user-scope source from legacy catalog.url".
- **D14.3 — Per-source 캐시 파일 (composite X).** 대안: `catalog-cache.json` 하나에 `sources: { [id]: entry }`. 근거: (a) 단일 소스 rollback이 다른 소스의 prev 파일을 건드리지 않음; (b) 동시 fetch(향후)가 락 없이 쓸 수 있음; (c) 손으로 검사하기 쉬움. Official은 v0.7 rollback 호환을 위해 legacy `catalog-cache.json` 경로 유지(`id='official'`). 증거: `src/recommender/catalog-cache.ts:getSourceCachePath`, `tests/recommender/catalog-cache.test.ts`.
- **D14.4 — Wizard는 단일 URL prompt 유지 + CLI 힌트.** 대안: 위자드를 multi-source 배열 빌더로 확장(inquirer loop). 근거: 사용자 80%는 커스텀 카탈로그 1개를 원함; 루프는 그 다수에게 귀찮음. 파워유저는 반복에 더 적합한 `slaminar catalog source add`로 안내. 증거: `src/setup/wizard.ts:stepCatalog`, "Tip: layer additional sources" 출력.
- **D14.5 — Bundled는 replace-floor 필터링에서 면제.** 대안: `replace`가 bundled를 포함한 모든 하위 레이어를 드롭. 근거: 사용자의 커스텀 `replace` 소스가 오프라인(stale + 도달불가)이면 모든 걸 잃음. Bundled는 마지막-보루 보장 소스 — 참여자 아닌 "floor". 증거: `src/recommender/catalog-merger.ts:mergeCatalogStack`, `applyReplaceFloor`.
- **D14.6 — 지금은 `trust` 필드만, enforcement는 v0.9.** 대안: enforcement 시점까지 `trust` 제거. 근거: 나중에 추가하면 config 파일 마이그레이션 강제. 지금 저장해도 행동 효과 없음 → zero-cost forward investment. 신규 소스 기본 `trust: 'untrusted'`는 의도적 — v0.9가 설치 시점에 플래그. 증거: `src/types/index.ts:CatalogSource`, CHANGELOG v0.8.0 "persisted but not enforced".
- **D14.7 — CLI `--catalog`는 side channel이 아닌 `cli-adhoc` 소스로.** 대안: v0.8 이전처럼 `--catalog`가 stacking을 우회. 근거: 통일성 — 모든 소스가 같은 priority/fetch 파이프라인을 통과. priority 999 CLI adhoc이 하위 레이어와의 충돌에서 자연스럽게 승리(일회성 오버라이드의 기대 의미). 증거: `src/recommender/catalog-sources.ts:makeCliAdhocSource`, `catalog-resolver.test.ts`의 하위호환 테스트.
- **D14.8 — Env 소스 ID는 URI 해시; `cli-adhoc`은 고정.** 대안: 모든 ID를 랜덤 auto-generate. 근거: env 소스는 공존 가능(쉼표 구분); 해시로 disambiguation. CLI adhoc은 일회성이라 고정 `cli-adhoc` ID가 호출 간 캐시 파일 재사용 가능. 증거: `src/recommender/catalog-sources.ts:generateSourceId`, `makeCliAdhocSource`.

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

### Phase 16: Init-First Mini-Setup (v0.8.4)

**동기.** v0.8.3까지 `slaminar init <path>`를 처음 실행하면 "Run `slaminar setup` once"라는 소극적 안내만 뜨고 local rules로 지나갔습니다. 사용자가 AI를 원하든 안 원하든 같은 결과. 15결정의 `slaminar setup` wizard는 실제 목적(init)을 위한 관문처럼 느껴졌습니다. 시뮬레이션으로 격차가 확인됐습니다: 경로 A(Claude Code `/slaminar`) 2결정, 경로 B(터미널 setup+init) 15결정. `init` 자체가 첫 실행을 처리하여 대부분의 사용자가 `setup` 명령을 쓸 필요가 없게 합니다.

**산출물.**
- `src/setup/inline-prompt.ts` — 신규 `runInlineAuthPrompt()`가 1개 select 질문을 띄우고 Skip / Cloudflare / Anthropic 중 하나로 분기
- `src/auth/wizard.ts` — 신규 `runLoginWizardForProvider()` export. provider 선택 단계를 건너뛰고 기존 `setupCloudflare()` / `setupAnthropic()` 재사용
- `src/cli.ts` init 액션 — 기존 passive nudge를 active mini-setup 호출로 교체. auth 실패 시 3갈래 복구 경로 안내 + exit 1. Skip이나 auth 성공 시 `defaults.json` 저장하여 이후 실행 자동 조용
- `tests/setup/inline-prompt.test.ts` — 5개 신규 unit test (338 → 343)

**의사결정.**

- **D16.1 — 첫 실행 판정은 `~/.config/slaminar/defaults.json` 유무만으로.** 대안: 여러 신호(defaults + auth + env vars) 조합. 근거: `slaminar setup`이든 새 mini-setup이든 완료 시 `defaults.json`을 만듭니다. 단일 파일 존재 체크가 확정적이고 오탐이 없습니다. 증거: `src/setup/defaults.ts:defaultsExist`, `src/cli.ts`의 init 액션 게이트.
- **D16.2 — Mini-setup은 정확히 1개 질문(AI provider)만.** 대안: 2–3개 질문(도구 설치, catalog 등). 근거: 시뮬레이션 결과 setup wizard의 15결정 중 14개는 합리적 기본값으로 충분함을 확인. 첫 실행 사용자에게 1개 이상 질문을 강제하면 우리가 제거하려던 마찰이 다시 생깁니다. Catalog / 도구 설치 / 주간 버전 체크 등은 사용자가 명시적으로 재설정할 때까지 built-in default 유지. 증거: `src/setup/inline-prompt.ts:runInlineAuthPrompt`, `src/setup/defaults.ts:builtInDefaults`.
- **D16.3 — Auth 실패 시 init 중단 + 3갈래 복구 경로 (graceful fallback 없음).** 대안: 조용히 local rules로 내려감. 근거: 사용자가 Cloudflare나 Anthropic을 고른 것은 AI를 쓰겠다는 의사 표시입니다. 조용히 local rules로 바꾸면 기대와 다른 결과물이 나오고 복구 방법도 막막해집니다. 중단 + "뭘 할지" 명시 목록이 의도를 존중하고 디버깅도 쉽습니다. Skip은 별개의 성공 경로이며 이 결정의 대상이 아닙니다. 증거: `src/cli.ts` init 액션의 auth-failure 분기.
- **D16.4 — `slaminar setup`은 손대지 않음 — mini-setup은 독립 코드 경로.** 대안: `setup`을 mini-setup에 위임하거나 `setup → setup --advanced`로 이름 변경. 근거: 기존 사용자와 CI 스크립트를 위한 하위 호환이 엄격한 제약. 두 경로가 공유하는 기본 단위는 `runLoginWizardForProvider()` 하나뿐. 증거: `src/setup/wizard.ts` 변경 없음, `src/auth/wizard.ts`는 신규 export 1개만 추가.
- **D16.5 — v0.8.4에는 `claude` CLI 감지 없음 — v0.9.0에서 도입.** 대안: 지금 감지해서 "Use Claude Code subscription" 옵션 추가. 근거: YAGNI. choices 배열 구조상 추후 릴리스에서 한 줄 추가로 passthrough 옵션을 맨 앞에 넣을 수 있게 설계되어 있습니다. passthrough를 별도 배포하면 v0.8.4 리뷰가 쉬워지고 v0.9.0은 감지/서브프로세스 설계 미지수에 집중할 수 있습니다. 증거: `inline-prompt.ts`의 `choices` 구조.

**교차 링크.** [CHANGELOG v0.8.4](./CHANGELOG.md#084--2026-04-17) · [spec: `2026-04-17-v0-8-4-init-first-design.md`](./docs/superpowers/specs/2026-04-17-v0-8-4-init-first-design.md) · 테스트: `tests/setup/inline-prompt.test.ts`.

### Phase 17: Catalog Ecosystem (v0.8.5)

**동기.** v0.8.0 은 카탈로그 소스 federation — bundled / official / user / project / env / CLI 스택 — 을 도입했고, `CatalogSource.type: 'file' | 'url' | 'github' | 'official'` 스키마와 머지/캐시 기반도 갖췄습니다. 그런데 한 분기가 실제로는 선언만 된 상태였습니다: `source.type === 'file'` 이 `fetchRemoteCatalog()` 로 전달됐는데, 이 함수는 Node 의 네이티브 `fetch()` 에 위임 — Node 의 fetch 는 experimental 플래그 없이는 `file:` URI 를 거부합니다. 그래서 공유 드라이브나 모노레포에서 팀이 쓰려 했던 local-file 카탈로그 소스가 소리 없이 작동하지 않았습니다. 별개로, presentation 생성 워크플로를 만들려는 사용자는 카탈로그가 해당 생태계를 seed 하지 않아 출발점이 없었고, 자체 JSON 카탈로그를 작성하려는 사람에게도 소스 코드 외에는 참고 자료가 없었습니다.

**산출물.**
- `src/recommender/catalog-remote.ts` — 신규 `fetchLocalCatalog(uri)` 가 `file://`, `~/`, `./`, 절대 경로를 `node:fs` 로 읽음. 신규 `fetchCatalogBySource(source, etag?)` 디스패처가 `source.type` 으로 분기: `file` → local, `url`/`official` → HTTP, `github:owner/repo/path` → `raw.githubusercontent.com` URL 로 확장 후 HTTP
- `src/recommender/catalog-resolver.ts` — 한 줄 교체: `fetchRemoteCatalog` 대신 디스패처 호출
- `tests/recommender/catalog-remote.test.ts` — 절대 경로, `file://` URI, `~/` 확장, 스키마 거부를 커버하는 신규 테스트 4 개 (343 → 347)
- `catalog/catalog.json` — presentation 도구 10 개 추가 (`python-pptx`, `md2pptx`, `powerpointer`, `pymupdf`, `pdf2image`, `playwright`, `slidev`, `marp`, `reveal.js`, `presenton`), 관계 6 개 추가, 카탈로그 버전 `2.0.0` → `2.1.0` (도구 46 → 56)
- `docs/catalog-tools-reference.md` (신규, ~655 줄) — 수작업 큐레이션 "무엇이고 언제 쓰나 / 어떻게 설치하나" 인덱스. presentation 카테고리는 완전 수록, 기존 카테고리는 카테고리당 대표 1 개로 시작
- `docs/catalog-authoring-guide.md` (신규, ~266 줄) — 단계별 작성 가이드: local file 등록을 포함한 5 분 튜토리얼, 전체 스키마 표 (`CatalogTool` / `CatalogSuggestion` / `ToolConflict`), 실전 패턴, extend vs replace 결정 가이드, 검증, 호스팅 비교, deprecation 흐름, 트러블슈팅

**의사결정.**

- **D17.1 — `fetchRemoteCatalog` 확장 대신 신규 `fetchCatalogBySource` 디스패처.** 대안: `fetchRemoteCatalog` 가 모든 소스 타입을 처리하도록 바꾸고 이름 변경. 근거: `fetchRemoteCatalog` 는 downstream 코드가 직접 호출하기 때문에 의미를 바꾸면 조용한 동작 변경 위험. 디스패처를 위에 한 겹 두면 기존 시그니처가 유지되고, 소스 타입별 transport 로직이 한곳에서 읽기 쉬워집니다. 디스패처 자체는 `source.type` 에 대한 단일 switch — 새 transport 추가 (예: 향후 S3) 시 한 분기만 늘리면 됩니다. 증거: `src/recommender/catalog-remote.ts:fetchCatalogBySource`.
- **D17.2 — 로컬 파일은 `fs.readFile`, `fetch('file://...')` 아님.** 대안: Node 의 experimental-fetch 플래그를 `file:` URI 에 활성화. 근거: experimental 플래그는 사용자의 Node 버전 차이마다 보이지 않는 실패 모드를 만듭니다. slaminar 는 Node ≥ 20 을 지원하며, 이 범위 대부분에서 `fetch('file://')` 는 사용자별 플래그 관리 없이는 실패합니다. `fs.readFile` 로 읽는 것은 단순하고 명시적이며 어디서나 동작합니다. 비용은 URI 정규화 로직 ~30 줄 (`file://`, `~/`, `./`, 절대) — 플래그 문서화보다 저렴. 증거: `src/recommender/catalog-remote.ts:fetchLocalCatalog`.
- **D17.3 — Presentation 카테고리는 OSS 만; 상업 AI API 는 의도적 제외.** 대안: 상업 API (Gamma, 2Slides, Beautiful.ai, SlideSpeak, Aspose.Slides) 도 포함하고 설치 안내를 API-key 가입 링크로. 근거: slaminar 파이프라인은 기본적으로 오프라인 실행이며, bundled 카탈로그는 모든 사용자에게 배포 — CI 박스와 air-gapped 환경 포함. 유료 SaaS 가입을 요구하는 `recommender` 결과물은 그 계약에 반합니다. 작성 가이드가 사용자/팀이 자신의 custom 카탈로그에 상업 항목을 추가하는 방법을 상세히 문서화하므로 정보는 사라지지 않고 — 단지 언번들될 뿐입니다. 증거: `catalog/catalog.json` (상업 항목 없음), `docs/catalog-authoring-guide.md` "patterns" 섹션.
- **D17.4 — 참고 문서는 100% 수록 대기 없이 점진 배포.** 대안: 56 개 도구 전부 상세 기술이 완료될 때까지 `docs/catalog-tools-reference.md` 배포 연기. 근거: presentation 카테고리는 지금 사용자가 가장 안내를 필요로 하는 곳입니다 (10 개 도구, 역할 중복 다수). 기존 카테고리당 대표 1 개로 스키마-실전-매핑을 보여주면 기여자들이 나머지를 이어서 채울 수 있습니다. 전체 커버리지를 기준으로 gate 하면 문서 배포가 v0.9+로 밀리고, 그 사이 사용자는 소스 코드로 돌아가야 합니다. 증거: `docs/catalog-tools-reference.md` 의 TODO 마커가 나머지 작업 범위를 v0.8.6+ 로 명시.

**교차 링크.** [CHANGELOG v0.8.5](./CHANGELOG.md#085--2026-04-17) · 설계 계획: `0-8-jiggly-ullman.md` (승인됨) · 테스트: `tests/recommender/catalog-remote.test.ts` · 신규 문서: [`docs/catalog-tools-reference.md`](./docs/catalog-tools-reference.md), [`docs/catalog-authoring-guide.md`](./docs/catalog-authoring-guide.md).

### Phase 18: Token-Cost Tier for Tool Recommendations (v0.9.0)

**동기.** v0.8.x 까지 AI·생태계 비용을 관리하는 축은 binary — `--no-ai` on/off — 뿐이었습니다. "AI 는 쓰되 Claude Code 세션을 무겁게 만들지 않는 구성만 추천해달라" 는 중간 지점이 없었습니다. MCP 서버, LSP attachment, 지속적인 knowledge-graph 플러그인, multi-agent 오케스트레이터 같은 생태계 도구들은 outer Claude 세션의 토큰 풋프린트를 의미 있게 늘립니다. 경량 셋업을 원하는 사용자는 slaminar 의 전체 추천을 받거나 수동으로 걸러내야 했습니다. conservative / smart / rich 3단 tier 를 도입해 사용자의 의도를 존중하면서도 추천 파이프라인은 카탈로그 기반으로 유지합니다.

**산출물.**
- `src/recommender/token-cost.ts` (신규) — `inferTokenCost(tool)` 태그·카테고리 휴리스틱, `resolveTokenCost(tool) = tool.tokenCost ?? inferTokenCost(tool)` 하이브리드 API. 번들 56 개 분포: **low 9 / medium 34 / high 13** (override 0 건)
- `src/recommender/tier-filter.ts` (신규) — `filterByTier(scored, tier)` 순수함수. Conservative 는 `low` 전부 + `medium` score ≥ 80; Smart 는 `high` score ≥ 70 빼고 전부; Rich 는 전부 통과
- `src/recommender/recommender.ts` — overlap 해결 뒤·maturity `maxTools` 앞에서 tier 필터 실행. tier 로 비워진 슬롯은 차순위 도구로 채워짐
- `src/types/index.ts` — `TokenCost` / `TokenTier` 타입, `CatalogTool.tokenCost` / `tokenCostRationale` 선택 override 필드, `UserDefaults.defaults.tokenTier`, `ExcludedTool` 인터페이스 + `tier` / `cost` / `score` 메타
- `src/setup/defaults.ts` / `src/setup/wizard.ts` — `builtInDefaults.defaults.tokenTier = 'smart'`, Step 4 select 질문, `--yes` 용 `SLAMINAR_DEFAULT_TOKEN_TIER` env var
- `src/cli.ts` — `init` / `recommend` 양쪽에 `--token-tier <tier>`, CLI > defaults > built-in 순으로 해석하는 `resolveTokenTier()` 헬퍼
- `src/core/pipeline.ts` / `src/setup/doctor.ts` / `src/reporter/terminal.ts` — 파이프라인이 `tokenTier` 를 recommender 까지 전달, doctor 가 현재 tier 표시, terminal reporter 에 "Excluded by tier filter" 미니 표 추가
- `tests/recommender/{token-cost,tier-filter}.test.ts` (신규, ~15 케이스) + `recommender.test.ts` 에 tier 통합 케이스 3 개. 총 347 → 365 tests

**의사결정.**

- **D18.1 — 하이브리드 cost 모델: 휴리스틱 기본 + 카탈로그 override 선택.** 대안: 모든 카탈로그 항목에 `tokenCost` 필수. 근거: 카탈로그는 진화하므로, 작성자가 cost 를 신경쓰지 않아도 신규 도구가 안전하게 분류돼야 합니다. 휴리스틱이 일반적인 형태(hook=low, MCP 유사=high)를 커버하고, 드문 예외만 한 줄 override 로 교정. override 개수가 휴리스틱 품질의 지표로 작동 — 56 개에 >10 개 override 가 필요하다면 휴리스틱을 고쳐야 한다는 신호. 증거: `src/recommender/token-cost.ts:resolveTokenCost`.
- **D18.2 — 휴리스틱 기본값은 `medium`.** 대안: `low`. 근거: 알려지지 않은 도구에 대해 `medium` 이 conservative-safe — Conservative tier 에서는 score ≥ 80 일 때만 통과하므로 분류되지 않은 도구도 품질 게이트를 거칩니다. `low` 기본이면 알려지지 않은 도구가 Conservative 필터를 조용히 통과해 목적을 무효화. 증거: `inferTokenCost()` 의 fallthrough.
- **D18.3 — Tier policy 는 코드 상수 (v0.9.0 에 `catalog.json tierPolicy` override 없음).** 대안: 카탈로그 스키마에 `tierPolicy` 를 바로 노출. 근거: 요청 전까지 YAGNI. 배포 표면이 단순해짐. 필드는 스키마에 예약되어 있어 후속 릴리스에서 마이그레이션 없이 추가 가능. 증거: `src/recommender/tier-filter.ts` 의 `MEDIUM_THRESHOLD_CONSERVATIVE = 80` / `HIGH_THRESHOLD_SMART = 70` 하드코딩.
- **D18.4 — 제외된 도구는 숨기지 않고 보여줌.** dry-run 과 init 리포트에 "Excluded by tier filter (N)" 표 등장. 근거: 투명성 — Playwright 가 추천에 있어야 한다고 기대한 사용자가 왜 사라졌는지 즉시 이해하고, `rich` 로 전환하고 싶으면 그 방법을 알 수 있어야 합니다. 숨기면 slaminar 가 거짓말하는 느낌.
- **D18.5 — Score 기반 예외 (Conservative medium ≥ 80, Smart high ≥ 70).** 대안: 순수 cost 필터. 근거: scorer 가 이미 "이 도구가 프로파일에 얼마나 잘 맞는지"를 수치화했습니다. 완벽히 맞는 도구(score 95)가 우연히 `medium` 이라고 Conservative 에서 빠지면 자의적으로 느껴짐. score threshold 가 "cheap-and-useful" 신호를 보호. 증거: `tier-filter.ts` 의 `shouldInclude()`.
- **D18.6 — Inline mini-setup 에 tokenTier 질문 추가 안 함 (D16.2 계약 유지).** 첫 실행 UX 는 1 개 질문(AI provider)만. `builtInDefaults` 가 조용히 `tokenTier: 'smart'` 저장. 다른 tier 원하는 사용자는 `slaminar setup` 또는 `--token-tier` 로 변경. 증거: `src/setup/inline-prompt.ts` 변경 없음.
- **D18.7 — tier 필터는 추천만 게이트, 설치는 게이트 안 함.** 대안: Conservative 에서 사용자가 `slaminar install <high-cost-tool>` 실행 시 경고/차단. 근거: 추천은 slaminar 의 의견, 설치는 사용자의 결정. 게이트는 가부장적이고 자기 선택을 아는 사용자와 충돌. 투명한 제외 리포트로 신호는 충분. 증거: 필터가 `recommender.ts` 안에만 존재, `src/rollback/uninstaller.ts` 변경 없음.
- **D18.8 — 56 개 전수 휴리스틱 검토 + 최소 override.** 목표: override ≤ 10. 실제: 0 건. 검토 중 휴리스틱 구멍 1 개 발견(`lsp` / `static-analysis` 태그) — override 로 처리하지 않고 휴리스틱 자체를 고쳐서 향후 LSP 류 도구가 자동으로 올바르게 분류되도록. 증거: `token-cost.ts` 의 `HEAVY_TAGS`.
- **D18.9 — Custom catalog 도구도 동일 하이브리드 파이프라인으로 자동 분류.** `resolveTokenCost()` 는 catalog-agnostic 하게 실행 — bundled / official / user / project / env / CLI 모든 도구가 동일 경로. Custom 카탈로그 설정한 사용자는 `tokenCost` 를 명시할 필요 없고, 동의하지 않는 경우에만 선택적으로 override. 이는 tier 필터를 카탈로그 머지 *뒤* 단계에 둔 **의도된** 속성 — 우연한 부수효과가 아님.

**교차 링크.** [CHANGELOG v0.9.0](./CHANGELOG.md#090--2026-04-17) · 설계 계획: `harmonic-wishing-pumpkin.md` (승인됨) · 테스트: `tests/recommender/token-cost.test.ts`, `tests/recommender/tier-filter.test.ts`, `tests/recommender/recommender.test.ts`.

### Phase 19: System-Level QA Foundations (v0.9.1)

**동기.** v0.9.0 까지의 365 unit tests 가 모든 모듈이 고립된 환경에서 올바르게 동작함을 보증했지만, 28 CLI 커맨드 × 7-phase 파이프라인 × 6-layer catalog federation × rollback 계층이 함께 돌 때의 **시스템 레벨 계약**은 검증 공백이었습니다. Phase Q1 의 전수 조사에서 4 개 critical atomicity/UX 버그 + 3 개 idempotence gap + concurrency 보호 전무 상태를 확인. 이 Phase 는 QA 인프라(E2E) 구축과 발견된 P0 4 건 fix 를 **한 릴리스**에 묶어 "검증 수단 + 그 수단으로 잡은 버그의 fix" 가 동시에 증거를 남기도록 구성.

**산출물.**
- `tests/e2e/_helpers.ts` (신규) — `runCli(args, opts)` 가 compiled `dist/cli.js` 를 `execFile` 로 실행. Fixture 3 종 (small 20 files / medium 500 / large 5000) 을 런타임 생성하는 `createFixture()`. HOME 자동 격리
- `vitest.config.ts` — `process.env.E2E === '1'` 분기로 include/exclude 전환. 기본 `npm test` 는 unit 만 (1.2s), `npm run test:e2e` 는 build + E2E (3.0s)
- **E2E 테스트 16 파일 / 60 tests**: init / rollback / scan / analyze / recommend / status / update / check / remove / setup / doctor / discover / skill / catalog-read / catalog-write / catalog-source
- **P0-1 `writeManifest` 원자성** (`src/placer/backup.ts`): tmp-then-rename 패턴. 크래시 시 truncated JSON 대신 stale-but-valid manifest 유지
- **P0-2 `restoreFile` return 값 존중** (`src/types/index.ts`, `uninstaller.ts`, `pipeline.ts`, `cli.ts`): `UninstallResult.missingBackups` 필드 신규. uninstall/init rollback 양쪽에서 백업 blob 없을 때 경고/에러 메시지로 노출
- **P0-3 `preAction` hook 보호** (`src/cli.ts`): update-check try/catch 래핑
- **P0-5 `skill uninstall` 실패 시 exit=1** (`src/types/index.ts`, `installer.ts`, `cli.ts`): `SkillUninstallResult.status: 'removed' | 'not-installed' | 'failed'` enum 으로 "정상 skip" vs "FS 에러" 구분. 실제 rmSync EISDIR 경로를 E2E 로 재현
- `docs/qa/current-state.md` — Phase Q1 스냅샷
- `docs/qa/reports/phase-q2-functional.md` — Phase Q2 산출물 + P0 회귀 증명 + baseline

**의사결정.**

- **D19.1 — E2E 는 in-process mock 이 아니라 compiled CLI 의 `execFile` 실행.** 대안: `await init(...)` 을 직접 호출하는 programmatic test. 근거: 실제 배포되는 바이너리의 경로 (argv 파싱, env 주입, commander hook 동작, process.exit 코드) 를 그대로 검증. In-process mock 은 commander 나 `process.exit` 동작을 스킵해 실제 사용자 경험과 달라짐. 대가: 테스트가 `npm run build` 를 선행 요구. 증거: `tests/e2e/_helpers.ts:runCli`.
- **D19.2 — Fixture 는 런타임 생성, git 에 커밋하지 않음.** 대안: `tests/fixtures/{small,medium,large}/` 를 실제 트리로 커밋. 근거: 5000 파일 트리를 git 에 두면 repo 체크아웃/diff/blame 이 무거워지고 fixture 내용을 실제 의도 없이 수정하는 일이 잦아짐. Generator 함수 하나가 "이 프로젝트 모양" 을 선언적으로 기술해 변경 추적 용이. 증거: `tests/e2e/_helpers.ts:createFixture`.
- **D19.3 — E2E 전용 vitest config 파일을 만들지 않고 `E2E=1` env 로 분기.** 대안: `vitest.e2e.config.ts` 별도. 근거: 두 config 가 드리프트할 위험 vs 단일 config 의 분기 약간. Include/exclude 만 다르고 나머지 옵션은 동일. 증거: `vitest.config.ts`.
- **D19.4 — P0-1 원자성은 `rename(2)` 로, 별도 journal 도입 X.** 대안: WAL/journal 또는 `fsync` 후 write-in-place. 근거: 사용 사례가 작은 manifest (수 KB) + 낮은 동시성. `rename(2)` 는 POSIX 에서 같은 디렉토리 내 atomic. Journal 은 과도. `fsync + overwrite` 는 write 중 크래시 시 여전히 truncation risk. 증거: `src/placer/backup.ts:writeManifest`.
- **D19.5 — P0-2 는 경고로 노출하되 uninstall 전체를 fail 시키지 않음.** 대안: missingBackups 발견 시 exit=1. 근거: 사용자가 일부 백업을 수동 삭제한 상태라면 "나머지는 정리해라" 가 원하는 행동. 전체 실패는 `.slaminar/` cleanup 을 막아 악화. 단 init rollback 경로는 data-loss 라서 에러 메시지로 강하게 표면화. 증거: `src/cli.ts` uninstall action, `src/core/pipeline.ts` rollback catch.
- **D19.6 — P0-5 는 enum status 로 3 상태 구분 (boolean flag X).** 대안: `error?: boolean` 추가. 근거: 3 상태 ("success-removed" / "success-nothing-to-do" / "failure") 가 진짜 의미라면 boolean 두 개보다 enum 이 정확. 기존 `SkillInstallResult.status` 와 패턴 일치. 증거: `src/types/index.ts:SkillUninstallResult`.
- **D19.7 — P0-3 는 update-check 에러를 삼키기 (propagate X).** 대안: warning 로그 출력 후 계속. 근거: update-check 는 부가 기능 — 사용자의 실제 커맨드 실행을 방해하면 안 됨. 내부 로깅은 디버깅에 가치가 있지만 stdout/stderr 오염 risk 가 더 큼. `--verbose` 에서 에러를 보여주는 것은 후속 개선. 증거: `src/cli.ts:preAction`.
- **D19.8 — P0 fix 를 E2E 인프라와 같은 릴리스.** 대안: v0.9.0.1 hotfix + v0.9.1 은 인프라만. 근거: "버그 식별 → 회귀 테스트 작성 → fix" 라는 증거 사슬이 단일 릴리스에 포함되면 리뷰어 / 미래 유지보수자가 "왜 이 fix 를 했는가" 를 E2E 테스트 본문에서 바로 확인 가능. Hotfix 분할은 사이클 관리 비용만 추가.

**교차 링크.** [CHANGELOG v0.9.1](./CHANGELOG.md#091--2026-04-17) · 설계 계획: `harmonic-wishing-pumpkin.md` (System QA Strategy) · Phase Q1: [`docs/qa/current-state.md`](./docs/qa/current-state.md) · Phase Q2: [`docs/qa/reports/phase-q2-functional.md`](./docs/qa/reports/phase-q2-functional.md) · E2E: `tests/e2e/*.test.ts` (16 files, 60 tests).

### Phase 20: Fault-Injection Matrix (v0.9.2)

**동기.** Phase Q2 (v0.9.1) 는 모든 커맨드의 happy path 에 대한 E2E 를 채웠지만, 실패 모드는 여전히 탐사 부족이었습니다. Phase Q1 의 커버리지 매트릭스에서 F6 (concurrency) 는 0%, F1 / F2 / F7 은 큰 갭. Phase Q3 의 역할은 모든 카테고리 — 네트워크 타임아웃 / FS 권한 / 손상 config / 잘못된 CLI 입력 / AI provider 실패 / 동시성 / 버전 불일치 — 에 대해 실제로 fault 를 **주입** 하고 slaminar 가 각 상황에서 어떻게 degrade 하는지 문서화. Fault injection 은 보통 실제 버그를 꺼내므로, Phase 를 "식별한 P0 는 테스트 인프라와 같은 릴리스에 fix" 구조로 구성 — 증거와 수정이 나란히.

**산출물.**
- `tests/fault-injection/` (신규) — 7 파일, **47 tests / 1 skipped**: `network.test.ts` (로컬 `node:http` stub server), `ai-provider.test.ts` (`vi.stubGlobal('fetch')`), `fs.test.ts` (chmod 000 / symlink loop), `corrupt.test.ts` (직접 bad-JSON 쓰기), `input.test.ts`, `version.test.ts` (stub catalog with `minSlaminarVersion: "99.0.0"`), `concurrency.test.ts` (`Promise.all([runCli, runCli])`)
- `docs/qa/fault-matrix.md` (신규) — F1–F8 × 영향 커맨드 sparse 매트릭스 + 각 셀의 기대 exit code / stderr 패턴 / side-effect
- `docs/qa/reports/phase-q3-exceptions.md` (신규) — Phase Q3 산출물 + P0 fix 증명 + P1/P2 티켓 + F6 concurrency 관찰
- **P0-6 (F7.f)** — `fileCountCap` 음수 허용 fix (`src/setup/wizard.ts:318-322`): `--yes` env 경로가 이제 `Math.max(100, …)` 으로 clamp (인터랙티브 경로와 일치)
- **P0-7 (F7.c)** — `--catalog-mode` validation helper (`src/cli.ts`): 신규 `validateCatalogMode()` + 4 call sites (init / recommend / discover / catalog update) 가 `extend | replace` 이외 값을 exit 1 로 거부
- **P0-8 (F8.a)** — `minSlaminarVersion` 게이트 (`src/recommender/catalog-remote.ts`, `src/recommender/catalog-resolver.ts`): 신규 `meetsMinSlaminarVersion()` + `IncompatibleCatalogVersionError`. Resolver 가 카탈로그 요구 버전이 설치 버전보다 높으면 경고 + fallback
- **P0-9 (F3.c)** — corrupt manifest 표면화 (`src/placer/backup.ts`, `src/rollback/uninstaller.ts`, `src/cli.ts`): 신규 `readManifestWithStatus()` 가 `ok` / `missing` / `corrupt` 구분. `uninstall` 이 manifest 읽을 수 없을 때 빨간 경고 + exit 1 (이전엔 silent "complete")
- **P0-10 (F2.a)** — 부분 쓰기 실패 escalation (`src/placer/writer.ts`): 어떤 대상 파일이라도 쓰기 에러 시 throw → pipeline 의 rollback catch (v0.9.1 P0-2) 가 모든 session backup 복원. 이전엔 반쪽 상태 + exit 0
- MSW 2.13.4 devDependency 추가 (Phase Q3 는 현재 `node:http` stub + fetch stub 사용, 향후 network-heavy 시나리오 대비)

**의사결정.**

- **D20.1 — Fault injection 은 로컬 `node:http` stub + `vi.stubGlobal('fetch')`, mock-fs 미도입.** 대안: `mock-fs` 또는 전면 MSW suite. 근거: Phase Q3 착수 시 사용자 결정에 따라 도구 체인 최소화, POSIX-visible 경로 유지. Ephemeral 포트의 실제 HTTP listener 가 slaminar 가 쓰는 실제 경로를 다 커버하고, 글로벌 fetch stub 은 하드코딩된 AI provider endpoint 를 exercise. `mock-fs` 는 slaminar 의 ESM 세팅과 호환성 마찰이 있어 완전 회피. 증거: `tests/fault-injection/network.test.ts` stub server, `tests/fault-injection/ai-provider.test.ts` fetch stub.
- **D20.2 — P0 fix 를 해당 fix 를 surface 한 테스트와 같은 릴리스에 ship.** 대안: v0.9.2 는 인프라만, v0.9.3 에 fix. 근거: D19.8 과 동일 — "버그 테스트 → fix → 통과 테스트" 사슬이 한 커밋에 보이면 리뷰어가 즉시 이해. fix 들은 모두 작음 (1–15 줄). 증거: P0-6 ~ P0-10.
- **D20.3 — `readManifestWithStatus()` 신규 함수로 도입, `readManifest` 는 breaking 없이 유지.** 대안: `readManifest` 반환 타입을 구조체로 변경. 근거: `readManifest` 는 여러 곳에서 records 만 필요로 함 — 구조체 반환 강제는 무관한 call site churn. 신규 함수가 의도 신호 — integrity 를 신경 쓰는 caller (uninstall) 만 사용. 증거: `src/placer/backup.ts` 두 함수 공존.
- **D20.4 — `minSlaminarVersion` 위반은 **경고 + skip**, 즉시 fatal 아님.** 대안: `IncompatibleCatalogVersionError` throw + 중단. 근거: slaminar 의 federation 모델은 6 소스 레이어 — 하나 incompatible 하다고 나머지 5 개까지 막으면 안 됨. Resolver 가 경고 로그 (사용자에게 알림) 후 cache/bundled 로 fall through. Exception 클래스는 향후 fatal 필요 케이스용 예약. 증거: `src/recommender/catalog-resolver.ts` 의 `meetsMinSlaminarVersion` 체크 후 fall-through.
- **D20.5 — Writer 부분 실패 → throw (전체 rollback), partial success 아님.** 대안: 개별 에러에도 나머지 파일 계속 쓰기 + partial-success 결과 보고. 근거: slaminar 가 생성하는 파일들은 서로 참조 (CLAUDE.md ↔ plugin ↔ tools) — "partial init" 은 의미 없는 상태. session 백업으로 init 이전 상태로 rollback 하는 편이 반쪽 config 디버그 요청보다 깔끔. 증거: `src/placer/writer.ts` 신규 throw.
- **D20.6 — F6 concurrency: 재현 + 문서화, v0.9.2 에는 fix 안 함.** 대안: `proper-lockfile` 또는 pid-lock 을 이번에. 근거: concurrency 안전성은 init / update / uninstall / catalog update 네 쓰기 경로를 건드리는 구조 변경 — Phase Q4 (v0.9.3) 가 rollback atomicity 전반 담당이라 함께. Q3 는 증거 (concurrency.test.ts 3 tests) + 문서 생성, Q4 가 자신 있게 랜드. 증거: `docs/qa/reports/phase-q3-exceptions.md` §5 + `tests/fault-injection/concurrency.test.ts`.
- **D20.7 — ENOSPC 는 skip, stub 하지 않음.** 대안: 작은 quota 마운트로 시뮬. 근거: macOS/Linux 에서 admin 없이 포터블 ENOSPC 시뮬은 전용 mount point 없이는 불가. 주석과 함께 `it.skip` 이 정직. OS 레벨 리뷰어를 위해 매트릭스 문서에는 셀 유지. 증거: `tests/fault-injection/fs.test.ts` F2.c.
- **D20.8 — `catalog-mode` 를 4 개 raw-cast 사이트에서 validation.** D20.2 의 한 사례 — helper 로 통합.

**교차 링크.** [CHANGELOG v0.9.2](./CHANGELOG.md#092--2026-04-18) · Phase Q3 보고서: [`docs/qa/reports/phase-q3-exceptions.md`](./docs/qa/reports/phase-q3-exceptions.md) · 매트릭스: [`docs/qa/fault-matrix.md`](./docs/qa/fault-matrix.md) · 테스트: `tests/fault-injection/*.test.ts` (7 files, 47 tests).

### Phase 21: Rollback Integrity + Concurrency Lock (v0.9.3)

**동기.** Phase Q3 에서 F6 concurrency race — 같은 cwd 에 두 `slaminar init` 이 "둘 다 exit 0" 로 성공해 보이지만 manifest 기록을 서로 덮어써 orphan 백업 blob 을 남기고 추후 `uninstall` 이 조용히 복원을 skip 할 수 있음 — 을 재현했고, 실제 fix 는 P1-1 로 이 Phase 로 이관했습니다. 아울러 Obs-Q3-2 (corrupt `.slaminar/config.json` silent default fallback) + 남은 R-series (R3 marker 손상, R5 post-init 외부 삭제, R10 symlink) 를 매듭.

**산출물.**
- `src/locking/file-lock.ts` (신규) — `proper-lockfile@4.1.2` wrapper. `acquireProjectLock()`, `withProjectLock()` (async), `withProjectLockSync()` (uninstall 용), `ProjectBusyError`. Lock 파일: `<root>/.slaminar/lockfile.lock`. `stale: 30_000` 로 죽은 프로세스의 orphan lock 자동 reclaim
- **Lock 적용**: `init` (dry-run 제외), `update` (dry-run 제외), `uninstall`. read-only / HOME-scope 커맨드는 비적용
- **Obs-Q3-2 fix**: `src/team/config.ts` 에 `loadTeamConfigWithStatus()` 신규, `UpdateResult.teamConfigCorrupt` 필드, CLI update 에 노란 경고 + `setup --reconfigure catalog` 힌트
- **Obs-Q4-3 fix**: `ensureGitignore()` 가 `.slaminar/.gitignore` 에 `lockfile.lock` 엔트리 포함
- **Rollback 테스트**: `tests/e2e/rollback.test.ts` +3 (R3 marker 손상, R5 외부 삭제 후 uninstall, R10 symlink loop init). F6 concurrency tests 는 lock 기대치로 업데이트 (F6.a 는 "정확히 하나 성공, 다른 하나 ProjectBusyError")

**R1–R10 매핑**:

| R | 상태 | 위치 |
|---|---|---|
| R1 round-trip | auto | `rollback.test.ts:R1` (v0.9.1) |
| R2 writeTargets 부분 실패 | auto | `rollback.test.ts:P0-1` (v0.9.1) |
| R3 marker 손상 | **신규 auto** | `rollback.test.ts:R3` |
| R4/R8 중첩 init race | lock 으로 대체 | `concurrency.test.ts:F6.a` |
| R5 외부 삭제 | **신규 auto** | `rollback.test.ts:R5` |
| R6 corrupt manifest uninstall | auto | `corrupt.test.ts:F3.c` (v0.9.2 P0-9) |
| R7 `remove <tool>` | auto | `tests/e2e/remove.test.ts` |
| R9 디스크 소진 | skip | `fs.test.ts:F2.c` (ENOSPC 포터블 시뮬 불가) |
| R10 symlink | **신규 auto** | `rollback.test.ts:R10` |

**의사결정.**

- **D21.1 — `proper-lockfile` (runtime dep), 자체 lock 아님.** 대안: 직접 구현한 pid-file + mtime 체크. 근거: `proper-lockfile` 은 2018년부터 안정적이며 stale-lock reclaim, `onCompromised` 통한 graceful auto-release, atomic `mkdir` 기반 획득을 이미 처리. Lock 원시기 구현은 섬세함 (existence 체크의 TOCTOU, handle GC 의미론) 이 필요해 외주가 적절. devDep/runtime-dep 구분상 CLI 가 런타임에도 lock 이 필요하므로 prod deps 에 둠. 증거: `src/locking/file-lock.ts` 가 `lockfile.lock` / `lockSync` / `onCompromised` 사용.
- **D21.2 — Lock acquire 는 fail-fast (retries=0), 대기·재시도 아님.** 대안: backoff 로 재시도. 근거: 두 `slaminar init` 을 병렬로 실행한 사용자는 거의 확실히 실수 (IDE 터미널에서 돌고 있는 걸 잊고 재실행 등). 조용히 기다리면 실수를 가리고 두 번째 실행이 무한 지연. "another slaminar process is already holding the project lock" 명확한 `ProjectBusyError` 가 사용자 판단을 돕는다. 증거: `src/locking/file-lock.ts:acquireProjectLock` 기본 `retries: 0`.
- **D21.3 — Dry-run 은 lock 없음.** 대안: 항상 획득. 근거: Dry-run 은 순수 read. Read 경로에 lock 을 걸면 실제 init + dry-run 병렬 시 false positive 만 만들고 integrity 이득은 0. Writer 만 serialize. 증거: `pipeline.ts:init` / `updater.ts:update` 가 `withProjectLock` 이전에 분기.
- **D21.4 — `uninstall` 에는 sync lock variant.** `withProjectLockSync()` 는 `proper-lockfile.lockSync()` 래핑. 대안: `uninstall()` 을 async 로 전환하고 caller 사슬 전체에 await 추가. 근거: `uninstall` 은 내내 sync (`rmSync`, `copyFileSync`) — 단 하나의 lock acquire 위해 async 화하면 CLI 와 모든 caller 에 await 강제. Sync variant 가 이 use case 에 isomorphic. 증거: `uninstaller.ts:uninstall` 은 `doUninstall` 을 감싸는 한 줄 래퍼.
- **D21.5 — R4/R8 을 serialization 으로 대체, manifest-merge retry 아님.** Q1 매트릭스는 "둘 다 성공 + manifest 에 양쪽 백업 merge" 를 요구했지만 이는 manifest 의 read-modify-write atomicity 를 필요로 하며 serialization 보다 훨씬 어려움. Serialization 이 사용자 관점 동일 결과 (data loss 없음) 를 훨씬 간단한 모델로 제공. 증거: `concurrency.test.ts:F6.a` 는 "exactly-one-wins" 를 assert.
- **D21.6 — R9 (disk full) 는 skip 유지 — Q3 D20.7 과 동일 근거.** 재검토 없음; ENOSPC 포터블 시뮬은 여전히 admin 또는 OS 별 mount 필요.
- **D21.7 — `catalog update` 는 이번에 lock 안 함.** 대안: catalog cache 쓰기 경로까지 lock 확장. 근거: cache 는 `$HOME/.config/slaminar/catalog-cache/` 에 존재 — 프로젝트 lock 과 다른 scope. HOME-scope lock 은 별도 설계 주제 (Obs-Q4-1 P2). 현재 보호: `writeFileSync` 는 작은 파일에 대해 kernel-atomic 이고, remote fetch + cache write 는 단일 invocation 내에서 선형. 다중 프로세스 cache 경합은 드물어 연기. 증거: `src/core/*.ts` 와 `src/rollback/uninstaller.ts` 에서만 lock wrap.
- **D21.8 — `teamConfigCorrupt` 는 경고, hard fail 아님.** D19.5 (missingBackups) 와 D20.4 (minSlaminarVersion) 와 맥락 일치: slaminar 는 degradation 이 graceful 할 때 "사용자에게 크게 알리고 default 로 계속" 을 "중단하고 개입 요구" 보다 선호. 증거: `cli.ts` update action 이 노란 경고 + hint; exit code 는 성공 유지.

**교차 링크.** [CHANGELOG v0.9.3](./CHANGELOG.md#093--2026-04-18) · Phase Q4 보고서: [`docs/qa/reports/phase-q4-rollback.md`](./docs/qa/reports/phase-q4-rollback.md) · 테스트: `tests/e2e/rollback.test.ts`, `tests/fault-injection/concurrency.test.ts`.

### Phase 22: Performance Baseline (v0.9.4)

**동기.** v0.9.3 까지 slaminar 는 475 tests (unit / E2E / fault-injection) 의 QA 커버리지를 쌓았지만, 성능 regression 에 대한 **수치 floor 는 부재**. 선의의 변경이 init wall-time 을 2 배로 만들어도 사용자 제보 전까지 모를 수 있음. Phase Q5 는 baseline 을 세우고 병목을 식별해 이후 릴리스를 regression 에 대해 gate.

**산출물.**
- `scripts/bench-cli.mjs` (신규) — 의존성 없는 CLI wall-time 러너. `spawnSync` + `performance.now()`. 3 fixture × 3 tier × n=8 = 72 runs + warmup. JSON + Markdown 을 `docs/benchmarks/raw/` 에 저장
- `scripts/bench-lib.mjs` (신규) — library 레벨 phase 분해. `dist/core/scanner.js` / `dist/core/pipeline.js` / `dist/recommender/recommender.js` 를 직접 import. Node 시작 비용 제외 → phase 별 기여 가시화
- `tests/bench/pipeline-phases.bench.ts` (신규) — `vitest bench` 버전. 유지하되 주 측정은 scripts/ 사용 (vitest 3.x 의 `describe.each + bench` summary 가 불안정)
- `docs/benchmarks/2026-04-20-baseline.md` (신규) — 날짜 기반 baseline (방법 + 전체 표 + Top 3 병목 + regression 계약)
- `docs/qa/reports/phase-q5-performance.md` (신규) — Phase 요약
- `package.json` scripts: `bench:cli`, `bench:lib`, `bench`

**핵심 수치 (v0.9.4 baseline):**

| 측정 | small (20) | medium (500) | large (5000) |
|---|---|---|---|
| CLI wall-time | 102–104ms | 105–107ms | 121–124ms |
| scan | 287µs | 2.1ms | 13.6ms |
| analyze (scan + 5 analyzers) | 271µs | 2.2ms | 13.5ms |
| recommend (warm) | ~200µs | ~200µs | ~180µs |

**Top 3 병목**: (1) Node.js 시작 + 모듈 로드 (CLI wall-time 의 ~85%), (2) `scan` 파일 트리 walk (선형 3µs/file), (3) `recommend` cold catalog load (+500µs 1회). **모두 P2/P3 — P0 없음**. 이 릴리스는 소스 코드 변경 0.

**의사결정.**

- **D22.1 — Benchmark 러너는 의존성 없는 스크립트, hyperfine 아님.** 대안: `brew install hyperfine` 개발 전제 요구. 근거: slaminar 는 cross-platform 이며 `npm install -g` 로 설치. 별도 바이너리 설치 요구는 마찰. `spawnSync` + `performance.now()` 로 동일 측정 (mean / stddev / min / max over N) + 어디서나 실행 가능. 증거: `scripts/bench-cli.mjs`, `scripts/bench-lib.mjs`.
- **D22.2 — 2 레이어 러너: CLI + library.** 대안: 단일 러너. 근거: CLI wall-time 은 Node 시작이 dominant (~90ms/100ms) 라 pipeline regression 판별 불가. Library 러너가 TS 코드만 측정 (import from dist/) → Node 시작이 iteration 에 amortize. 둘 다 필요. 증거: `scripts/bench-cli.mjs` vs `scripts/bench-lib.mjs`.
- **D22.3 — Raw 결과는 `docs/benchmarks/raw/` 에 commit.** 대안: gitignore. 근거: baseline 은 계약, raw 는 증거. Commit (릴리스당 ~10KB) 하면 향후 리뷰어가 bisect 시 재실행 없이 비교 가능. 파일명 타임스탬프로 덮어쓰기 방지. 증거: `docs/benchmarks/raw/*.{json,md}`.
- **D22.4 — Baseline 은 날짜 파일, 덮어쓰기 아님.** 대안: 단일 `baseline.md` 를 릴리스마다 갱신. 근거: baseline 히스토리 자체가 유용 — "v0.9.4: 100ms / v1.2.0: 60ms / v2.0.0: 40ms" 스토리. 의도된 architecture win 은 역사 마커 가치 있음. 증거: `docs/benchmarks/2026-04-20-baseline.md` 가 시리즈 첫 번째.
- **D22.5 — 이번 릴리스에 코드 변경 0.** 대안: micro-optimization 하나라도 동봉 (예: `fs.readdir` batching). 근거: D20.2 / D21.x 의 "fix-with-the-test" 패턴은 실제 P0 가 있을 때만 의미. Q5 는 P0 발견 없음. 추측성 최적화를 넣으면 baseline 첫 측정에 두 변수 (방법론 + 코드 변경) 가 섞임. Pure-infrastructure 릴리스가 baseline 청결 유지. 증거: CHANGELOG "Not Changed".
- **D22.6 — vitest bench 유지하되 주 측정 아님.** 대안: `tests/bench/*.bench.ts` 제거. 근거: vitest bench 통합은 3.x+ 에서 안정화 예상; scaffolding 유지 저렴. 향후 전환 시 `package.json:bench:lib` 한 줄 변경. 스크립트 기반 선택한 이유는 `describe.each + bench` 가 "NaNx faster" summary artifact 를 만들었기 때문 — 우회가 아니라 버그. 증거: `tests/bench/pipeline-phases.bench.ts` 유지, `package.json:bench:lib` 는 `scripts/bench-lib.mjs` 를 가리킴.

**교차 링크.** [CHANGELOG v0.9.4](./CHANGELOG.md#094--2026-04-20) · [baseline](./docs/benchmarks/2026-04-20-baseline.md) · [Phase Q5 보고서](./docs/qa/reports/phase-q5-performance.md) · [raw data](./docs/benchmarks/raw/).

### Phase 23: v0.9.x QA Closure (v0.9.5)

**동기.** 5 개 연속 Phase (Q1–Q5) 가 많은 산출물을 만들었습니다 — 128 신규 tests, 9 P0 fix, 2 P1 해소, 10 P2 티켓, 28 design decisions, 신규 인프라 3 개 (E2E / fault-injection / bench). 정리 문서 없이는 v0.10+ 기여자가 5 개 Phase 보고서를 따로 읽어야 상태 파악 가능. Q6 는 그 consolidation. 이번 릴리스는 summary + v0.9.x QA 사이클의 공식 종결.

**산출물 (문서만):**
- `docs/qa/reports/2026-04-20-qa-summary.md` (신규) — 종합 roll-up:
  - Test count 성장 curve 347 → 475 (+37%) 시각화
  - P0/P1/P2 status 표 — 각 fix 의 file:line 포함
  - Phase 별 28 개 design decisions 인덱스
  - QA 인프라 커맨드 레퍼런스 (`npm test` / `test:e2e` / `test:all` / `bench:*`)
  - `docs/qa/`, `docs/benchmarks/`, `tests/e2e/`, `tests/fault-injection/`, `tests/bench/`, `scripts/` 디렉토리 맵
  - **권장 QA 반복 주기** — 매 PR / 매 minor 릴리스 / 매 RC / 분기 / 연
  - 새 기능 도입 시 QA 체크리스트 (Q2–Q5 패턴 5 단계)
  - 회고 — 잘 된 것 4 가지, 개선할 것 4 가지

**v0.9.x delta (v0.9.0–0.9.5 누적):**
- +128 tests (365 → 475 unit+e2e+fault, 1 skip 유지)
- +18 source modules (tokenTier feature, E2E helpers, fault helpers, file-lock, bench scripts)
- +1 runtime dep (`proper-lockfile`), +1 devDep (`msw`)
- 9 P0 버그 fix, 2 P1 해소, 10 P2 티켓화 → v0.10+

**의사결정.**

- **D23.1 — Q6 를 pure-documentation 릴리스로.** 대안: Q6 를 더 큰 v0.10.0 에 folded. 근거: QA 사이클을 자체 tag 로 닫으면 clean git marker — `git log --grep "v0.9.5"` 가 summary commit 가리킴, 리뷰어가 `git checkout v0.9.5` 로 사이클 종결 시점 전체 상태 볼 수 있음. v0.10.0 과 번들링하면 "마지막 QA" 와 "첫 feature" 내러티브가 섞임. 증거: zero-code-change CHANGELOG.
- **D23.2 — Summary 는 `docs/qa/reports/`, repo root 아님.** 대안: root 레벨 `QA-SUMMARY.md`. 근거: 기존 5 개 Phase 보고서가 있는 디렉토리와 일관성. 향후 Q7/Q8 summary 는 같은 위치에 같은 날짜 형식으로 → 리더가 `ls docs/qa/reports/*-summary.md` 로 모든 사이클 종결 한 번에 볼 수 있음. 증거: 파일 위치.
- **D23.3 — Cadence 권고는 summary 에, CI config 아님.** 대안: GitHub Actions schedule 로 인코딩. 근거: cadence 는 human policy (분기마다 무엇을 할지). 일부는 CI 에 가야 맞음 (PR 당 `test:all`), 하지만 "매 minor 릴리스마다 Q1 현황 재스캔" 같은 human-judgment task 는 auto 돌면 안 됨. Summary 가 의도 문서화, CI 는 minimal. 증거: Q6 보고서 §8.
- **D23.4 — "final" 언어 사용 안 함 — v0.9.x 는 closed 하지만 frozen 아님.** 대안: Q6 를 "QA complete" 로 표현. 근거: Q6 는 cycle 경계이지 종결 주장이 아님. P2 ticket list 가 v0.10+ 구체 후속을 enumerate, cadence 권고가 지속적 QA 작업을 전제. 증거: summary §11 ("다음 major 작업 후보") 과 §8 cadence 표 모두 v0.9.x 를 checkpoint 로 취급.

**교차 링크.** [CHANGELOG v0.9.5](./CHANGELOG.md#095--2026-04-20) · [Q6 summary](./docs/qa/reports/2026-04-20-qa-summary.md) · 이전 Phases: [Q2](./docs/qa/reports/phase-q2-functional.md) · [Q3](./docs/qa/reports/phase-q3-exceptions.md) · [Q4](./docs/qa/reports/phase-q4-rollback.md) · [Q5](./docs/qa/reports/phase-q5-performance.md).

### Phase 24: 카탈로그 정합성 감사 + Validator + Installer Router (v0.9.6)

**동기.** 슬라미나 소스 리포 자체에 `/slaminar` 를 돌리는 메타/도그푸드 케이스에서 3 가지 잠재 버그가 드러났다. (a) 마커 validator 가 백틱 안의 리터럴 마커 문자열을 실제 begin 으로 세어서, `CLAUDE.md` 가 자기 자신의 마커 문법을 문서화할 때마다 mismatch 로 표시되었다. (b) 상위 5개 추천 도구를 즉석 확인한 결과 3 개가 존재하지 않는 `anthropics/*` 레포이거나, 더 나쁘게는 무관한 npm 패키지 이름 충돌 (`get-shit-done` = Pomodoro 타이머) 이었다. (c) `slaminar install` 서브커맨드가 없어 사용자가 `slaminar recommend` 출력의 raw 설치 명령을 직접 실행해야 했고, 그 명령들은 CWD 가 대상 프로젝트라고 가정해서 (슬라미나 자기 리포 위에서 실행 같은 경우) 워킹 트리를 조용히 더럽혔다.

**출시 내역.**
- `src/validator/claude-md.ts` — `stripCodeRegions()` 헬퍼로 fenced + inline 코드를 마커 스캔 전에 무효화. 회귀 테스트 2 개 추가 (inline span, fenced block).
- `scripts/verify-catalog.mjs` (신규) + `npm run verify:catalog` — `catalog/catalog.json` 의 모든 GitHub 레포/npm 패키지/PyPI 프로젝트를 HEAD 체크. npm 설명과 카탈로그 설명을 휴리스틱으로 대조해 이름 충돌 잡아냄. hard failure 시 non-zero exit, marketplace/GitHub ratelimit 는 warning 취급. `GITHUB_TOKEN` env 로 5000/hr 인증 cap 활용.
- `.github/workflows/catalog-audit.yml` (신규) — 스크립트를 주간 + 카탈로그 수정 PR + 수동 dispatch 에서 실행; 실패 시 이슈 자동 생성/갱신.
- `catalog/catalog.json` — 7 개 엔트리를 실제 상태에 맞게 재작성: `everything-claude-code` → `affaan-m/*`, `md2pptx` → `MartinPacker/*` git-clone, `spec-kit` → `npx @spec-kit/cli init`, `planning-with-files` → `OthmanAdi/*` git-clone, `graphify` → `safishamsi/*` git-clone, `get-shit-done` → `gsd-build/*` git-clone. `powerpointer` 는 완전히 제거 (검증 가능한 소스 없음). 카탈로그 `2.1.0 → 2.2.0`; tools 56 → 55; relations 26 → 24.
- `src/types/index.ts` — `installMethod` enum 에 `npm-global`, `npm-dev`, `npm-init` 추가. `marp`, `playwright`, `slidev` 재분류.
- `src/recommender/catalog.ts` — `BUNDLED_CATALOG` 비움 (14 개 엔트리 전부 공식 카탈로그의 동명 엔트리에 shadow 되며, 전부 동일한 `anthropics/*` phantom owner 였음). 첫 실행 오프라인은 disk cache 레이어로 여전히 동작.
- `src/recommender/installer-router.ts` (신규) + `slaminar install` 서브커맨드 — 각 설치 방식을 안전한 target 으로 라우팅:
  - `git-clone` → `~/.config/slaminar/refs/<tool>/` (CWD 건드리지 않음)
  - `npm-global`, `pip` → 전역 설치, CWD 무관
  - `npm-dev`, `npm-init`, `npx` → scaffolder; `--target <path>` 없으면 block
  - `marketplace` → `/install-plugin X` 는 Claude Code 안에서 실행하라는 안내
  `--all`, `--dry-run`, `--ref-dir` 지원. JSONL 감사 로그 `~/.config/slaminar/install-audit.jsonl` 에 기록. 라우터 테스트 9 개 추가.

**의사결정.**

- **D24.1 — 마커 스캔에만 코드 영역 제거, 모든 스캐너에 적용하지 않음.** 대안: `validateClaudeMd` 내 모든 regex sweep 에 전역 적용. 근거: 같은 콘텐츠의 `npm run` 스캔은 백틱 인용 명령에 의존 (CLAUDE.md 는 보통 `` `npm run build` `` 처럼 스크립트를 참조). 전역 제거는 이 검사를 깨뜨림. 별도 `markerScanContent` 변수로 스코프 한정한 neutralisation 이 최소 변경. 증거: `src/validator/claude-md.ts` — marker-well-formed 체크만 stripped content 사용, `commands-valid` 는 raw text 유지.
- **D24.2 — 번들 카탈로그는 영구히 빈 상태 유지, "공식의 fallback 스냅샷" 아님.** 대안: 검증된 공식 도구의 trimmed 스냅샷으로 교체. 근거: 정적 스냅샷은 배포 즉시 썩기 시작; catalog-cache 레이어가 첫 성공 fetch 이후 오프라인을 이미 커버; 모든 historical 번들 엔트리가 phantom 이었다는 건 번들 데이터가 권위 있는 remote 와 함께 충실히 유지될 수 없다는 증거. "번들은 영구히 빔" 을 받아들이는 게 계약에 정직. 증거: `src/recommender/catalog.ts` 주석 블록.
- **D24.3 — `slaminar install` 은 scaffolder 에 대해 `--target` 없으면 절대 CWD 설치 안 함.** 대안: `--target` 기본값을 `process.cwd()` 로, 확인 prompt. 근거: `npm init foo` / `npm install -D bar` 는 CWD 를 되돌릴 수 없게 변경 (package.json / lockfile). 메타 케이스 사용자가 슬라미나 소스 트리에서 `slaminar install` 을 돌릴 때 슬라미나 리포가 bar 의 대상이 되기를 원하는 경우는 거의 없음. 설명과 함께 block 하는 기본값이 override 가능한 기본값보다 안전; CWD 원하면 `--target .` 넘기면 됨. 증거: `routeInstall()` 의 scaffolder 분기는 `opts.target` 없으면 `blocked` 반환.
- **D24.4 — phantom owner 재지정이 삭제보다 우선.** 대안: 첫 패스처럼 검증 불가 엔트리 전부 삭제 유지. 근거: 초기 sweep 은 `catalog/catalog.json` 만 격리 체크해서 `anthropics/planning-with-files`, `anthropics/graphify`, `anthropics/get-shit-done` 가 없다고 결론. `README.md` 외부 링크 (이미 실제 owner 로 문서화되어 있던 — `OthmanAdi/*`, `safishamsi/*`, `gsd-build/*`) 교차 확인 결과 카탈로그만 틀렸고 문서는 맞았다. 감사가 "카탈로그에 없음" 에서 멈췄다면 실존하는 high-star 도구 3 개를 조용히 잃을 뻔함. 향후 감사 워크플로는 삭제 제안 전 README 를 먼저 읽음. 증거: 첫 패스 commit 히스토리 + CHANGELOG § "Note on the initial audit error".
- **D24.5 — 새 `installKind` 필드 대신 `installMethod` enum 확장.** 대안: 별도 `installKind` 디스크리미네이터 추가하고 `installMethod` 를 거친 bucket 으로 유지. 근거: 모든 `installMethod` 하위 소비자가 이미 자유 문자열로 취급 (Phase 24 리뷰의 Grep 결과 참조). 필드 2 개는 모든 리포터/differ/디스플레이 경로가 어느 쪽을 읽을지 결정해야 함. union 확장은 단일 source of truth 유지 + forward-compatible — 새 method (예: `bun-global`) 는 union 을 넓히기만 하면 됨. 증거: `src/recommender/installer.ts` 는 `'marketplace'` 만 special-case; 리포터는 `tool.installMethod` 를 그대로 출력.

**스탯.** Tests 367 → 373 (+9 router, +2 validator, −6 콘텐츠 의존 bundled). Catalog 56 → 55 tools. `src/recommender/catalog.ts` −176 lines. 새 CI 워크플로 1 개, 새 감사 스크립트 1 개, 새 CLI 서브커맨드 1 개.

**교차 링크.** [CHANGELOG v0.9.6](./CHANGELOG.md#096--2026-04-20) · 감사 스크립트: [`scripts/verify-catalog.mjs`](./scripts/verify-catalog.mjs) · CI 워크플로: [`.github/workflows/catalog-audit.yml`](./.github/workflows/catalog-audit.yml) · installer router: [`src/recommender/installer-router.ts`](./src/recommender/installer-router.ts).

### 교차 참조 인덱스 (v0.5 → v0.9.6)

위의 번호 붙은 모든 의사결정은 3곳에 기록되어 있습니다 — README(여기), CHANGELOG(릴리스 노트), 설계 spec(있을 때). 의사결정 ID는 **`README.md`와 `README.ko.md`에서 동일** — `grep -n "D14\.3" README*.md`로 패리티 검증 가능. 파일 경로는 직접 열어 주장 감사 가능; 테스트 파일은 `npm test -- --run <path>`로 격리 실행.

| ID | 제목 | CHANGELOG | Spec | Source | Tests |
|---|---|---|---|---|---|
| D11.1 | 3중 안전 postinstall | v0.5.0 | — | `src/skill/post-install.ts` | `tests/skill/installer.test.ts` |
| D11.2 | SHA-256 멱등성 | v0.5.0 | — | `src/skill/installer.ts` | `tests/skill/installer.test.ts` |
| D11.3 | 빌드 자산 복사 스크립트 | v0.5.0 | — | `scripts/copy-assets.mjs` | — |
| D11.4 | 내용 불일치 시에만 백업 | v0.5.0 | — | `src/skill/installer.ts` | `tests/skill/installer.test.ts` |
| D11.5 | 경로 파라미터화 SKILL.md | v0.5.0 | — | `src/skill/SKILL.md` | — |
| D12.1 | `setup` 단일 진입점 | v0.6.0 | `2026-04-17-global-setup-plan.md` | `src/setup/wizard.ts` | `tests/setup/wizard.test.ts` |
| D12.2 | XDG config 위치 | v0.6.0 | same | `src/setup/defaults.ts` | `tests/setup/defaults.test.ts` |
| D12.3 | 주간 버전 체크 | v0.6.0 | same | `src/setup/update-check.ts` | `tests/setup/update-check.test.ts` |
| D12.4 | CI용 `--yes` + env vars | v0.6.0 | same | `src/setup/wizard.ts` | `tests/setup/wizard.test.ts` |
| D12.5 | Doctor 읽기 전용 | v0.6.0 | same | `src/setup/doctor.ts` | `tests/setup/doctor.test.ts` |
| D12.6 | 손상 JSON 복구 | v0.6.0 | same | `src/setup/defaults.ts` | `tests/setup/defaults.test.ts` |
| D13.1 | 사용자 지정 루트 | v0.7.0 | spec §v0.7 | `src/discover/scanner.ts` | `tests/discover/scanner.test.ts` |
| D13.2 | 확정 프로젝트에서 중단 | v0.7.0 | same | `src/discover/scanner.ts` | `tests/discover/scanner.test.ts` |
| D13.3 | Dry-run 기본 | v0.7.0 | same | `src/discover/batch.ts`, `src/setup/wizard.ts` | `tests/discover/batch.test.ts` |
| D13.4 | 일괄 감사 로그 | v0.7.0 | same | `src/discover/batch.ts` | `tests/discover/batch.test.ts` |
| D13.5 | `existing` → `init-merge` | v0.7.0 | same | `src/discover/detector.ts` | `tests/discover/detector.test.ts` |
| D13.6 | realpath inode 중복체크 | v0.7.0 | same | `src/discover/scanner.ts` | `tests/discover/scanner.test.ts` |
| D14.1 | Phase 1–3만, v0.9 연기 | v0.8.0 | `2026-04-16-custom-catalog-plan.md` | — | — |
| D14.2 | Read-path-only 마이그레이션 | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
| D14.3 | Per-source 캐시 파일 | v0.8.0 | same | `src/recommender/catalog-cache.ts` | `tests/recommender/catalog-cache.test.ts` |
| D14.4 | 위자드 단일 URL + CLI 힌트 | v0.8.0 | same | `src/setup/wizard.ts:stepCatalog` | `tests/setup/wizard.test.ts` |
| D14.5 | Bundled은 replace-floor 면제 | v0.8.0 | same | `src/recommender/catalog-merger.ts` | `tests/recommender/catalog-merger.test.ts` |
| D14.6 | trust 저장만, enforcement X | v0.8.0 | same | `src/types/index.ts` | — |
| D14.7 | CLI `--catalog`를 adhoc 소스로 | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-resolver.test.ts` |
| D14.8 | 고정 `cli-adhoc` ID vs 해시된 env ID | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
| D15.1 | Claude Code 맥락에 `--no-ai` 강제 | v0.8.2 | `2026-04-17-claude-code-passthrough-design.md` | `src/skill/SKILL.md` | — |
| D15.2 | Enhancement 경계 = ownership markers | v0.8.2 | same | `src/placer/markers.ts`, `src/core/updater.ts` | — |
| D15.3 | SKILL.md가 carrier, env-var 자동 감지 없음 | v0.8.2 | same | `src/skill/SKILL.md` | — |
| D16.1 | `defaults.json` 유무가 첫 실행 판정 기준 | v0.8.4 | `2026-04-17-v0-8-4-init-first-design.md` | `src/cli.ts`, `src/setup/defaults.ts` | `tests/setup/inline-prompt.test.ts` |
| D16.2 | Mini-setup은 1개 질문만 | v0.8.4 | same | `src/setup/inline-prompt.ts` | `tests/setup/inline-prompt.test.ts` |
| D16.3 | Auth 실패 시 init 중단, graceful fallback 없음 | v0.8.4 | same | `src/cli.ts` | — |
| D16.4 | `slaminar setup` 변경 없음; mini-setup 독립 경로 | v0.8.4 | same | `src/setup/wizard.ts`, `src/auth/wizard.ts` | — |
| D16.5 | `claude` CLI 감지는 v0.9.0으로 (YAGNI) | v0.8.4 | same | `src/setup/inline-prompt.ts` | — |
| D17.1 | 카탈로그 소스 타입별 디스패처 패턴 | v0.8.5 | `0-8-jiggly-ullman.md` | `src/recommender/catalog-remote.ts` | `tests/recommender/catalog-remote.test.ts` |
| D17.2 | 로컬 파일은 `fs.readFile`, `fetch('file://')` 아님 | v0.8.5 | same | `src/recommender/catalog-remote.ts:fetchLocalCatalog` | `tests/recommender/catalog-remote.test.ts` |
| D17.3 | Presentation 카테고리는 OSS만, 상업 API 제외 | v0.8.5 | same | `catalog/catalog.json` | — |
| D17.4 | 참고 문서는 점진 배포, 전체 커버리지 gate 없음 | v0.8.5 | same | `docs/catalog-tools-reference.md` | — |
| D18.1 | 하이브리드 cost: 휴리스틱 + 선택적 override | v0.9.0 | `harmonic-wishing-pumpkin.md` | `src/recommender/token-cost.ts` | `tests/recommender/token-cost.test.ts` |
| D18.2 | 휴리스틱 기본값은 `medium` (conservative-safe) | v0.9.0 | same | `src/recommender/token-cost.ts` | `tests/recommender/token-cost.test.ts` |
| D18.3 | Tier policy 는 코드 상수 (v0.9.0 override 없음) | v0.9.0 | same | `src/recommender/tier-filter.ts` | `tests/recommender/tier-filter.test.ts` |
| D18.4 | 제외된 도구는 리포트 표에 명시 | v0.9.0 | same | `src/reporter/terminal.ts` | — |
| D18.5 | Score threshold (med ≥ 80 / high ≥ 70) 예외 | v0.9.0 | same | `src/recommender/tier-filter.ts` | `tests/recommender/tier-filter.test.ts` |
| D18.6 | Inline mini-setup 에 tokenTier 질문 없음 (D16.2 유지) | v0.9.0 | same | `src/setup/inline-prompt.ts` (변경 없음) | — |
| D18.7 | Tier 필터는 추천만 게이트, 설치는 게이트 안 함 | v0.9.0 | same | `src/recommender/recommender.ts` | `tests/recommender/recommender.test.ts` |
| D18.8 | 휴리스틱 감사 우선 (v0.9.0 override 0) | v0.9.0 | same | `src/recommender/token-cost.ts:HEAVY_TAGS` | — |
| D18.9 | Custom catalog 도 동일 하이브리드 파이프라인 | v0.9.0 | same | `src/recommender/recommender.ts` | `tests/recommender/tier-filter.test.ts` |
| D19.1 | E2E 는 compiled `dist/cli.js` execFile 로 (in-process 아님) | v0.9.1 | `harmonic-wishing-pumpkin.md` (QA) | `tests/e2e/_helpers.ts` | `tests/e2e/*.test.ts` |
| D19.2 | Fixture 는 런타임 생성, git commit 안 함 | v0.9.1 | same | `tests/e2e/_helpers.ts:createFixture` | `tests/e2e/*.test.ts` |
| D19.3 | 단일 vitest config + `E2E=1` env 분기 | v0.9.1 | same | `vitest.config.ts` | — |
| D19.4 | `writeManifest` atomic via tmp+rename (journal 아님) | v0.9.1 | same | `src/placer/backup.ts:writeManifest` | `tests/e2e/rollback.test.ts` |
| D19.5 | `missingBackups` 는 경고로만, uninstall fail 안 시킴 | v0.9.1 | same | `src/cli.ts` uninstall action | `tests/e2e/rollback.test.ts` |
| D19.6 | `SkillUninstallResult.status` enum (boolean 아님) | v0.9.1 | same | `src/types/index.ts`, `src/skill/installer.ts` | `tests/e2e/skill.test.ts` |
| D19.7 | `preAction` 이 update-check 에러 삼킴 | v0.9.1 | same | `src/cli.ts:preAction` | `tests/e2e/rollback.test.ts` |
| D19.8 | P0 fix 를 QA 인프라와 같은 릴리스에 묶음 | v0.9.1 | same | — | — |
| D20.1 | Fault injection 은 `node:http` stub + fetch stub (mock-fs X) | v0.9.2 | `harmonic-wishing-pumpkin.md` (QA) | `tests/fault-injection/_helpers.ts` | `tests/fault-injection/*.test.ts` |
| D20.2 | P0 fix 를 테스트와 같은 릴리스에 ship | v0.9.2 | same | — | — |
| D20.3 | `readManifestWithStatus` 를 `readManifest` 와 공존 (breaking 없음) | v0.9.2 | same | `src/placer/backup.ts` | `tests/fault-injection/corrupt.test.ts` |
| D20.4 | `minSlaminarVersion` 위반 = warn + skip (fatal 아님) | v0.9.2 | same | `src/recommender/catalog-resolver.ts` | `tests/fault-injection/version.test.ts` |
| D20.5 | Writer 부분 실패 = throw (pipeline rollback 전체 복원) | v0.9.2 | same | `src/placer/writer.ts` | `tests/fault-injection/fs.test.ts` |
| D20.6 | F6 concurrency: 재현 + 문서화, v0.9.3 Phase Q4 에서 fix | v0.9.2 | same | `tests/fault-injection/concurrency.test.ts` | same |
| D20.7 | ENOSPC skip (포터블 시뮬 불가) | v0.9.2 | same | `tests/fault-injection/fs.test.ts` (it.skip) | — |
| D20.8 | `catalog-mode` 를 4 개 raw-cast 사이트에서 validation | v0.9.2 | same | `src/cli.ts:validateCatalogMode` | `tests/fault-injection/input.test.ts` |
| D21.1 | `proper-lockfile` (runtime dep), 자체 lock 아님 | v0.9.3 | `harmonic-wishing-pumpkin.md` (QA) | `src/locking/file-lock.ts` | `tests/fault-injection/concurrency.test.ts` |
| D21.2 | Lock acquire 는 fail-fast (retries=0) | v0.9.3 | same | `src/locking/file-lock.ts:acquireProjectLock` | same |
| D21.3 | Dry-run 은 lock 없음 | v0.9.3 | same | `src/core/pipeline.ts`, `src/core/updater.ts` | same |
| D21.4 | `uninstall` 은 sync lock variant | v0.9.3 | same | `src/locking/file-lock.ts:withProjectLockSync` | `tests/e2e/rollback.test.ts` |
| D21.5 | R4/R8 은 serialization 으로 대체 (manifest-merge 아님) | v0.9.3 | same | `src/locking/file-lock.ts` | `tests/fault-injection/concurrency.test.ts:F6.a` |
| D21.6 | R9 (disk full) 는 skip 유지 — D20.7 과 동일 | v0.9.3 | same | `tests/fault-injection/fs.test.ts:F2.c` | — |
| D21.7 | `catalog update` 는 unlocked (HOME-scope, 연기) | v0.9.3 | same | — | — |
| D21.8 | `teamConfigCorrupt` 는 경고, hard fail 아님 | v0.9.3 | same | `src/team/config.ts:loadTeamConfigWithStatus`, `src/cli.ts` | `tests/fault-injection/corrupt.test.ts:F3.f` |
| D22.1 | Benchmark 러너는 의존성 없는 스크립트 (hyperfine X) | v0.9.4 | `harmonic-wishing-pumpkin.md` (QA) | `scripts/bench-{cli,lib}.mjs` | `docs/benchmarks/raw/` |
| D22.2 | 2 레이어 러너 (CLI wall-time + library phase breakdown) | v0.9.4 | same | same | same |
| D22.3 | Raw 결과는 `docs/benchmarks/raw/` 에 commit | v0.9.4 | same | `docs/benchmarks/raw/` | — |
| D22.4 | Baseline 은 날짜 파일, 덮어쓰기 아님 | v0.9.4 | same | `docs/benchmarks/2026-04-20-baseline.md` | — |
| D22.5 | 이번 릴리스에 코드 변경 0 — pure infrastructure | v0.9.4 | same | — | — |
| D22.6 | vitest bench 유지하되 주 측정 아님 | v0.9.4 | same | `tests/bench/pipeline-phases.bench.ts` | — |
| D23.1 | Q6 를 pure-documentation 릴리스로 (깔끔한 cycle 경계) | v0.9.5 | `harmonic-wishing-pumpkin.md` (QA) | — | — |
| D23.2 | QA summary 는 `docs/qa/reports/`, repo root 아님 | v0.9.5 | same | `docs/qa/reports/2026-04-20-qa-summary.md` | — |
| D23.3 | Cadence 권고는 summary 에, CI config 아님 | v0.9.5 | same | — | — |
| D23.4 | v0.9.x QA 는 "closed not frozen" — v0.10+ 후속 명시 | v0.9.5 | same | — | — |

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
| **멀티 소스 카탈로그** | 여러 카탈로그 소스를 우선순위 레이어로 병합 | **v0.8 배포됨** ([D14.1–D14.8](#교차-참조-인덱스-v05--v08)) |
| **`catalog source` CLI** | `source add/list/remove/enable/disable/test` | **v0.8 배포됨** |
| **`SLAMINAR_CATALOG_SOURCES` 환경변수** | CI용 멀티 카탈로그 환경변수 | **v0.8 배포됨** |
| **개인 도구** | 로컬 config의 `personalTools` 필드 | 스텁(타입만 존재) |
| **`slaminar install`** | 추천 도구를 CLI에서 직접 설치 — install-method별 라우팅 (git-clone은 ref dir로, scaffolder는 `--target` 필수) | **v0.9.6 배포됨** |
| **카탈로그 trust enforcement** | v0.9 — `untrusted` 소스 설치 전 prompt, 위험 명령 탐지(`rm`, `sudo`, `curl \| bash`), HTTPS 강제, 서명 `verified` trust | 계획 (v0.9) |
| **`npm:@scope/name` 소스 타입** | v0.9 — private-registry 팀을 위한 npm 카탈로그 | 계획 (v0.9) |
| **Legacy 필드 정리** | v0.9 — deprecated `catalogUrl`/`catalogMode` 단일 필드 제거 | 계획 (v0.9) |

자세한 multi-source 카탈로그 설계는 [`docs/superpowers/specs/2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md)를 참고하고, setup/discover/federation 로드맵은 [`docs/superpowers/specs/2026-04-17-global-setup-plan.md`](./docs/superpowers/specs/2026-04-17-global-setup-plan.md)를 참고하세요.

---

## 프로젝트 통계

| 항목 | 수치 |
|------|------|
| 소스 모듈 | 61개 |
| 테스트 파일 | 55개 |
| 테스트 케이스 | 338개 |
| CLI 명령어 | 28개 |
| 카탈로그 도구 | 85개 (온라인, catalog v2.3.0) + 0개 (번들 — v0.9.6부터 의도적 비어둠) |
| 카탈로그 소스 레이어 | 6단계 (bundled → official → user → project → env → CLI, v0.8.0부터) |
| AI 프로바이더 | 2개 (Cloudflare, Anthropic) |
| Claude Code 통합 | 자동 배포되는 `/slaminar` 스킬 (v0.5.0부터) |
| 전역 설정 | `setup` + `doctor` + `~/.config/slaminar/defaults.json` (v0.6.0부터) |
| 프로젝트 발견 | `slaminar discover` + 일괄 적용 (v0.7.0부터) |

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
A. 일반 사용에는 **Cloudflare Workers AI**를 권장합니다. 무료 한도가 넉넉하고 Llama 3.3 70B로도 CLAUDE.md 개선 품질이 충분합니다. 최고 품질이 필요하거나 긴 컨텍스트 (200K+)를 써야 한다면 **Anthropic Claude**를 사용하세요. `slaminar setup --reconfigure auth`로 언제든 전환 가능합니다.

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
