# Claude Code Tools — 통합 카탈로그

> **Last updated:** 2026-04-16
> **Sources:** 1차 조사 (2026-04-14) + 2차 조사 (2026-04-16) 통합
> **Purpose:** slaminar 추천 후보 풀 + 생태계 전반 레퍼런스
> **Total:** 80+ 도구 수록

## 읽는 법

| 열 | 설명 |
|----|------|
| **Status** | 🟢 slaminar 카탈로그 내장 / 🟡 추가 후보 (Top 10) / ⚪ 참고 / ⛔ Auth 필요로 제외 |
| **Auth** | ❌ 불필요 / partial = 일부 기능만 / ✅ 필수 (자동 제외 대상) |
| **Install** | marketplace / npx / git-clone / pip / composer / desktop |

---

## A. 범용 (Universal) — 모든 프로젝트에 적용 가능

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟢 | **caveman** | 26K | ❌ | marketplace | 토큰 65% 절약 |
| 🟢 | **planning-with-files** | 19K | ❌ | git-clone | Manus 스타일 마크다운 계획 수립 (실제 레포: `OthmanAdi/planning-with-files`) |
| 🟢 | **everything-claude-code** | 161K | ❌ | git-clone | 성능 최적화 (실제 레포: `affaan-m/everything-claude-code`) |
| 🟢 | **claude-mem** | 53K | ❌ | npx | 세션 캡처 + AI 압축 + 미래 세션 주입 |
| 🟢 | **claude-hud** | 19K | ❌ | marketplace | 실시간 컨텍스트/에이전트 모니터링 HUD |
| 🟢 | **homunculus** | 358 | ❌ | marketplace | 작업 패턴 학습 → 자기 진화 |
| 🟡 | **wshobson/agents** | 34K | ❌ | marketplace | 멀티에이전트 오케스트레이션 (75 plugins) |
| 🟡 | **Piebald-AI/claude-code-lsps** | 405 | ❌ | marketplace | 20+ 언어 LSP 서버 (정적 분석) |
| 🟡 | **davila7/claude-code-templates** | — | ❌ | npx | 프로젝트 부트스트랩 템플릿 CLI |
| 🟡 | **github/spec-kit** | — | ❌ | npx | GitHub 공식 Spec-Driven Development (`npx @spec-kit/cli init`) |
| 🟡 | **0xfurai/claude-code-subagents** | — | ❌ | git-clone | 100+ 프로덕션급 서브에이전트 |
| ⚪ | **gstack** | 71K | ❌ | git-clone | Garry Tan의 23개 도구 셋업 |
| ⚪ | **get-shit-done** | 55K | ❌ | git-clone | 메타 프롬프팅, 스펙 기반 개발 (실제 레포: `gsd-build/get-shit-done`) |
| ⚪ | **claude-code-best-practice** | 42K | ❌ | — | Best practices 가이드 |
| ⚪ | **claude-skills (alirezarezvani)** | 11K | ❌ | git-clone | 232+ skills |
| ⚪ | **pro-workflow** | 1.9K | ❌ | marketplace | 50+ 세션 메모리, 병렬 worktree |
| ⚪ | **Continuous-Claude-v3** | 3.7K | ❌ | hook | 컨텍스트 관리 (ledger, handoff) |
| ⚪ | **arscontexta** | 3.1K | ❌ | marketplace | 대화 → 지식 시스템 |
| ⚪ | **compound-engineering-plugin** | 14K | ❌ | marketplace | Compound Engineering |

---

## B. 프론트엔드 (Frontend)

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟢 | **impeccable** | 19K | ❌ | marketplace | AI용 디자인 언어 (18 commands) |
| 🟢 | **playwright-skill** | 2.4K | ❌ | marketplace | Playwright 브라우저 자동화/테스트 |
| ⚪ | **nothing-design-skill** | 1.7K | ❌ | marketplace | Nothing 디자인 언어 UI |
| ⚪ | **pinme** | 3.2K | partial | git-clone | 프론트엔드 원커맨드 배포 |
| ⚪ | **fireworks-tech-graph** | 2.1K | ❌ | git-clone | SVG+PNG 기술 다이어그램 |

---

## C. 대형 코드베이스 (Large Codebase)

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟢 | **graphify** | 30K | partial | git-clone | 코드/문서 → 쿼리 가능 지식 그래프 (실제 레포: `safishamsi/graphify`) |
| 🟢 | **cartographer** | 542 | ❌ | marketplace | 코드베이스 매핑 + 문서화 (병렬 서브에이전트) |
| ⚪ | **codebase-to-course** | 3.4K | ❌ | git-clone | 코드베이스 → HTML 코스 |

---

## D. 보안 (Security)

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟢 | **trailofbits/skills** | 4.5K | ❌ | marketplace | 보안 연구, 취약점 탐지 (Trail of Bits) |
| 🟡 | **Eyadkelleh/awesome-claude-skills-security** | — | ❌ | git-clone | SecLists + payloads + pentest agents |
| ⚪ | **transilienceai/communitytools** | — | ❌ | git-clone | 23 skills + 8 agents 풀 pentest lifecycle |
| ⚪ | **Stickman230/claude-pentest** | — | ❌ | git-clone | 공격형 pentest |
| ⚪ | **skills-curated (trailofbits)** | 352 | ❌ | git-clone | Trail of Bits 큐레이션 |
| ⚪ | **Krait (zealynx)** | — | ❌ | git-clone | Solidity + Rust/Solana + Web2 보안 감사 |

---

## E. DevOps / IaC / 인프라

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟡 | **antonbabenko/terraform-skill** | — | ❌ | git-clone | Terraform/OpenTofu (커뮤니티 리더 제작) |
| ⚪ | **ahmedasmar/devops-claude-skills** | — | ❌ | git-clone | DevOps 워크플로우 마켓플레이스 |
| ⚪ | **akin-ozer/cc-devops-skills** | — | ❌ | git-clone | 실무용 DevOps 팩 (CC + Codex) |
| ⚪ | **lgbarn/devops-skills** | — | ❌ | git-clone | Terraform/OpenTofu + AWS safety-first |
| ⚪ | **agent-skills (hashicorp)** | 537 | ❌ | git-clone | HashiCorp 공식 스킬 |

---

## F. 언어 / 프레임워크 전문

### F.1 PHP / Laravel

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟡 | **laravel/agent-skills** | — | ❌ | git-clone | Laravel 공식 Agent Skills |
| ⚪ | **laravel/claude-code** | — | ❌ | composer | Laravel 공식 CC 통합 |

### F.2 Ruby / Rails

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟡 | **obie/claude-on-rails** | — | ❌ | git-clone | Rails 전용 SuperClaude 스타일 |
| ⚪ | **lucianghinda/superpowers-ruby** | — | ❌ | git-clone | Ruby/Rails core skills |

### F.3 GraphQL

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| 🟡 | **apollographql/skills** | — | ❌ | git-clone | Apollo 공식 GraphQL skills |

### F.4 Python

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **rafaelkamimura/claude-tools** | — | ❌ | git-clone | FastAPI skills + 46 agents |

### F.5 Elixir / Phoenix

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **claude-elixir-phoenix** | 256 | ❌ | git-clone | 20 specialist agents |

### F.6 Supabase

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **supabase/agent-skills** | — | partial | git-clone | Supabase 공식 (DB 조작 로컬, 계정 별개) |
| ⚪ | **Nice-Wolf-Studio/claude-code-supabase-skills** | — | partial | git-clone | Supabase API 전반 |

### F.7 Java / 다국어 백엔드

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **giuseppe-trisciuoglio/developer-kit** | — | ❌ | marketplace | Java/TS/Python/PHP/AWS spec-driven |

### F.8 게임

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **godogen** | 2.8K | ❌ | git-clone | Godot 4 게임 프로젝트 생성 |
| ⚪ | **mcp-unity** | 1.6K | ❌ | mcp | Unity Editor MCP |

### F.9 기타

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **android-reverse-engineering-skill** | 1.5K | ❌ | git-clone | 안드로이드 리버스 엔지니어링 |
| ⚪ | **audio-plugin-dev-skills** | 52 | ❌ | git-clone | 오디오 플러그인 개발 |
| ⚪ | **videocut-skills** | 1.4K | ❌ | git-clone | 비디오 편집 에이전트 (중국어) |

---

## G. 팀 / 워크플로우 / 생산성

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **aj-geddes/claude-code-bmad-skills** | — | ❌ | git-clone | BMAD Method 9 전문 에이전트 SDLC |
| ⚪ | **PabloLION/bmad-plugin** | — | ❌ | marketplace | BMAD 30+ skills 플러그인화 |
| ⚪ | **claude-code-workflows** | 3.8K | ❌ | git-clone | 일상 워크플로우 |
| ⚪ | **Claude-Code-Development-Kit** | 1.3K | ❌ | git-clone | 입문/중급 워크플로우 |
| ⚪ | **claude-review-loop** | 643 | ❌ | git-clone | 자동 코드 리뷰 루프 |
| ⚪ | **claude-forge** | 651 | ❌ | git-clone | oh-my-zsh 스타일 (11 에이전트, 36 커맨드) |
| ⚪ | **harness** | 2.4K | ❌ | marketplace | 도메인별 에이전트 팀 설계 |
| ⚪ | **mhattingpete/claude-skills-marketplace** | — | ❌ | git-clone | Git 자동화, 테스팅, 코드 리뷰 |
| ⚪ | **levnikolaevich/claude-code-skills** | — | ❌ | marketplace | Full lifecycle + hex MCP |
| ⚪ | **Jeffallan/claude-skills** | — | ❌ | git-clone | DevOps + api-designer 등 다영역 |

---

## H. 글쓰기 / 콘텐츠

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **humanizer** | 14K | ❌ | git-clone | AI 글쓰기 흔적 제거 |
| ⚪ | **Humanizer-zh** | 6K | ❌ | git-clone | Humanizer 중국어판 |
| ⚪ | **ralph-wiggum-marketer** | 720 | ❌ | git-clone | AI 카피라이터 |
| ⚪ | **adversarial-spec** | 524 | ❌ | git-clone | 스펙 반복 정제 (멀티 LLM 토론) |
| ⚪ | **Oh-my-paper** | 402 | ❌ | git-clone | 자율 연구실 — 문헌조사→실험→논문 |

---

## I. Hooks / 모니터링

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **claude-code-hooks-mastery** | 3.5K | ❌ | hook | Hooks 마스터 코스/레퍼런스 |
| ⚪ | **claude-code-hooks-multi-agent-observability** | 1.4K | ❌ | hook | 에이전트 실시간 모니터링 |

---

## J. MCP 서버 / 도구

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **mcp_excalidraw** | 1.7K | ❌ | mcp | Excalidraw 캔버스 MCP |
| ⚪ | **pg-aiguide** | 1.7K | ❌ | mcp | PostgreSQL MCP (Timescale) |
| ⚪ | **claude-code-mcp (steipete)** | 1.2K | ❌ | mcp | Claude Code as MCP 서버 |

---

## K. CLAUDE.md 생성 / 프로젝트 분석

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **ClaudeForge** | 345 | ❌ | git-clone | CLAUDE.md 생성 + 유지보수 |
| ⚪ | **cavekit** | 363 | ❌ | git-clone | Blueprint → Code |

---

## L. 기타 도구 / 유틸리티

| Status | Name | Stars | Auth | Install | 설명 |
|:------:|------|:-----:|:----:|---------|------|
| ⚪ | **slavingia/skills** | 7.8K | ❌ | git-clone | Minimalist Entrepreneur 기반 |
| ⚪ | **claudian** | 7.7K | ❌ | marketplace | Obsidian + Claude Code |
| ⚪ | **claude-code-tips** | 7.6K | ❌ | git-clone | 45 tips + dx 플러그인 |
| ⚪ | **cc-switch** | 44K | ❌ | desktop | 크로스 플랫폼 올인원 어시스턴트 (Tauri) |
| ⚪ | **hello2cc** | 548 | ❌ | git-clone | 서드파티 모델 플러그인 |
| ⚪ | **agent-flow** | 662 | ❌ | git-clone | 에이전트 오케스트레이션 시각화 |
| ⚪ | **claude_code_agent_farm** | 781 | ❌ | git-clone | 20+ 에이전트 병렬 실행 |
| ⚪ | **cui** | 1.1K | ❌ | git-clone | Claude Code 웹 UI |
| ⚪ | **ccproxy** | 198 | ❌ | git-clone | 요청 훅 + 커스텀 라우팅 |
| ⚪ | **claude-equity-research** | 431 | partial | git-clone | 기관급 주식 리서치 |

---

## M. ⛔ Auth 필요로 제외

slaminar 카탈로그에서 자동 제외되는 도구들입니다.

| Name | Stars | Auth 사유 | 설명 |
|------|:-----:|----------|------|
| **claude-octopus** | 2.6K | 멀티 모델 API 키 필요 | 8개 모델 동시 리뷰 |
| **call-me** | 2.6K | 전화 API 필요 | Claude → 전화 |
| **nano-banana-2-skill** | 327 | Gemini API 필요 | AI 이미지 생성 |
| MongoDB 공식 Agent Skills | — | Atlas 로그인 | MongoDB 관련 |
| Apollo Router/Cloud 연동 | — | OAuth | 유료 서비스 |
| connect-apps | — | OAuth (500+ 서비스) | 다중 서비스 연결 |

---

## N. 메타 마켓플레이스 (레퍼런스용, 카탈로그 직접 등록 X)

이 저장소들은 "카탈로그의 카탈로그"로 참고합니다.

| Name | Stars | URL | 규모 |
|------|:-----:|-----|------|
| **awesome-claude-code** (hesreallyhim) | 38.5K | [link](https://github.com/hesreallyhim/awesome-claude-code) | 최대 커뮤니티 목록 |
| **awesome-claude-code-subagents** | 17.2K | [link](https://github.com/VoltAgent/awesome-claude-code-subagents) | 100+ 서브에이전트 |
| **awesome-claude-code-toolkit** | 1.2K | [link](https://github.com/rohitg00/awesome-claude-code-toolkit) | 135 agents + 35 skills + 42 commands |
| **awesome-claude-code-plugins** | 683 | [link](https://github.com/ccplugins/awesome-claude-code-plugins) | 커뮤니티 플러그인 |
| **awesome-claude-plugins** (quemsah) | 406 | [link](https://github.com/quemsah/awesome-claude-plugins) | 채택 메트릭 |
| **awesome-claude-plugins** (ComposioHQ) | — | [link](https://github.com/ComposioHQ/awesome-claude-plugins) | 232+ 큐레이션 + CCHub 앱 |
| **claude-code-plugins-plus-skills** | 1.9K | [link](https://github.com/jeremylongshore/claude-code-plugins-plus-skills) | 340 plugins + CCPI 패키지 매니저 |
| **buildwithclaude** | 2.7K | [link](https://github.com/davepoon/buildwithclaude) | 통합 허브 |
| **superpowers-marketplace** | 836 | [link](https://github.com/obra/superpowers-marketplace) | 큐레이션 마켓플레이스 |
| **daymade/claude-code-skills** | 829 | [link](https://github.com/daymade/claude-code-skills) | 프로 스킬 마켓플레이스 |
| **cc-marketplace** | 676 | [link](https://github.com/ananddtyagi/cc-marketplace) | 플러그인 마켓플레이스 |
| **claude-plugins-official** (Anthropic) | 16.8K | [link](https://github.com/anthropics/claude-plugins-official) | Anthropic 공식 디렉토리 |

---

## O. 집계

| 분류 | slaminar 내장 🟢 | 추가 후보 🟡 | 참고 ⚪ | 제외 ⛔ | 합계 |
|------|:--------------:|:----------:|:------:|:-----:|:----:|
| 범용 | 6 | 5 | 8 | — | 19 |
| 프론트엔드 | 2 | — | 3 | — | 5 |
| 대형 코드베이스 | 2 | — | 1 | — | 3 |
| 보안 | 1 | 1 | 4 | — | 6 |
| DevOps | — | 1 | 4 | — | 5 |
| 언어/프레임워크 | — | 3 | 10 | — | 13 |
| 팀/워크플로우 | — | — | 10 | — | 10 |
| 글쓰기/콘텐츠 | — | — | 5 | — | 5 |
| Hooks/모니터링 | — | — | 2 | — | 2 |
| MCP/도구 | — | — | 3 | — | 3 |
| 분석/생성 | — | — | 2 | — | 2 |
| 기타 | — | — | 10 | — | 10 |
| 제외 | — | — | — | 6 | 6 |
| **합계** | **12** | **10** | **62** | **6** | **90** |

---

_이 문서는 1차(2026-04-14) + 2차(2026-04-16) 조사를 통합한 최종본입니다. 이전 조사 기록은 `docs/claude-code-ecosystem.md`(1차)와 `docs/claude-code-ecosystem-2026-04.md`(2차)에 보존되어 있습니다._
