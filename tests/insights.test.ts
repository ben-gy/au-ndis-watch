import { describe, expect, it } from 'vitest';
import type { ComplianceAction, Stats } from '../src/types';
import { buildInsights } from '../src/utils/insights';

function mkAction(o: Partial<ComplianceAction>): ComplianceAction {
  return {
    id: 1,
    raw_type: '',
    type: 'banning_order',
    type_label: 'Banning order',
    severity: 'red',
    effective_from: '2026-06-01',
    effective_from_ym: '2026-06',
    no_longer_in_force: null,
    name: 'X',
    is_person: false,
    key: 'x',
    abn: null,
    city: null,
    state: 'NSW',
    postcode: null,
    provider_number: null,
    other_info: null,
    group_codes: [],
    group_categories: ['community'],
    narrative: '',
    ...o,
  };
}

const mkStats = (overrides: Partial<Stats> = {}): Stats => ({
  total_actions: 10,
  total_entities: 8,
  repeat_entities_count: 1,
  by_type: { banning_order: 5, compliance_notice: 5 },
  by_state: { NSW: 10 },
  by_severity: { red: 5, amber: 0, slate: 5 },
  state_leaderboard: [
    { state: 'NSW', count: 10, population: 8000000, per_100k: 0.125, severity_mix: { red: 5, slate: 5 } },
    { state: 'VIC', count: 2, population: 7000000, per_100k: 0.029, severity_mix: { red: 2 } },
  ],
  timeline: [{ month: '2026-06', counts: { banning_order: 3, compliance_notice: 2 } }],
  repeat_entities: [
    {
      key: 'r',
      name: 'Repeat Org',
      is_person: false,
      state: 'NSW',
      action_count: 4,
      action_types: ['banning_order'],
      first_action: '2024-01-01',
      last_action: '2026-06-01',
    },
  ],
  group_totals: [{ category: 'community', count: 10 }],
  group_by_type: { community: { banning_order: 5, compliance_notice: 5 } },
  last_12m_actions: 5,
  last_12m_bans: 4,
  prev_12m_bans: 2,
  earliest_action: '2019-01-01',
  latest_action: '2026-06-01',
  ...overrides,
});

describe('buildInsights', () => {
  it('always includes a recent-bans insight', () => {
    const acts = [mkAction({}), mkAction({ type: 'compliance_notice', severity: 'slate' })];
    const insights = buildInsights(acts, mkStats());
    expect(insights.some((i) => i.id === 'recent-bans')).toBe(true);
  });

  it('flags YoY change in banning orders', () => {
    const insights = buildInsights([mkAction({})], mkStats());
    const yoy = insights.find((i) => i.id === 'yoy-bans');
    expect(yoy).toBeTruthy();
    // 4 vs 2 = +100%
    expect(yoy?.metric).toContain('100');
  });

  it('flags repeat-offender entities', () => {
    const insights = buildInsights([mkAction({})], mkStats());
    expect(insights.some((i) => i.id === 'repeat-offenders')).toBe(true);
  });

  it('flags per-100k state outliers', () => {
    const stats = mkStats({
      state_leaderboard: [
        { state: 'NSW', count: 10, population: 8000000, per_100k: 0.1, severity_mix: {} },
        { state: 'NT', count: 5, population: 250000, per_100k: 2.0, severity_mix: {} },
      ],
    });
    const insights = buildInsights([mkAction({})], stats);
    expect(insights.some((i) => i.id === 'state-outlier')).toBe(true);
  });

  it('handles empty actions array', () => {
    const insights = buildInsights([], mkStats({ repeat_entities: [], repeat_entities_count: 0 }));
    expect(insights.length).toBeGreaterThan(0);
  });
});
