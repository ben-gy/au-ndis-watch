// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppState, ComplianceAction } from '../types';

export function applyFilters(
  actions: ComplianceAction[],
  state: AppState,
): ComplianceAction[] {
  const q = state.search.trim().toLowerCase();
  const hasTypes = state.selectedTypes.size > 0;
  const hasStates = state.selectedStates.size > 0;
  const hasSeverity = state.selectedSeverities.size > 0;
  const hasCategories = state.selectedCategories.size > 0;
  const fromY = state.yearFrom;
  const toY = state.yearTo;

  const filtered = actions.filter((a) => {
    if (hasTypes && !state.selectedTypes.has(a.type)) return false;
    if (hasStates && (!a.state || !state.selectedStates.has(a.state))) return false;
    if (hasSeverity && !state.selectedSeverities.has(a.severity)) return false;
    if (hasCategories) {
      let hit = false;
      for (const c of a.group_categories) {
        if (state.selectedCategories.has(c)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }
    if (fromY !== null || toY !== null) {
      const y = a.effective_from ? parseInt(a.effective_from.slice(0, 4), 10) : null;
      if (y === null) return false;
      if (fromY !== null && y < fromY) return false;
      if (toY !== null && y > toY) return false;
    }
    if (q) {
      const hay = [
        a.name,
        a.city ?? '',
        a.state ?? '',
        a.postcode ?? '',
        a.abn ?? '',
        a.type_label,
        a.narrative.slice(0, 400),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  switch (state.sortKey) {
    case 'date_asc':
      filtered.sort((a, b) => (a.effective_from ?? '').localeCompare(b.effective_from ?? ''));
      break;
    case 'name_asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'severity_desc': {
      const order: Record<string, number> = { red: 0, amber: 1, slate: 2 };
      filtered.sort((a, b) => {
        const s = (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
        if (s !== 0) return s;
        return (b.effective_from ?? '').localeCompare(a.effective_from ?? '');
      });
      break;
    }
    case 'date_desc':
    default:
      filtered.sort((a, b) => (b.effective_from ?? '').localeCompare(a.effective_from ?? ''));
  }
  return filtered;
}

export function entityActions(
  actions: ComplianceAction[],
  key: string,
): ComplianceAction[] {
  return actions
    .filter((a) => a.key === key)
    .sort((a, b) => (b.effective_from ?? '').localeCompare(a.effective_from ?? ''));
}

export function uniqueYears(actions: ComplianceAction[]): number[] {
  const set = new Set<number>();
  for (const a of actions) {
    if (a.effective_from) set.add(parseInt(a.effective_from.slice(0, 4), 10));
  }
  return [...set].sort((a, b) => a - b);
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let h: ReturnType<typeof setTimeout> | null = null;
  return (...args) => {
    if (h !== null) clearTimeout(h);
    h = setTimeout(() => fn(...args), ms);
  };
}
