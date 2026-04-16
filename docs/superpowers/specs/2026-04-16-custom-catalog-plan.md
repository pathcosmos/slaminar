# Multi-source Custom Catalog — 설계 계획

> Date: 2026-04-16
> Status: **v0.3.0 MVP 배포됨** (`catalogUrl`, `catalogMode`, `catalog config` CLI, `mergeCatalogs` 구현완료); 전체 multi-source 아키텍처는 향후 계획

## 개요

사용자/팀이 각자의 카탈로그를 로컬 파일 또는 온라인 URL 형태로 참조하여, 공식 카탈로그와 병합(extend) 또는 대체(replace)하는 커스텀 카탈로그 시스템.

---

## Multi-source 아키텍처

### 소스 모델

```typescript
interface CatalogSource {
  id: string;                  // "company", "personal" 등
  type: 'official' | 'url' | 'file' | 'github';
  uri: string;                 // URL, 파일 경로, github:org/repo/path
  priority: number;            // 높을수록 우선 (공식: 0, 사용자: 100, 프로젝트: 200, CLI: 999)
  mode: 'extend' | 'replace';
  enabled: boolean;
  trust: 'trusted' | 'untrusted' | 'verified';
  addedAt: string;
}
```

### 우선순위 레이어

```
번들 (priority: -1)     ← ultimate fallback
공식 원격 (priority: 0)  ← 기본 소스
사용자 전역 (~/.config/slaminar/, priority: 100+)
프로젝트 팀 (.slaminar/config.json, priority: 200+)
CLI 플래그 (--catalog, priority: 999)
```

### 병합 규칙

- **extend 모드**: 상위 priority 도구가 하위에 추가. 동일 이름 → 상위 승리
- **replace 모드**: 공식 카탈로그 무시, 이 소스만 사용
- **relations**: 모든 소스에서 수집하여 합산
- **suggestions**: 공식 카탈로그에서만 취급

---

## 소스 유형별 처리

| 유형 | URI 예시 | 로딩 방식 |
|------|---------|----------|
| file | `/path/to/catalog.json` | `readFileSync` + 검증 |
| url | `https://company.com/catalog.json` | `fetch` + 캐시 + ETag |
| github | `github:org/repo/path.json` | URL로 변환 후 fetch |
| npm (미래) | `npm:@company/slaminar-catalog` | node_modules 참조 |

---

## 설정 저장

### 사용자 전역

`~/.config/slaminar/config.json`:
```json
{
  "catalogSources": [
    { "id": "my-tools", "type": "file", "uri": "/home/me/catalog.json", "priority": 100, "mode": "extend", "enabled": true, "trust": "trusted" }
  ]
}
```

### 프로젝트별 (팀 공유)

`.slaminar/config.json` (TeamConfig 확장):
```json
{
  "catalogSources": [
    { "id": "company", "type": "url", "uri": "https://company.com/catalog.json", "priority": 200, "mode": "extend", "enabled": true, "trust": "trusted" }
  ]
}
```

### 환경변수

```bash
SLAMINAR_CATALOG_SOURCES=extend:https://company.com/catalog.json,extend:/path/to/local.json
```

### CLI 플래그

```bash
slaminar recommend --catalog /path/to/catalog.json
slaminar init --catalog https://company.com/tools.json
```

---

## CLI 명령어

```bash
slaminar catalog source add <uri> [--mode extend|replace] [--priority N] [--scope user|project]
slaminar catalog source list
slaminar catalog source remove <id-or-uri>
slaminar catalog source enable <id>
slaminar catalog source disable <id>
slaminar catalog source test <id-or-uri>  # 접근성/스키마 검증
```

---

## 보안

| 레벨 | 설명 | installCommands 실행 |
|------|------|---------------------|
| trusted | 공식 + 사용자 명시 신뢰 | 바로 실행 |
| untrusted (기본) | 새로 추가된 외부 소스 | 확인 프롬프트 필요 |
| verified (미래) | 서명 검증 통과 | 바로 실행 |

추가 보호:
- HTTPS 강제 (URL 소스)
- `rm`, `sudo`, `curl | bash` 등 위험 명령 경고
- world-writable 로컬 파일 경고

---

## 팀 사용 시나리오

### 회사 카탈로그

```bash
slaminar catalog source add https://company.com/catalog.json --scope project
# → .slaminar/config.json에 저장, git commit
# → 팀원이 clone 후 slaminar catalog update → 회사 도구 자동 추천
```

### 개인 도구

```bash
slaminar catalog source add ~/my-tools/catalog.json --scope user
# → ~/.config/slaminar/config.json에 저장, git에 안 들어감
```

### 보안팀 강제

```bash
slaminar catalog source add https://security-team.com/approved.json --mode replace --scope project
# → replace 모드: 공식 카탈로그 무시, 승인된 도구만 추천
```

---

## 구현 순서

| Phase | 내용 | 예상 |
|-------|------|------|
| 1 | CatalogSource 타입 + UserConfig + 소스 로더 | 2-3일 |
| 2 | resolveCatalog 멀티소스 병합 + recommender 연결 | 1일 |
| 3 | CLI source 서브커맨드 + --catalog 플래그 | 2일 |
| 4 | 보안 (trust 레벨, HTTPS 강제, 위험 명령 탐지) | 1일 |

**총 예상: 6-7일**

---

## 현재 코드와의 통합 포인트

| 모듈 | 변경 |
|------|------|
| `src/types/index.ts` | `CatalogSource`, `UserConfig` 타입 추가 |
| `src/recommender/catalog-resolver.ts` | 단일 소스 → 멀티 소스 병합 |
| `src/recommender/catalog-cache.ts` | 소스별 캐시 (`~/.config/slaminar/cache/<id>.json`) |
| `src/team/config.ts` | `TeamConfig.catalogSources` 필드 추가 |
| `src/cli.ts` | `catalog source` 서브커맨드 + `--catalog` 글로벌 플래그 |

---

## 커스텀 카탈로그 최소 형식

사용자가 만들 카탈로그 파일 (간소화 허용):

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
      "installCommands": ["git clone https://internal.git/tool.git ~/.claude/skills/tool"],
      "prerequisites": [],
      "tags": ["code-review", "internal"],
      "maturityFit": ["growing", "mature"]
    }
  ]
}
```

`version`, `suggestions`, `relations`는 선택 — 없으면 기본값 사용.
