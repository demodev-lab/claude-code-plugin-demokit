---
name: output-style-setup
description: |
  demokit output style 파일을 프로젝트 또는 사용자 전역 디렉토리에 설치한다.

  Triggers: output style setup, 스타일 설치, output-style-setup, 출력 스타일 설정
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - AskUserQuestion
---

# Output Style Setup

demokit output styles를 실제로 설치한다.

## Available Styles

- `demodev-monolith`
- `demodev-msa`
- `demodev-pdca-guide`

## 설치 절차

1. 사용자에게 설치 위치를 질문한다 (AskUserQuestion)
   - **Project level**: 현재 프로젝트에만 적용
   - **User level**: 모든 프로젝트에 적용

2. 선택에 따라 아래 명령을 실행한다.

### Project level

```bash
mkdir -p .claude/output-styles
cp "${CLAUDE_PLUGIN_ROOT}/output-styles/"*.md .claude/output-styles/
ls -1 .claude/output-styles
```

### User level

```bash
mkdir -p ~/.claude/output-styles
cp "${CLAUDE_PLUGIN_ROOT}/output-styles/"*.md ~/.claude/output-styles/
ls -1 ~/.claude/output-styles
```

3. 설치 완료 후 안내한다.
   - 설치된 파일 목록
   - 추천 스타일
     - SingleModule/Monolith: `demodev-monolith`
     - MSA: `demodev-msa`
     - PDCA 보고 중심: `demodev-pdca-guide`

4. 마지막으로 아래처럼 사용하도록 안내한다.
   - "이번 작업은 demodev-monolith 스타일로 보고해줘"
