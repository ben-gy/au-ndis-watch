import type { ActionType, AppState, ComplianceAction, Severity, State, Stats } from '../types';
import { applyFilters, debounce, uniqueYears } from '../utils/filter';
import { escapeHtml, fmtDate, fmtInt, relativeAge, truncate } from '../utils/format';
import { SEVERITY_COLORS, SEVERITY_LABELS, STATE_LABELS, TYPE_COLORS } from '../utils/colors';
import { activeFilterCount, resetFilters } from '../state';
import { termIcon } from '../glossary-tooltip';

const PAGE_SIZE = 50;

interface BrowseContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

let currentPage = 1;
let cachedSig = '';

function filterSignature(state: AppState): string {
  return JSON.stringify({
    q: state.search,
    t: [...state.selectedTypes].sort(),
    s: [...state.selectedStates].sort(),
    sv: [...state.selectedSeverities].sort(),
    c: [...state.selectedCategories].sort(),
    f: state.yearFrom,
    e: state.yearTo,
    sk: state.sortKey,
  });
}

function pill(color: string, label: string, extraClass = ''): string {
  return `<span class="pill ${extraClass}" style="--pill-color:${color}">${escapeHtml(label)}</span>`;
}

function renderActionRow(a: ComplianceAction): string {
  const sev = SEVERITY_COLORS[a.severity];
  return `
  <tr class="action-row" data-key="${escapeHtml(a.key)}" data-id="${a.id}">
    <td class="col-date">
      <div class="cell-date">${fmtDate(a.effective_from)}</div>
      <div class="cell-date-rel">${relativeAge(a.effective_from)}</div>
    </td>
    <td class="col-name">
      <div class="entity-link" tabindex="0" role="button">
        ${escapeHtml(a.name)}
        ${a.is_person ? '<span class="badge-person">person</span>' : '<span class="badge-org">organisation</span>'}
      </div>
      ${a.city || a.state ? `<div class="cell-loc">${escapeHtml([a.city, a.state, a.postcode].filter(Boolean).join(', '))}</div>` : ''}
    </td>
    <td class="col-type">
      ${pill(sev, a.type_label)}
    </td>
    <td class="col-state">${a.state ?? '—'}</td>
    <td class="col-narrative">${escapeHtml(truncate(a.narrative, 220))}</td>
  </tr>`;
}

function chipGroup(
  label: string,
  options: { key: string; label: string; count?: number; color?: string }[],
  selected: Set<string>,
  group: string,
): string {
  return `
  <div class="filter-group">
    <div class="filter-group-label">${escapeHtml(label)}</div>
    <div class="chips">
      ${options
        .map(
          (opt) => `
        <button class="chip ${selected.has(opt.key) ? 'chip-on' : ''}"
                data-filter="${escapeHtml(group)}"
                data-value="${escapeHtml(opt.key)}"
                ${opt.color ? `style="--chip-color:${opt.color}"` : ''}>
          <span class="chip-label">${escapeHtml(opt.label)}</span>
          ${opt.count !== undefined ? `<span class="chip-count">${fmtInt(opt.count)}</span>` : ''}
        </button>`,
        )
        .join('')}
    </div>
  </div>`;
}

export function renderBrowse(ctx: BrowseContext, container: HTMLElement): void {
  const sig = filterSignature(ctx.state);
  if (sig !== cachedSig) {
    cachedSig = sig;
    currentPage = 1;
  }

  const filtered = applyFilters(ctx.actions, ctx.state);
  const total = filtered.length;
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const allTypes = Object.keys(ctx.stats.by_type) as ActionType[];
  const typeChips = allTypes.map((t) => ({
    key: t,
    label: t.replace(/_/g, ' '),
    count: ctx.stats.by_type[t] ?? 0,
    color: TYPE_COLORS[t] ?? '#475569',
  }));

  const stateChips: { key: string; label: string; count: number }[] = [];
  for (const s of ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as State[]) {
    stateChips.push({ key: s, label: s, count: ctx.stats.by_state[s] ?? 0 });
  }

  const severityChips: { key: string; label: string; count: number; color: string }[] = (
    ['red', 'amber', 'slate'] as Severity[]
  ).map((s) => ({
    key: s,
    label: SEVERITY_LABELS[s],
    count: ctx.stats.by_severity[s] ?? 0,
    color: SEVERITY_COLORS[s],
  }));

  const years = uniqueYears(ctx.actions);

  container.innerHTML = `
  <section class="browse-layout">
    <aside class="filters" aria-label="Filters">
      <div class="filters-header">
        <h2>Filter</h2>
        ${activeFilterCount(ctx.state) ? '<button class="btn-link" data-action="reset-filters">Clear all</button>' : ''}
      </div>
      <div class="search-row">
        <label for="search-input" class="visually-hidden">Search by name, ABN, suburb</label>
        <input id="search-input" type="search"
               placeholder="Search name, ABN, suburb…"
               value="${escapeHtml(ctx.state.search)}"
               autocomplete="off" />
      </div>
      ${chipGroup('Severity ' + termIcon('severity'), severityChips, ctx.state.selectedSeverities as Set<string>, 'severity')}
      ${chipGroup('Action type', typeChips, ctx.state.selectedTypes as Set<string>, 'type')}
      ${chipGroup('State / Territory', stateChips, ctx.state.selectedStates as Set<string>, 'state')}
      ${
        years.length
          ? `<div class="filter-group">
        <div class="filter-group-label">Year range</div>
        <div class="year-range">
          <label>From <select data-filter="yearFrom">
            <option value="">${years[0]}</option>
            ${years
              .map((y) => `<option value="${y}" ${ctx.state.yearFrom === y ? 'selected' : ''}>${y}</option>`)
              .join('')}
          </select></label>
          <label>To <select data-filter="yearTo">
            <option value="">${years[years.length - 1]}</option>
            ${years
              .map((y) => `<option value="${y}" ${ctx.state.yearTo === y ? 'selected' : ''}>${y}</option>`)
              .join('')}
          </select></label>
        </div>
      </div>`
          : ''
      }
    </aside>

    <main class="results">
      <div class="results-toolbar">
        <div class="results-count">
          <strong>${fmtInt(total)}</strong> ${total === 1 ? 'action' : 'actions'}
          ${total < ctx.actions.length ? `<span class="muted">of ${fmtInt(ctx.actions.length)}</span>` : ''}
        </div>
        <div class="results-sort">
          <label>Sort
            <select data-action="sort">
              <option value="date_desc" ${ctx.state.sortKey === 'date_desc' ? 'selected' : ''}>Most recent</option>
              <option value="date_asc" ${ctx.state.sortKey === 'date_asc' ? 'selected' : ''}>Oldest first</option>
              <option value="severity_desc" ${ctx.state.sortKey === 'severity_desc' ? 'selected' : ''}>Severity</option>
              <option value="name_asc" ${ctx.state.sortKey === 'name_asc' ? 'selected' : ''}>Name (A–Z)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="actions-table">
          <thead>
            <tr>
              <th class="col-date">Date</th>
              <th class="col-name">Entity</th>
              <th class="col-type">Action</th>
              <th class="col-state">State</th>
              <th class="col-narrative">Detail</th>
            </tr>
          </thead>
          <tbody>
            ${
              pageRows.length
                ? pageRows.map(renderActionRow).join('')
                : `<tr><td colspan="5" class="empty-row">No actions match the current filters. <button class="btn-link" data-action="reset-filters">Reset filters</button></td></tr>`
            }
          </tbody>
        </table>
      </div>

      ${
        total > PAGE_SIZE
          ? `<div class="pagination">
        <button class="btn" data-action="page-prev" ${currentPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span class="page-info">
          Showing <strong>${fmtInt(pageStart + 1)}–${fmtInt(pageEnd)}</strong>
          of <strong>${fmtInt(total)}</strong>
        </span>
        <button class="btn" data-action="page-next" ${pageEnd >= total ? 'disabled' : ''}>Next →</button>
      </div>`
          : ''
      }
    </main>
  </section>
  `;

  const sIn = container.querySelector<HTMLInputElement>('#search-input');
  if (sIn) {
    const onInput = debounce((v: string) => ctx.setState({ search: v }), 250);
    sIn.addEventListener('input', () => onInput(sIn.value));
  }

  container.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter ?? '';
      const value = chip.dataset.value ?? '';
      const next: Partial<AppState> = {};
      if (filter === 'type') {
        const s = new Set(ctx.state.selectedTypes);
        s.has(value as ActionType) ? s.delete(value as ActionType) : s.add(value as ActionType);
        next.selectedTypes = s;
      } else if (filter === 'state') {
        const s = new Set(ctx.state.selectedStates);
        s.has(value as State) ? s.delete(value as State) : s.add(value as State);
        next.selectedStates = s;
      } else if (filter === 'severity') {
        const s = new Set(ctx.state.selectedSeverities);
        s.has(value as Severity) ? s.delete(value as Severity) : s.add(value as Severity);
        next.selectedSeverities = s;
      } else if (filter === 'category') {
        const s = new Set(ctx.state.selectedCategories);
        s.has(value) ? s.delete(value) : s.add(value);
        next.selectedCategories = s;
      }
      ctx.setState(next);
    });
  });

  container.querySelectorAll<HTMLSelectElement>('select[data-filter]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const filter = sel.dataset.filter ?? '';
      const v = sel.value ? parseInt(sel.value, 10) : null;
      if (filter === 'yearFrom') ctx.setState({ yearFrom: v });
      if (filter === 'yearTo') ctx.setState({ yearTo: v });
    });
  });

  const sortSel = container.querySelector<HTMLSelectElement>('select[data-action="sort"]');
  if (sortSel) {
    sortSel.addEventListener('change', () => {
      ctx.setState({ sortKey: sortSel.value as AppState['sortKey'] });
    });
  }

  container.querySelectorAll<HTMLElement>('[data-action="reset-filters"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = resetFilters(ctx.state);
      ctx.setState(next);
    });
  });

  container.querySelectorAll<HTMLElement>('.action-row').forEach((row) => {
    const handler = () => {
      const key = row.dataset.key;
      if (key) ctx.setState({ drilldownKey: key });
    };
    row.addEventListener('click', handler);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler();
      }
    });
  });

  const prev = container.querySelector<HTMLButtonElement>('[data-action="page-prev"]');
  const next = container.querySelector<HTMLButtonElement>('[data-action="page-next"]');
  if (prev) prev.addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); ctx.setState({}); });
  if (next) next.addEventListener('click', () => { currentPage += 1; ctx.setState({}); });
}

// Touch unused import to satisfy noUnusedLocals when not referenced elsewhere.
void STATE_LABELS;
