# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `plugin.json`에 `outputStyles` 연결 (`./output-styles/`).
- `hooks/hooks.json`에 schema + timeout + SessionStart `once: true` 적용.
- `marketplace.json`에 schema/version 메타 추가.
- 누락된 skill metadata 추가:
  - `skills/pipeline/skill.yaml`
  - `skills/qa/skill.yaml`
  - `skills/worker/skill.yaml`
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
- 시연/일반 작업 체감 속도 개선을 위해 기본 에이전트 모델 매핑 최적화:
  - `spring-architect`, `domain-expert`, `service-expert`, `api-expert`, `test-expert`, `gap-detector`, `pdca-iterator`, `dba-expert`를 `opus` → `sonnet`으로 조정
  - `security-expert`, `code-reviewer`는 품질이 중요한 경로로 `opus` 유지.
- PDCA 실행 경로 추가 최적화:
  - `spring-architect`의 import 컨텍스트를 경량화 (`spring-conventions`만 유지)
  - `team.phaseTeams.do` 멤버를 3→2로 축소 (`api-expert` 제거)
  - `team.phaseTeams.analyze` 우선순위를 `gap-detector + test-expert` 중심으로 재정렬 (SingleModule 기본 2인 기준 code-reviewer 호출 빈도 감소).
- Hook 핫패스 최적화:
  - `lib/context-store/snapshot.js`에 cross-process 디스크 캐시 추가 (`.demodev/cache/snapshot-static-v1.json`, 기본 TTL 30초)
  - `lib/spring/project-analyzer.js`의 base package 감지를 `*Application.java` 우선(fast path)으로 개선.
  - `scripts/unified-bash-pre.js`에서 task context 로드를 2회 → 1회로 축소.

### Fixed
- `npm run validate:plugin -- --verbose` 경고 4건 제거:
  - skill.yaml missing 3건
  - hooks path parse 경고 1건

## [1.0.1] - 2026-02-19

### Added
- Spring Boot 특화 스킬/에이전트/PDCA 워크플로우 구성.
- Jest 기반 unit/integration 테스트 세트.
