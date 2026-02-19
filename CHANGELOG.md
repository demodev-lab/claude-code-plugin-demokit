# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (none)

## [1.0.2] - 2026-02-19

### Added
- `plugin.json`에 `outputStyles` 연결 (`./output-styles/`).
- `hooks/hooks.json`에 schema + timeout + `SessionStart.once` 적용.
- `marketplace.json`에 schema/version 메타 추가.
- 누락된 skill metadata 추가/정비:
  - `skills/pipeline/skill.yaml`
  - `skills/qa/skill.yaml`
  - `skills/worker/skill.yaml`
  - `skills/plan-plus/skill.yaml` 보완
- 운영 문서 추가:
  - `CUSTOMIZATION-GUIDE.md`
  - `commands/demokit.md`
  - `commands/output-style-setup.md`
- 시스템 문서 레이어 확장:
  - `demokit-system/scenarios/*`
  - `demokit-system/triggers/trigger-matrix.md`
  - `demokit-system/testing/test-checklist.md`

### Changed
- `lib/core/plugin-validator.js`가 `hooks/` 참조도 인식/검증하도록 개선.
- PDCA 성능 최적화를 위한 기본 에이전트 라우팅 재조정:
  - `spring-architect`는 `opus` 유지
  - `domain/service/api/test/gap/iterator/dba` 계열을 `sonnet` 중심으로 조정
  - `security-expert`, `code-reviewer`는 `opus` 유지
- PDCA 팀 경로 최적화:
  - `team.phaseTeams.do` 멤버 3→2 축소 (`api-expert` 제거)
  - `team.phaseTeams.analyze`를 `gap-detector + test-expert` 중심으로 재정렬
- Hook 핫패스 최적화:
  - `lib/context-store/snapshot.js`에 cross-process 디스크 캐시 추가 (`.demodev/cache/snapshot-static-v1.json`, 기본 TTL 30초)
  - `lib/spring/project-analyzer.js`의 base package 감지를 `*Application.java` 우선(fast path)으로 개선
  - `scripts/unified-bash-pre.js`에서 task context 로드를 2회 → 1회로 축소
- README/운영 가이드 문서 정리 및 최신 명령/팀 모드 가이드 반영.

### Fixed
- `npm run validate:plugin -- --verbose` 경고 4건 제거:
  - skill.yaml missing 3건
  - hooks path parse 경고 1건
- Plan-plus 라우팅/메타데이터 누락 이슈 수정.
- 권한 검사 glob escape edge case 수정.

## [1.0.1] - 2026-02-18

### Added
- Spring Boot 특화 스킬/에이전트/PDCA 워크플로우 구성.
- Jest 기반 unit/integration 테스트 세트.
