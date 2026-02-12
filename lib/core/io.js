/**
 * I/O 유틸리티 - 파일/디렉토리 읽기/쓰기 래퍼
 */
const fs = require('fs');
const path = require('path');

/**
 * 파일 읽기 (UTF-8)
 */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 파일 쓰기 (디렉토리 자동 생성)
 */
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * JSON 파일 읽기
 */
function readJson(filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  return JSON.parse(content);
}

/**
 * JSON 파일 쓰기
 */
function writeJson(filePath, data) {
  writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

/**
 * 디렉토리 존재 확인 및 생성
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 파일 존재 여부
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 디렉토리 내 파일 목록 (재귀)
 */
function listFiles(dirPath, pattern) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath, pattern));
    } else if (!pattern || entry.name.match(pattern)) {
      results.push(fullPath);
    }
  }
  return results;
}

module.exports = { readFile, writeFile, readJson, writeJson, ensureDir, fileExists, listFiles };
