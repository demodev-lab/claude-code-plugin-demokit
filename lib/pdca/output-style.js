/**
 * PDCA Output Style 로드/선택
 * output-styles/ 디렉토리의 스타일 파일을 로드하고 레벨에 따라 선택
 */
const fs = require('fs');
const path = require('path');

const STYLE_DIR = path.join(__dirname, '..', '..', 'output-styles');

/**
 * YAML frontmatter 파싱 (간단 구현)
 * ---\nkey: value\n---\n본문
 */
function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return { metadata: {}, body: content || '' };
  }

  const trimmed = content.trim();
  if (!trimmed.startsWith('---')) {
    return { metadata: {}, body: content };
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { metadata: {}, body: content };
  }

  const frontmatter = trimmed.substring(3, endIndex).trim();
  const body = trimmed.substring(endIndex + 3).trim();

  const metadata = {};
  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();
    if (key) metadata[key] = value;
  }

  return { metadata, body };
}

/**
 * 스타일 파일 로드
 */
function loadStyle(styleName) {
  if (!styleName) return null;

  const filePath = path.join(STYLE_DIR, `${styleName}.md`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const { metadata, body } = parseFrontmatter(content);

  return {
    name: metadata.name || styleName,
    description: metadata.description || '',
    triggers: metadata.triggers || '',
    body,
  };
}

/**
 * 레벨 기반 스타일 선택
 */
function getStyleForLevel(level) {
  try {
    const { getOutputStyle } = require('./level');
    const styleName = getOutputStyle(level);
    return loadStyle(styleName);
  } catch {
    return null;
  }
}

/**
 * 사용 가능한 스타일 목록
 */
function listStyles() {
  if (!fs.existsSync(STYLE_DIR)) return [];

  const files = fs.readdirSync(STYLE_DIR).filter(f => f.endsWith('.md'));
  return files.map(f => {
    const content = fs.readFileSync(path.join(STYLE_DIR, f), 'utf-8');
    const { metadata } = parseFrontmatter(content);
    return {
      name: metadata.name || f.replace('.md', ''),
      description: metadata.description || '',
      triggers: metadata.triggers || '',
    };
  });
}

module.exports = { parseFrontmatter, loadStyle, getStyleForLevel, listStyles, STYLE_DIR };
