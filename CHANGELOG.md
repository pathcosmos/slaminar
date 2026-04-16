# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-04-16

### Added — Initial Release

**Core Pipeline (7-phase):**
- `slaminar init` — scan → analyze → recommend → plan → generate → place → verify
- `slaminar scan` / `slaminar analyze` / `slaminar recommend` — 개별 단계 실행
- `slaminar update` — 증분 업데이트 (변경 섹션만)
- `slaminar status` / `slaminar check` — 헬스 체크 및 CI 검증
- `slaminar uninstall` / `slaminar remove` — 롤백 및 개별 도구 제거
- `--dry-run` / `--verbose` / `--no-ai` 플래그

**Project Analysis:**
- 다국어 지원 (TypeScript/JS, Python, Rust, Go, Java/Kotlin/Scala, Elixir)
- 패턴 감지 (CLI, SPA, API, fullstack, library, monorepo)
- 성숙도 판정 (greenfield / early / growing / mature)
- 컨벤션 감지 (naming, test framework, linter, commit style, doc language)

**Tool Recommendation:**
- 14개 Claude Code 생태계 도구 카탈로그
- 다차원 스코어링 (태그, 성숙도, 범용성)
- 충돌/시너지/중복 감지 (4개 규칙)
- 성숙도별 도구 수 제한 (2~7개)
- 인증 필요 도구 자동 제외

**File Generation & Placement:**
- CLAUDE.md 생성 (소유권 마커로 사용자 콘텐츠 보존)
- Claude Code 플러그인 생성 (plugin.json + skills/dev.md)
- 난독 파일명 백업 (`.slaminar/.bk/{hex6}_{timestamp}.dat`)
- 마커 기반 섹션 머지 (기존 CLAUDE.md 안전 업데이트)

**AI Enhancement (optional):**
- Cloudflare Workers AI provider (native fetch, 무료 10K Neurons/day)
  - Llama 3.3 70B, Mistral Small 3.1, Gemma 3, Qwen 2.5 Coder 지원
- Anthropic Claude API provider (`@anthropic-ai/sdk` 선택적 peer dep)
- 자동 폴백 — AI 실패 시 로컬 규칙 기반

**Unified Auth UX:**
- `slaminar login` — 인터랙티브 위자드 (프로바이더 → 토큰 → 모델 → 검증)
- `slaminar whoami` / `slaminar logout` — 상태 확인 및 자격 증명 제거
- `slaminar auth status` / `auth test` / `auth switch` — 상세 관리
- `/user` + `/memberships` 자동 감지 — 최소 입력
- `~/.config/slaminar/auth.json` (0600 권한, XDG 표준)

**Team Play:**
- 팀 config (`.slaminar/config.json`, 커밋) + 개인 config (`config.local.json`, gitignore) 분리
- 마크다운 보고서 (`.slaminar/reports/*.md`) — PR 리뷰 근거
- 환경변수 우선순위 지원 (CI 호환)

**Verification:**
- CLAUDE.md 유효성 검증 (명령어 존재, 마커 매칭, 구조)
- plugin.json 스키마 검증
- 9개 체크 항목, 종료 코드 0/1/2 (CI용)

**Safety & Error Handling:**
- 모든 CLI 명령어에 try/catch — 스택 트레이스 대신 친화 메시지
- init 실패 시 세션 백업 자동 롤백
- manifest finally 블록 — 부분 실패에도 백업 추적
- JSON 파싱 방어 (손상된 config 파일 graceful 처리)
- 모든 쉘 실행에 `execFileSync` — command injection 방지
- Git 명령어 10초 타임아웃

**Stats:**
- 42 source modules, 37 test files, 179 tests passing
- 13 CLI commands
- TypeScript ESM, Node.js ≥ 18

[0.1.0]: https://github.com/pathcosmos/slaminar/releases/tag/v0.1.0

## [0.2.0] — 2026-04-16

### Added — Dynamic Catalog System

**Dynamic Catalog:**
- Online catalog source (`catalog/catalog.json`, 24 tools) fetched from GitHub raw
- Local cache (`~/.config/slaminar/catalog-cache.json`, 24h TTL)
- Fallback chain: cache → remote → stale cache → bundled
- ETag-based conditional requests (bandwidth savings)
- Catalog diff on update (added/removed/deprecated/updated)
- Catalog rollback support

**New CLI Commands:**
- `slaminar catalog update` — fetch latest catalog + show diff
- `slaminar catalog list` — table view of all tools
- `slaminar catalog search <q>` — search by name/tags/description
- `slaminar catalog check` — detect deprecated tools
- `slaminar catalog info <name>` — tool details
- `slaminar catalog status` — cache status
- `slaminar catalog rollback` — restore previous version

**Catalog Expansion (14 → 24 tools):**
- wshobson/agents (multi-agent orchestration)
- claude-code-lsps (20+ language LSPs)
- terraform-skill (IaC/DevOps)
- claude-code-templates (project bootstrap)
- laravel/agent-skills (PHP/Laravel)
- claude-on-rails (Ruby/Rails)
- apollographql/skills (GraphQL)
- spec-kit (GitHub official, spec-driven)
- claude-code-subagents (100+ subagents)
- awesome-claude-skills-security (pentest)

**CatalogTool Extensions:**
- `deprecated`, `deprecatedReason`, `lastVerified`, `replacedBy` optional fields
- `RemoteCatalog`, `CatalogSuggestion`, `CatalogCacheEntry`, `ResolvedCatalog` types
- Catalog suggestions section (evaluating tools)
- Catalog relations section (conflict/synergy rules moved from hardcode)

### Changed

- `recommend()` is now async (breaking for programmatic users)
- `update()` is now async
- `conflict-detector` accepts external relations parameter
- Bundled catalog serves as ultimate offline fallback only

### Stats

- 47 source modules, 41 test files, 203 tests passing
- 20 CLI commands (7 catalog commands added)
- 24 tools in online catalog, 14 in bundled fallback

[0.2.0]: https://github.com/pathcosmos/slaminar/compare/v0.1.0...v0.2.0

## [0.3.0] — 2026-04-16

### Added — Custom Catalog URL + English Docs

**Custom Catalog URL (`--catalog <url>`):**
- `resolveCatalog()` now accepts a `catalogUrl` option for custom/private catalog sources
- `--catalog <url>` flag added to `init`, `recommend`, and `catalog update` CLI commands
- `recommend()` and `init()` pipeline functions thread `catalogUrl` through the full chain
- Enables enterprise and private catalog hosting without forking the project

**English README:**
- `README.md` is now the primary English documentation
- Korean documentation moved to `README.ko.md`
- Cross-references between both language versions

### Fixed

- CLI version string corrected from `0.1.0` to match `package.json` (`0.2.0` → now `0.3.0`)
- Catalog resolver tests stabilized with `.invalid` TLD URLs for deterministic remote-failure scenarios (previously flaky when network was available)

### Stats

- 47 source modules, 41 test files, 204 tests passing
- 20 CLI commands
- 24 tools in online catalog, 14 in bundled fallback

[0.3.0]: https://github.com/pathcosmos/slaminar/compare/v0.2.0...v0.3.0
