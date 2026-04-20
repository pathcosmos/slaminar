# Claude Code Ecosystem — Plugins, Skills, Tools

> Researched: 2026-04-14
> Purpose: slaminar 설계 참고 + 프로젝트 분석 시 추천 후보 풀
>
> **Note (v0.9.6, 2026-04-20):** 조사 당시의 역사적 스냅샷입니다. 현재 카탈로그 상태는 `catalog/catalog.json`과 [CHANGELOG v0.9.6](../CHANGELOG.md#096--2026-04-20) 참고. v0.9.6에서 owner 필드 교정 및 일부 엔트리 재분류.

---

## Official

| Name | Stars | URL | Description |
|------|-------|-----|-------------|
| claude-plugins-official | 16.8K | https://github.com/anthropics/claude-plugins-official | Anthropic 공식 플러그인 디렉토리 |
| life-sciences | 307 | https://github.com/anthropics/life-sciences | Life Sciences 마켓플레이스 |

## Awesome Lists

| Name | Stars | URL | Description |
|------|-------|-----|-------------|
| awesome-claude-code | 38.5K | https://github.com/hesreallyhim/awesome-claude-code | 최대 커뮤니티 목록 (skills, hooks, commands, plugins) |
| awesome-claude-code-subagents | 17.2K | https://github.com/VoltAgent/awesome-claude-code-subagents | 100+ 서브에이전트 |
| awesome-claude-code-toolkit | 1.2K | https://github.com/rohitg00/awesome-claude-code-toolkit | 135 에이전트, 35 스킬, 176+ 플러그인 |
| awesome-claude-code-plugins | 683 | https://github.com/ccplugins/awesome-claude-code-plugins | 커뮤니티 플러그인 목록 |
| awesome-claude-plugins | 406 | https://github.com/quemsah/awesome-claude-plugins | 플러그인 채택 메트릭 |
| awesome-claude-agents | 305 | https://github.com/rahulvrane/awesome-claude-agents | 에이전트 컬렉션 |
| awesome-claude-code-setup | 263 | https://github.com/cassler/awesome-claude-code-setup | Bash 스크립트 + 슬래시 커맨드 |

## Top Plugins & Skills (Stars 순)

| Name | Stars | URL | Category | Auth Required | Description |
|------|-------|-----|----------|---------------|-------------|
| everything-claude-code | 154K | https://github.com/affaan-m/everything-claude-code | plugin | NO | 성능 최적화 — skills, instincts, memory, security |
| gstack | 71K | https://github.com/garrytan/gstack | plugin | NO | Garry Tan의 23개 도구 셋업 |
| claude-mem | 53K | https://github.com/thedotmack/claude-mem | plugin | NO | 세션 캡처 + AI 압축 + 컨텍스트 주입 |
| get-shit-done | 52K | https://github.com/gsd-build/get-shit-done | plugin | NO | 메타 프롬프팅, 스펙 기반 개발 |
| cc-switch | 44K | https://github.com/farion1231/cc-switch | tool | NO | 크로스 플랫폼 올인원 어시스턴트 |
| claude-code-best-practice | 42K | https://github.com/shanraisshan/claude-code-best-practice | guide | NO | Best practices |
| wshobson/agents | 34K | https://github.com/wshobson/agents | agent | NO | 멀티 에이전트 오케스트레이션 |
| caveman | 26K | https://github.com/JuliusBrussee/caveman | skill | NO | 토큰 65% 절약 |
| graphify | 25K | https://github.com/safishamsi/graphify | skill | NO | 코드/문서 → 지식 그래프 |
| impeccable | 19K | https://github.com/pbakaus/impeccable | skill | NO | AI용 디자인 언어 |
| claude-hud | 19K | https://github.com/jarrodwatts/claude-hud | plugin | NO | 실시간 HUD |
| planning-with-files | 19K | https://github.com/OthmanAdi/planning-with-files | skill | NO | Manus 스타일 마크다운 계획 |
| compound-engineering-plugin | 14K | https://github.com/EveryInc/compound-engineering-plugin | plugin | NO | Compound Engineering |
| humanizer | 14K | https://github.com/blader/humanizer | skill | NO | AI 글쓰기 흔적 제거 |
| claude-skills (alirezarezvani) | 11K | https://github.com/alirezarezvani/claude-skills | skill | NO | 232+ skills |
| slavingia/skills | 7.8K | https://github.com/slavingia/skills | skill | NO | Minimalist Entrepreneur 기반 |
| claudian | 7.7K | https://github.com/YishenTu/claudian | plugin | NO | Obsidian + Claude Code |
| claude-code-tips | 7.6K | https://github.com/ykdojo/claude-code-tips | skill | NO | 45 tips + dx 플러그인 |
| Humanizer-zh | 6K | https://github.com/op7418/Humanizer-zh | skill | NO | Humanizer 중국어판 |
| skills (trailofbits) | 4.5K | https://github.com/trailofbits/skills | skill | NO | 보안 연구, 취약점 탐지 |
| Continuous-Claude-v3 | 3.7K | https://github.com/parcadei/Continuous-Claude-v3 | hook | NO | 컨텍스트 관리 (ledger, handoff) |
| claude-code-hooks-mastery | 3.5K | https://github.com/disler/claude-code-hooks-mastery | hook | NO | Hooks 마스터 코스 |
| codebase-to-course | 3.4K | https://github.com/zarazhangrui/codebase-to-course | skill | NO | 코드베이스 → HTML 코스 |
| arscontexta | 3.1K | https://github.com/agenticnotetaking/arscontexta | plugin | NO | 대화 → 지식 시스템 |
| pinme | 3.2K | https://github.com/glitternetwork/pinme | skill | MAYBE | 프론트엔드 원커맨드 배포 |
| godogen | 2.8K | https://github.com/htdt/godogen | skill | NO | Godot 4 게임 프로젝트 생성 |
| claude-octopus | 2.6K | https://github.com/nyldn/claude-octopus | plugin | YES (multi-model API keys) | 8개 모델 동시 리뷰 |
| call-me | 2.6K | https://github.com/ZeframLou/call-me | plugin | YES (phone API) | Claude → 전화 |
| harness | 2.4K | https://github.com/revfactory/harness | skill | NO | 도메인별 에이전트 팀 설계 |
| playwright-skill | 2.4K | https://github.com/lackeyjb/playwright-skill | skill | NO | Playwright 브라우저 자동화 |
| fireworks-tech-graph | 2.1K | https://github.com/yizhiyanhua-ai/fireworks-tech-graph | skill | NO | SVG+PNG 기술 다이어그램 |
| pro-workflow | 1.9K | https://github.com/rohitg00/pro-workflow | plugin | NO | 50+ 세션 메모리, 병렬 worktree |
| mcp_excalidraw | 1.7K | https://github.com/yctimlin/mcp_excalidraw | mcp | NO | Excalidraw MCP 서버 |
| nothing-design-skill | 1.7K | https://github.com/dominikmartn/nothing-design-skill | skill | NO | Nothing 디자인 언어 UI |
| pg-aiguide | 1.7K | https://github.com/timescale/pg-aiguide | mcp | NO | PostgreSQL MCP (Timescale) |
| mcp-unity | 1.6K | https://github.com/CoderGamester/mcp-unity | mcp | NO | Unity Editor MCP |
| android-reverse-engineering-skill | 1.5K | https://github.com/SimoneAvogadro/android-reverse-engineering-skill | skill | NO | 안드로이드 리버스 엔지니어링 |
| videocut-skills | 1.4K | https://github.com/Ceeon/videocut-skills | skill | NO | 비디오 편집 에이전트 (중국어) |
| claude-code-hooks-multi-agent-observability | 1.4K | https://github.com/disler/claude-code-hooks-multi-agent-observability | hook | NO | 에이전트 실시간 모니터링 |

## Marketplaces

| Name | Stars | URL | Description |
|------|-------|-----|-------------|
| buildwithclaude | 2.7K | https://github.com/davepoon/buildwithclaude | Skills, Agents, Commands, Hooks, Plugins 통합 허브 |
| claude-code-plugins-plus-skills | 1.9K | https://github.com/jeremylongshore/claude-code-plugins-plus-skills | 340 플러그인 + CCPI 패키지 매니저 |
| superpowers-marketplace | 836 | https://github.com/obra/superpowers-marketplace | 큐레이션 마켓플레이스 |
| daymade/claude-code-skills | 829 | https://github.com/daymade/claude-code-skills | 프로 스킬 마켓플레이스 |
| cc-marketplace | 676 | https://github.com/ananddtyagi/cc-marketplace | 플러그인 마켓플레이스 |
| claude-forge | 651 | https://github.com/sangrokjung/claude-forge | oh-my-zsh 스타일 (11 에이전트, 36 커맨드) |
| agent-skills (hashicorp) | 537 | https://github.com/hashicorp/agent-skills | HashiCorp 공식 스킬 |
| skills-curated (trailofbits) | 352 | https://github.com/trailofbits/skills-curated | Trail of Bits 큐레이션 |

## CLAUDE.md Generators

| Name | Stars | URL | Description |
|------|-------|-----|-------------|
| ClaudeForge | 345 | https://github.com/alirezarezvani/ClaudeForge | CLAUDE.md 생성 + 유지보수 |
| cartographer | 542 | https://github.com/kingbootoshi/cartographer | 코드베이스 매핑 + 문서화 |

## Domain-Specific

| Name | Stars | URL | Domain | Auth Required |
|------|-------|-----|--------|---------------|
| ralph-wiggum-marketer | 720 | https://github.com/muratcankoylan/ralph-wiggum-marketer | Marketing | NO |
| adversarial-spec | 524 | https://github.com/zscole/adversarial-spec | Spec Writing | NO |
| claude-equity-research | 431 | https://github.com/quant-sentiment-ai/claude-equity-research | Finance | MAYBE |
| Oh-my-paper | 402 | https://github.com/LigphiDonk/Oh-my--paper | Research | NO |
| homunculus | 358 | https://github.com/humanplane/homunculus | Self-evolution | NO |
| ClaudeForge (alirezarezvani) | 345 | https://github.com/alirezarezvani/ClaudeForge | CLAUDE.md gen | NO |
| cavekit | 363 | https://github.com/JuliusBrussee/cavekit | Blueprint → Code | NO |
| nano-banana-2-skill | 327 | https://github.com/kingbootoshi/nano-banana-2-skill | Image Gen | YES (Gemini API) |
| claude-elixir-phoenix | 256 | https://github.com/oliver-kriska/claude-elixir-phoenix | Elixir/Phoenix | NO |
| audio-plugin-dev-skills | 52 | https://github.com/iPlug3/audio-plugin-dev-skills | Audio | NO |

## Workflows & Dev Kits

| Name | Stars | URL | Description |
|------|-------|-----|-------------|
| claude-code-workflows | 3.8K | https://github.com/OneRedOak/claude-code-workflows | 일상 워크플로우 |
| Claude-Code-Development-Kit | 1.3K | https://github.com/peterkrueck/Claude-Code-Development-Kit | 입문/중급 워크플로우 |
| claude-review-loop | 643 | https://github.com/hamelsmu/claude-review-loop | 자동 코드 리뷰 루프 |
| hello2cc | 548 | https://github.com/hellowind777/hello2cc | 서드파티 모델 플러그인 |

## Tools

| Name | Stars | URL | Description |
|------|-------|-----|-------------|
| claude-code-mcp (steipete) | 1.2K | https://github.com/steipete/claude-code-mcp | Claude Code as MCP 서버 |
| agent-flow | 662 | https://github.com/patoles/agent-flow | 에이전트 오케스트레이션 시각화 |
| claude_code_agent_farm | 781 | https://github.com/Dicklesworthstone/claude_code_agent_farm | 20+ 에이전트 병렬 실행 |
| cui | 1.1K | https://github.com/wbopan/cui | Claude Code 웹 UI |
| ccproxy | 198 | https://github.com/starbaser/ccproxy | 요청 훅 + 커스텀 라우팅 |
