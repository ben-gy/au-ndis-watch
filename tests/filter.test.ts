import { describe, expect, it } from 'vitest';
import type { ComplianceAction } from '../src/types';
import { applyFilters, entityActions, uniqueYears } from '../src/utils/filter';
import { createInitialState } from '../src/state';

function action(overrides: Partial<ComplianceAction> = {}): ComplianceAction {
  return {
    id: 1,
    raw_type: 'ER - Banning Order',
    type: 'banning_order',
    type_label: 'Banning order',
    severity: 'red',
    effective_from: '2026-04-01',
    effective_from_ym: '2026-04',
    no_longer_in_force: null,
    name: 'Acme Pty Ltd',
    is_person: false,
    key: 'acme-pty-ltd',
    abn: '123',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    provider_number: null,
    other_info: null,
    group_codes: ['136 group and centre-based activities'],
    group_categories: ['community'],
    narrative: 'Detail',
    ...overrides,
  };
}

describe('applyFilters', () => {
  const seed: ComplianceAction[] = [
    action({ id: 1, name: 'Acme Pty Ltd', state: 'NSW', type: 'banning_order' }),
    action({
      id: 2,
      name: 'Best Care Co',
      state: 'VIC',
      type: 'revocation',
      effective_from: '2025-08-01',
      effective_from_ym: '2025-08',
      severity: 'red',
    }),
    action({
      id: 3,
      name: 'Chen, Lin',
      state: 'QLD',
      type: 'compliance_notice',
      severity: 'slate',
      effective_from: '2026-01-15',
      effective_from_ym: '2026-01',
    }),
  ];

  it('returns everything when no filters set', () => {
    const s = createInitialState();
    expect(applyFilters(seed, s)).toHaveLength(3);
  });

  it('filters by search query (case-insensitive)', () => {
    const s = createInitialState();
    s.search = 'best';
    const r = applyFilters(seed, s);
    expect(r).toHaveLength(1);
    expect(r[0].name).toBe('Best Care Co');
  });

  it('filters by state', () => {
    const s = createInitialState();
    s.selectedStates.add('VIC');
    expect(applyFilters(seed, s)).toHaveLength(1);
  });

  it('filters by type', () => {
    const s = createInitialState();
    s.selectedTypes.add('compliance_notice');
    const r = applyFilters(seed, s);
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('compliance_notice');
  });

  it('combines multiple filters with AND', () => {
    const s = createInitialState();
    s.selectedStates.add('NSW');
    s.selectedSeverities.add('red');
    expect(applyFilters(seed, s)).toHaveLength(1);
  });

  it('filters by year range', () => {
    const s = createInitialState();
    s.yearFrom = 2026;
    const r = applyFilters(seed, s);
    expect(r.map((a) => a.id).sort()).toEqual([1, 3]);
  });

  it('sorts by date desc by default', () => {
    const s = createInitialState();
    const r = applyFilters(seed, s);
    expect(r.map((a) => a.id)).toEqual([1, 3, 2]);
  });

  it('sorts by name asc', () => {
    const s = createInitialState();
    s.sortKey = 'name_asc';
    const r = applyFilters(seed, s);
    expect(r.map((a) => a.name)).toEqual(['Acme Pty Ltd', 'Best Care Co', 'Chen, Lin']);
  });
});

describe('entityActions', () => {
  it('returns all matching actions for a key', () => {
    const seed = [action({ id: 1, key: 'a' }), action({ id: 2, key: 'b' }), action({ id: 3, key: 'a' })];
    expect(entityActions(seed, 'a').map((x) => x.id).sort()).toEqual([1, 3]);
  });
});

describe('uniqueYears', () => {
  it('returns sorted unique years from effective_from', () => {
    const seed = [
      action({ effective_from: '2024-04-01' }),
      action({ effective_from: '2026-04-01' }),
      action({ effective_from: '2025-04-01' }),
      action({ effective_from: null }),
    ];
    expect(uniqueYears(seed)).toEqual([2024, 2025, 2026]);
  });
});
