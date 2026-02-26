/**
 * Unified PostToolUse Hook (Write/Edit)
 * 기존 post-write.js 로직 통합 + agent별 handler dispatch
 *
 * GitHub #9354 workaround: 단일 진입점에서 agent/skill별 handler 분기
 */
const path = require('path');

const AGENT_HANDLERS = {
  'qa-monitor': handleQaMonitorPost,
  'gap-detector': handleGapDetectorPost,
};

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let hookData = {};
  try {
    if (input && input.trim()) hookData = JSON.parse(input);
  } catch (err) {
    process.stderr.write(`[demokit] stdin 파싱 실패: ${err.message}\n`);
    console.log(JSON.stringify({}));
    return;
  }

  const filePath = hookData.tool_input?.file_path || hookData.tool_input?.filePath || '';
  const allHints = [];

  // 0. Observation logging + Mode 분류 (즉시 반환 — LLM 호출 금지)
  try {
    const { platform } = require('../lib/core');
    const projRoot = platform.findProjectRoot(process.cwd());
    if (projRoot && filePath) {
      const { sessionLog, mode } = require('../lib/memory');
      const classification = mode.classifyFile(filePath);
      sessionLog.appendObservation(projRoot, {
        type: 'write',
        tool: hookData.tool_name || 'Write',
        file: filePath,
        ...classification,
      });
    }
  } catch { /* observation 실패 시 무시 */ }

  // 1. 기존 post-write.js 로직 통합: Java 파일 작성 시 관련 파일 제안
  if (filePath.endsWith('.java')) {
    try {
      const fs = require('fs');
      const { file: fileUtil } = require('../lib/core');
      const layerType = fileUtil.detectLayerType(filePath);
      const domainName = fileUtil.extractDomainName(filePath);

      if (layerType && domainName) {
        const pascalName = capitalize(domainName);
        const basePath = getDomainBasePath(filePath, domainName);

        if (basePath) {
          const related = fileUtil.relatedFiles(pascalName, basePath);
          const typeToSkill = {
            repository: 'repository', service: 'service',
            controller: 'controller', createRequest: 'dto',
            updateRequest: 'dto', response: 'dto',
          };

          if (layerType === 'entity') {
            const suggestedSkills = new Set();
            for (const [type, relPath] of Object.entries(related)) {
              if (type === 'entity') continue;
              if (!fileExistsSafe(relPath)) {
                const skill = typeToSkill[type];
                if (skill && !suggestedSkills.has(skill)) suggestedSkills.add(skill);
              }
            }
            if (suggestedSkills.size > 0) {
              allHints.push(`[제안] ${pascalName} Entity 생성됨. 관련 파일 생성을 권장합니다:`);
              Array.from(suggestedSkills).forEach(skill => allHints.push(`  - /${skill} ${pascalName}`));
              allHints.push(`  또는 /crud ${pascalName} 으로 일괄 생성`);
            }
          }

          if (layerType === 'controller') {
            const hasDto = ['createRequest', 'updateRequest', 'response'].some(t => fileExistsSafe(related[t]));
            if (!hasDto) allHints.push(`[제안] DTO가 없습니다. /dto ${pascalName} 으로 생성하세요.`);
          }

          if (layerType === 'service') {
            if (!fileExistsSafe(related.repository)) {
              allHints.push(`[제안] Repository가 없습니다. /repository ${pascalName} 으로 생성하세요.`);
            }
          }
        }
      }
    } catch { /* ignore */ }
  }

  // 2. Agent dispatch
  try {
    const { context } = require(path.join(__dirname, '..', 'lib', 'task'));
    const activeAgent = context.getActiveAgent();

    if (activeAgent && AGENT_HANDLERS[activeAgent]) {
      const agentHints = AGENT_HANDLERS[activeAgent](hookData, filePath);
      if (agentHints && agentHints.length > 0) {
        allHints.push(...agentHints);
      }
    }
  } catch { /* task context 미로드 시 무시 */ }

  if (allHints.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit]\n${allHints.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

/**
 * QA Monitor agent: QA 보고서 감지 시 critical issue 알림
 */
function handleQaMonitorPost(hookData, filePath) {
  const hints = [];
  if (!filePath) return hints;

  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('qa-report') || normalized.includes('quality')) {
    hints.push('[QA Monitor] QA 보고서 작성 감지 - critical issue 여부를 확인하세요');
  }
  return hints;
}

/**
 * Gap Detector agent: analysis 문서 감지 시 match rate 알림
 */
function handleGapDetectorPost(hookData, filePath) {
  const hints = [];
  if (!filePath) return hints;

  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('analysis') || normalized.includes('gap')) {
    hints.push('[Gap Detector] 분석 문서 작성 감지 - Match Rate를 확인하세요');
  }
  return hints;
}

function getDomainBasePath(filePath, domainName) {
  if (!domainName) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const normalizedLower = normalized.toLowerCase();
  const domainIdx = normalizedLower.indexOf(`/domain/${domainName.toLowerCase()}/`);
  if (domainIdx === -1) return null;
  const markerIdx = normalizedLower.indexOf('/domain/');
  if (markerIdx === -1) return null;
  return normalized.substring(0, markerIdx);
}

function fileExistsSafe(relativePath) {
  try {
    const fs = require('fs');
    return fs.existsSync(path.normalize(relativePath));
  } catch { return false; }
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 테스트를 위한 export
module.exports = { main, handleQaMonitorPost, handleGapDetectorPost, AGENT_HANDLERS };

if (require.main === module) {
  main().catch(err => {
    console.error(`[demokit] unified-write-post 오류: ${err.message}`);
    console.log(JSON.stringify({}));
  });
}
