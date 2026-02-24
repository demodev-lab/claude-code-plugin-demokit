export type ModelTier = 'haiku' | 'sonnet' | 'opus';

export interface RoutingInput {
  layer?: string;
  taskDescription?: string;
  agentType?: string;
}

export interface RoutingResult {
  model: ModelTier;
  reason: string;
}

const COMPLEXITY_SIGNALS: Record<ModelTier, RegExp[]> = {
  opus: [/architect/i, /security/i, /refactor/i, /migration/i, /설계/i, /보안/i],
  haiku: [/format/i, /lint/i, /typo/i, /rename/i, /changelog/i, /report/i],
  sonnet: [],
};

export function routeModel(
  input: RoutingInput,
  configAssignment?: Record<string, string>
): RoutingResult {
  const { agentType, taskDescription } = input;

  // 1. configAssignment 우선
  const VALID_TIERS: ModelTier[] = ['haiku', 'sonnet', 'opus'];
  if (agentType && configAssignment?.[agentType]) {
    const assigned = configAssignment[agentType] as ModelTier;
    if (VALID_TIERS.includes(assigned)) {
      return { model: assigned, reason: `config: ${agentType}=${assigned}` };
    }
  }

  // 2. taskDescription signal 매칭 (opus > haiku > sonnet)
  if (taskDescription) {
    for (const tier of ['opus', 'haiku'] as ModelTier[]) {
      const matched = COMPLEXITY_SIGNALS[tier].find((r) => r.test(taskDescription));
      if (matched) {
        return { model: tier, reason: `signal: ${matched}` };
      }
    }
  }

  // 3. fallback
  return { model: 'sonnet', reason: 'default' };
}
