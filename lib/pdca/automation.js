/**
 * PDCA 자동화
 * Match Rate 계산 및 자동 반복 개선 로직
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_WEIGHTS = {
  apiEndpoints: 30,
  dbSchema: 25,
  dtoFields: 15,
  errorHandling: 15,
  businessRules: 15,
};

/**
 * 설계 문서와 구현 코드 간 Match Rate 산출
 * @param {Object} designSpec - 설계 스펙 (파싱된 design.md)
 * @param {Object} implementation - 구현 분석 결과
 * @param {Object} weights - 가중치 (기본값: DEFAULT_WEIGHTS)
 * @returns {Object} { totalRate, details }
 */
function calculateMatchRate(designSpec, implementation, weights = DEFAULT_WEIGHTS) {
  const details = {};

  // API 엔드포인트 매칭
  details.apiEndpoints = matchApiEndpoints(
    designSpec.apis || [],
    implementation.apis || []
  );

  // DB 스키마 매칭
  details.dbSchema = matchDbSchema(
    designSpec.tables || [],
    implementation.entities || []
  );

  // DTO 필드 매칭
  details.dtoFields = matchDtoFields(
    designSpec.dtos || [],
    implementation.dtos || []
  );

  // 에러 처리 매칭
  details.errorHandling = matchErrorHandling(
    designSpec.errors || [],
    implementation.exceptions || []
  );

  // 비즈니스 규칙 매칭
  details.businessRules = matchBusinessRules(
    designSpec.rules || [],
    implementation.rules || []
  );

  // 가중 평균 계산
  let totalRate = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const rate = details[key]?.rate || 0;
    totalRate += rate * weight;
    totalWeight += weight;
  }

  totalRate = totalWeight > 0 ? Math.round(totalRate / totalWeight) : 0;

  return { totalRate, details, weights };
}

function matchApiEndpoints(designed, implemented) {
  if (designed.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = designed.filter(api =>
    implemented.some(impl =>
      impl.method === api.method && impl.path === api.path
    )
  ).length;
  return { rate: Math.round((matched / designed.length) * 100), matched, total: designed.length };
}

function matchDbSchema(designed, implemented) {
  if (designed.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = designed.filter(table =>
    implemented.some(entity => entity.name.toLowerCase() === table.name.toLowerCase())
  ).length;
  return { rate: Math.round((matched / designed.length) * 100), matched, total: designed.length };
}

function matchDtoFields(designed, implemented) {
  if (designed.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = designed.filter(dto =>
    implemented.some(impl => impl.name === dto.name)
  ).length;
  return { rate: Math.round((matched / designed.length) * 100), matched, total: designed.length };
}

function matchErrorHandling(designed, implemented) {
  if (designed.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = designed.filter(err =>
    implemented.some(impl => impl.status === err.status || impl.name === err.name)
  ).length;
  return { rate: Math.round((matched / designed.length) * 100), matched, total: designed.length };
}

function matchBusinessRules(designed, implemented) {
  if (designed.length === 0) return { rate: 100, matched: 0, total: 0 };
  const matched = Math.min(implemented.length, designed.length);
  return { rate: Math.round((matched / designed.length) * 100), matched, total: designed.length };
}

/**
 * Match Rate가 임계값 미만인지 확인
 */
function needsIteration(matchRate, threshold = 90) {
  return matchRate.totalRate < threshold;
}

/**
 * Gap 목록 생성 (설계 대비 누락된 항목)
 */
function identifyGaps(matchRate) {
  const gaps = [];
  for (const [category, detail] of Object.entries(matchRate.details)) {
    if (detail.rate < 100) {
      gaps.push({
        category,
        rate: detail.rate,
        missing: detail.total - detail.matched,
        total: detail.total,
      });
    }
  }
  return gaps.sort((a, b) => a.rate - b.rate);
}

module.exports = { calculateMatchRate, needsIteration, identifyGaps, DEFAULT_WEIGHTS };
