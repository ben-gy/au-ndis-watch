import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  createInitialState,
  parseHash,
  resetFilters,
} from '../src/state';

describe('createInitialState', () => {
  it('starts in browse view with no filters', () => {
    const s = createInitialState();
    expect(s.view).toBe('browse');
    expect(s.selectedTypes.size).toBe(0);
    expect(s.selectedStates.size).toBe(0);
    expect(s.search).toBe('');
    expect(s.drilldownKey).toBeNull();
  });
});

describe('parseHash', () => {
  it('parses view from hash', () => {
    const next = parseHash('#view=timeline', createInitialState());
    expect(next.view).toBe('timeline');
  });
  it('parses multiple filter values', () => {
    const next = parseHash('#type=banning_order,revocation&state=NSW,VIC', createInitialState());
    expect(next.selectedTypes.has('banning_order')).toBe(true);
    expect(next.selectedTypes.has('revocation')).toBe(true);
    expect(next.selectedStates.has('NSW')).toBe(true);
    expect(next.selectedStates.has('VIC')).toBe(true);
  });
  it('parses search', () => {
    const next = parseHash('#q=acme', createInitialState());
    expect(next.search).toBe('acme');
  });
  it('parses year range', () => {
    const next = parseHash('#fy=2024&ty=2026', createInitialState());
    expect(next.yearFrom).toBe(2024);
    expect(next.yearTo).toBe(2026);
  });
  it('parses drilldown entity', () => {
    const next = parseHash('#entity=acme-pty-ltd', createInitialState());
    expect(next.drilldownKey).toBe('acme-pty-ltd');
  });
  it('defaults to browse for empty hash', () => {
    const next = parseHash('', createInitialState());
    expect(next.view).toBe('browse');
  });
  it('ignores unknown views', () => {
    const next = parseHash('#view=bogus', createInitialState());
    expect(next.view).toBe('browse');
  });
});

describe('activeFilterCount', () => {
  it('counts each non-empty filter once', () => {
    const s = createInitialState();
    expect(activeFilterCount(s)).toBe(0);
    s.search = 'x';
    expect(activeFilterCount(s)).toBe(1);
    s.selectedTypes.add('banning_order');
    s.selectedStates.add('NSW');
    expect(activeFilterCount(s)).toBe(3);
  });
});

describe('resetFilters', () => {
  it('clears search, sets and year range but keeps the view', () => {
    const s = createInitialState();
    s.view = 'timeline';
    s.search = 'x';
    s.selectedStates.add('NSW');
    s.yearFrom = 2024;
    const after = resetFilters(s);
    expect(after.view).toBe('timeline');
    expect(after.search).toBe('');
    expect(after.selectedStates.size).toBe(0);
    expect(after.yearFrom).toBeNull();
  });
});
