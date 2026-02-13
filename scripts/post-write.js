/**
 * PostToolUse Hook (Write/Edit)
 * Java 파일 작성 후 관련 파일 생성 제안
 *
 * - Entity 생성 시 → Repository, Service, Controller, DTO, Exception 제안
 * - Controller 생성 시 → DTO 존재 여부 확인
 * - Service 생성 시 → Repository 존재 여부 확인
 */
const path = require('path');
const fs = require('fs');

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

  if (!filePath.endsWith('.java')) {
    console.log(JSON.stringify({}));
    return;
  }

  const { file: fileUtil } = require('../lib/core');

  const layerType = fileUtil.detectLayerType(filePath);
  const domainName = fileUtil.extractDomainName(filePath);

  if (!layerType || !domainName) {
    console.log(JSON.stringify({}));
    return;
  }

  const suggestions = [];

  // Entity 생성 시 관련 파일 제안
  if (layerType === 'entity') {
    const pascalName = capitalize(domainName);
    const basePath = getDomainBasePath(filePath, domainName);
    if (!basePath) {
      console.log(JSON.stringify({}));
      return; // 도메인 경로 탐지 실패 시 제안 스킵
    }
    const related = fileUtil.relatedFiles(pascalName, basePath);
    const missing = [];

    // relatedFiles 키 → 실제 스킬 커맨드 매핑
    const typeToSkill = {
      repository: 'repository',
      service: 'service',
      controller: 'controller',
      createRequest: 'dto',
      updateRequest: 'dto',
      response: 'dto',
    };

    const suggestedSkills = new Set();
    for (const [type, relPath] of Object.entries(related)) {
      if (type !== 'entity' && !fileExists(relPath)) {
        const skill = typeToSkill[type];
        if (skill && !suggestedSkills.has(skill)) {
          suggestedSkills.add(skill);
          missing.push(skill);
        }
      }
    }

    if (missing.length > 0) {
      suggestions.push(`[제안] ${pascalName} Entity 생성됨. 관련 파일 생성을 권장합니다:`);
      missing.forEach(skill => {
        suggestions.push(`  - /${skill} ${pascalName}`);
      });
      suggestions.push(`  또는 /crud ${pascalName} 으로 일괄 생성`);
    }
  }

  // Controller 생성 시 DTO 확인
  if (layerType === 'controller') {
    const dtoDir = filePath.replace(/controller[/\\][^/\\]+$/, 'dto');
    if (!fs.existsSync(dtoDir)) {
      suggestions.push(`[제안] DTO가 없습니다. /dto ${capitalize(domainName)} 으로 생성하세요.`);
    }
  }

  // Service 생성 시 Repository 확인
  if (layerType === 'service') {
    const repoDir = filePath.replace(/service[/\\][^/\\]+$/, 'repository');
    if (!fs.existsSync(repoDir)) {
      suggestions.push(`[제안] Repository가 없습니다. /repository ${capitalize(domainName)} 으로 생성하세요.`);
    }
  }

  if (suggestions.length > 0) {
    console.log(JSON.stringify({
      systemMessage: `[demokit]\n${suggestions.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

function getDomainBasePath(filePath, domainName) {
  if (!domainName) return null;
  const normalized = filePath.replace(/\\/g, '/');
  const domainIdx = normalized.indexOf(`/domain/${domainName.toLowerCase()}/`);
  if (domainIdx === -1) return null;
  // relatedFiles()가 domain/{name}을 추가하므로, 그 앞까지만 반환
  return normalized.substring(0, domainIdx);
}

function fileExists(relativePath) {
  try {
    return fs.existsSync(relativePath);
  } catch {
    return false;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

main().catch(err => {
  console.error(`[demokit] post-write 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
