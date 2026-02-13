/**
 * Context Builder
 * 에이전트/스킬 프롬프트에 import된 컨텍스트를 주입
 */
const path = require('path');
const { config } = require('../core');
const importResolver = require('./import-resolver');

/**
 * 에이전트 MD에서 import 경로 추출
 */
function getAgentImports(agentId) {
  const pluginRoot = config.getPluginRoot();
  const agentMdPath = path.join(pluginRoot, 'agents', `${agentId}.md`);
  return importResolver.parseAgentImports(agentMdPath);
}

/**
 * 스킬의 imports 해석
 */
function getSkillContext(skillName, projectRoot) {
  if (!skillName) return null;

  try {
    const { skillLoader } = require('../core');
    const imports = skillLoader.getImports(skillName);
    if (!imports || imports.length === 0) return null;

    // 스킬 imports는 상대경로 (shared/xxx.md) → PLUGIN_ROOT/templates/ 기준으로 해석
    const pluginRoot = config.getPluginRoot();
    const fullPaths = imports.map(p => path.join(pluginRoot, 'templates', p));

    const variables = importResolver.getDefaultVariables(projectRoot);
    return importResolver.resolveImports(fullPaths, variables);
  } catch {
    return null;
  }
}

/**
 * 에이전트 프롬프트에 import 컨텍스트 주입
 */
function buildContextWithImports(agentId, basePrompt, projectRoot) {
  const imports = getAgentImports(agentId);
  if (!imports || imports.length === 0) return basePrompt;

  const variables = importResolver.getDefaultVariables(projectRoot);
  const importedContent = importResolver.resolveImports(imports, variables);

  if (!importedContent) return basePrompt;
  return mergeImportedContext(basePrompt, importedContent);
}

/**
 * 기존 프롬프트에 import 내용 합체
 */
function mergeImportedContext(basePrompt, importedContent) {
  if (!importedContent) return basePrompt;
  return `${basePrompt}\n\n## 참조 컨벤션\n\n${importedContent}`;
}

module.exports = {
  buildContextWithImports,
  getSkillContext,
  getAgentImports,
  mergeImportedContext,
};
