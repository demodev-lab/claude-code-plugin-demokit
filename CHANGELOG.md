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

### Fixed
- `npm run validate:plugin -- --verbose` 경고 4건 제거:
  - skill.yaml missing 3건
  - hooks path parse 경고 1건

## [1.0.1] - 2026-02-19

### Added
- Spring Boot 특화 스킬/에이전트/PDCA 워크플로우 구성.
- Jest 기반 unit/integration 테스트 세트.
