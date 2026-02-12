/**
 * PostToolUse Hook (Write/Edit)
 * Java 파일 작성 후 관련 파일 생성 제안
 *
 * - Entity 생성 시 → Repository, Service, Controller, DTO, Exception 제안
 * - Controller 생성 시 → DTO 존재 여부 확인
 * - Service 생성 시 → Repository 존재 여부 확인
 */
const path = require('path');

async function main() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  const hookData = JSON.parse(input);
  const filePath = hookData.tool_input?.file_path || hookData.tool_input?.filePath || '';

  if (!filePath.endsWith('.java')) {
    console.log(JSON.stringify({}));
    return;
  }

  const { file: fileUtil } = require('../lib/core');
  const fs = require('fs');

  const layerType = fileUtil.detectLayerType(filePath);
  const domainName = fileUtil.extractDomainName(filePath);

  if (!layerType || !domainName) {
    console.log(JSON.stringify({}));
    return;
  }

  const suggestions = [];

  // Entity 생성 시 관련 파일 제안
  if (layerType === 'entity') {
    const related = fileUtil.relatedFiles(domainName, getDomainBasePath(filePath, domainName));
    const missing = [];

    for (const [type, relPath] of Object.entries(related)) {
      if (type !== 'entity' && !fileExists(filePath, relPath)) {
        missing.push(type);
      }
    }

    if (missing.length > 0) {
      suggestions.push(`[제안] ${domainName} Entity 생성됨. 관련 파일 생성을 권장합니다:`);
      missing.forEach(type => {
        suggestions.push(`  - /$ {type} ${capitalize(domainName)}`);
      });
      suggestions.push(`  또는 /crud ${capitalize(domainName)} 으로 일괄 생성`);
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
      systemMessage: `[demodev-be]\n${suggestions.join('\n')}`,
    }));
  } else {
    console.log(JSON.stringify({}));
  }
}

function getDomainBasePath(filePath, domainName) {
  const normalized = filePath.replace(/\\/g, '/');
  const domainIdx = normalized.indexOf(`/domain/${domainName.toLowerCase()}/`);
  if (domainIdx === -1) return null;
  return normalized.substring(0, domainIdx + `/domain/${domainName.toLowerCase()}`.length);
}

function fileExists(refPath, relativePath) {
  try {
    const fs = require('fs');
    return fs.existsSync(relativePath);
  } catch {
    return false;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

main().catch(err => {
  console.error(`[demodev-be] post-write 오류: ${err.message}`);
  console.log(JSON.stringify({}));
});
