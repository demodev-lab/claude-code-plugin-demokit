/**
 * Team Level Mapping
 * demokit(토폴로지 레벨) ↔ bkit(성숙도 레벨) 호환 매핑
 */

const DEFAULT_TO_PROFILE_MAP = {
  SingleModule: 'Dynamic',
  MultiModule: 'Dynamic',
  Monolith: 'Dynamic',
  MSA: 'Enterprise',
};

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function resolveLevelProfile(level, cfg = {}) {
  const normalizedLevel = normalizeNonEmptyString(level);
  if (!normalizedLevel) return null;

  const customMap = cfg?.team?.levelProfileMap;
  if (customMap && typeof customMap === 'object') {
    const mapped = normalizeNonEmptyString(customMap[normalizedLevel]);
    if (mapped) return mapped;
  }

  return DEFAULT_TO_PROFILE_MAP[normalizedLevel] || null;
}

function getCompatibleLevelKeys(level, cfg = {}) {
  const keys = [];
  const pushUnique = (value) => {
    const normalized = normalizeNonEmptyString(value);
    if (!normalized) return;
    if (!keys.includes(normalized)) keys.push(normalized);
  };

  pushUnique(level);
  pushUnique(resolveLevelProfile(level, cfg));
  pushUnique('default');

  return keys;
}

module.exports = {
  DEFAULT_TO_PROFILE_MAP,
  resolveLevelProfile,
  getCompatibleLevelKeys,
};
