// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { ActionType, AppState, Severity, State, ViewKey } from './types';

const VIEWS: ViewKey[] = [
  'browse',
  'map',
  'timeline',
  'types',
  'states',
  'groups',
  'insights',
];

export function createInitialState(): AppState {
  return {
    view: 'browse',
    search: '',
    selectedTypes: new Set(),
    selectedStates: new Set(),
    selectedSeverities: new Set(),
    selectedCategories: new Set(),
    yearFrom: null,
    yearTo: null,
    drilldownKey: null,
    sortKey: 'date_desc',
  };
}

export function parseHash(hash: string, state: AppState): AppState {
  const next: AppState = {
    ...state,
    selectedTypes: new Set(state.selectedTypes),
    selectedStates: new Set(state.selectedStates),
    selectedSeverities: new Set(state.selectedSeverities),
    selectedCategories: new Set(state.selectedCategories),
  };
  const m = hash.replace(/^#/, '');
  if (!m) {
    next.view = 'browse';
    next.drilldownKey = null;
    return next;
  }
  const params = new URLSearchParams(m);
  const view = params.get('view') as ViewKey | null;
  if (view && VIEWS.includes(view)) next.view = view;
  else if (!view) next.view = 'browse';

  next.search = params.get('q') ?? '';
  next.drilldownKey = params.get('entity');
  next.sortKey = (params.get('sort') as AppState['sortKey']) ?? 'date_desc';

  const types = params.get('type');
  next.selectedTypes = new Set(
    types ? (types.split(',').filter(Boolean) as ActionType[]) : [],
  );
  const states = params.get('state');
  next.selectedStates = new Set(
    states ? (states.split(',').filter(Boolean) as State[]) : [],
  );
  const sev = params.get('sev');
  next.selectedSeverities = new Set(
    sev ? (sev.split(',').filter(Boolean) as Severity[]) : [],
  );
  const cat = params.get('cat');
  next.selectedCategories = new Set(cat ? cat.split(',').filter(Boolean) : []);

  const fy = params.get('fy');
  next.yearFrom = fy ? parseInt(fy, 10) || null : null;
  const ty = params.get('ty');
  next.yearTo = ty ? parseInt(ty, 10) || null : null;
  return next;
}

export function writeHash(state: AppState): void {
  const params = new URLSearchParams();
  if (state.view !== 'browse') params.set('view', state.view);
  if (state.search) params.set('q', state.search);
  if (state.drilldownKey) params.set('entity', state.drilldownKey);
  if (state.sortKey !== 'date_desc') params.set('sort', state.sortKey);
  if (state.selectedTypes.size) params.set('type', [...state.selectedTypes].join(','));
  if (state.selectedStates.size) params.set('state', [...state.selectedStates].join(','));
  if (state.selectedSeverities.size) params.set('sev', [...state.selectedSeverities].join(','));
  if (state.selectedCategories.size) params.set('cat', [...state.selectedCategories].join(','));
  if (state.yearFrom !== null) params.set('fy', String(state.yearFrom));
  if (state.yearTo !== null) params.set('ty', String(state.yearTo));
  const s = params.toString();
  const target = s ? `#${s}` : '';
  if (location.hash !== target) {
    history.replaceState(null, '', `${location.pathname}${location.search}${target}`);
  }
}

export function activeFilterCount(state: AppState): number {
  let n = 0;
  if (state.search) n += 1;
  if (state.selectedTypes.size) n += 1;
  if (state.selectedStates.size) n += 1;
  if (state.selectedSeverities.size) n += 1;
  if (state.selectedCategories.size) n += 1;
  if (state.yearFrom !== null || state.yearTo !== null) n += 1;
  return n;
}

export function resetFilters(state: AppState): AppState {
  return {
    ...state,
    search: '',
    selectedTypes: new Set(),
    selectedStates: new Set(),
    selectedSeverities: new Set(),
    selectedCategories: new Set(),
    yearFrom: null,
    yearTo: null,
  };
}
