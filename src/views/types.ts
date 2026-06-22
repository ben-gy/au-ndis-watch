import type { ActionType, AppState, ComplianceAction, Stats } from '../types';
import { ACTION_TYPE_DEFINITIONS } from '../constants';
import { SEVERITY_COLORS, TYPE_COLORS } from '../utils/colors';
import { escapeHtml, fmtInt } from '../utils/format';
import { termIcon } from '../glossary-tooltip';

interface TypesContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

export function renderTypes(ctx: TypesContext, container: HTMLElement): void {
  const allTypes = Object.keys(ctx.stats.by_type) as ActionType[];
  const total = allTypes.reduce((a, t) => a + (ctx.stats.by_type[t] ?? 0), 0);

  const sorted = allTypes
    .map((t) => ({ type: t, count: ctx.stats.by_type[t] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  // Donut chart geometry
  const cx = 110;
  const cy = 110;
  const r = 90;
  const inner = 55;
  let acc = 0;
  const slices: string[] = [];
  for (const seg of sorted) {
    const start = (acc / total) * Math.PI * 2;
    const end = ((acc + seg.count) / total) * Math.PI * 2;
    acc += seg.count;
    const largeArc = end - start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.sin(start);
    const y1 = cy - r * Math.cos(start);
    const x2 = cx + r * Math.sin(end);
    const y2 = cy - r * Math.cos(end);
    const xi1 = cx + inner * Math.sin(start);
    const yi1 = cy - inner * Math.cos(start);
    const xi2 = cx + inner * Math.sin(end);
    const yi2 = cy - inner * Math.cos(end);
    slices.push(
      `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi2.toFixed(2)} ${yi2.toFixed(2)} A ${inner} ${inner} 0 ${largeArc} 0 ${xi1.toFixed(2)} ${yi1.toFixed(2)} Z"
            fill="${TYPE_COLORS[seg.type] ?? '#475569'}"
            data-type="${seg.type}" class="donut-slice">
        <title>${escapeHtml(seg.type.replace(/_/g, ' '))}: ${fmtInt(seg.count)} (${((seg.count / total) * 100).toFixed(1)}%)</title>
      </path>`,
    );
  }

  const matrixGroups = ctx.stats.group_totals.slice(0, 8);
  let matrixMax = 0;
  for (const cat of matrixGroups) {
    for (const t of allTypes) {
      const v = ctx.stats.group_by_type[cat.category]?.[t] ?? 0;
      if (v > matrixMax) matrixMax = v;
    }
  }
  const matrix = matrixGroups
    .map(
      (cat) => `
    <tr>
      <th class="matrix-row-label">${escapeHtml(cat.category.replace(/_/g, ' '))}<span class="muted"> · ${fmtInt(cat.count)}</span></th>
      ${allTypes
        .map((t) => {
          const v = ctx.stats.group_by_type[cat.category]?.[t] ?? 0;
          const opacity = matrixMax > 0 ? v / matrixMax : 0;
          return `<td class="matrix-cell" data-cat="${cat.category}" data-type="${t}"
            style="background:${TYPE_COLORS[t] ?? '#475569'}; --matrix-opacity:${opacity.toFixed(3)}">
            <span class="matrix-cell-num">${v === 0 ? '' : fmtInt(v)}</span>
          </td>`;
        })
        .join('')}
    </tr>`,
    )
    .join('');

  container.innerHTML = `
  <section class="types-view">
    <div class="view-header">
      <h2>What does enforcement look like? ${termIcon('er')}</h2>
      <p class="muted">Most enforcement is corrective — compliance notices and undertakings. Banning orders and revocations make up the most serious tier.</p>
    </div>
    <div class="types-grid">
      <div class="card donut-card">
        <h3>Action mix</h3>
        <div class="donut-wrap">
          <svg viewBox="0 0 220 220" class="donut-svg" aria-label="Action type donut chart">
            ${slices.join('')}
            <text x="110" y="106" text-anchor="middle" class="donut-center-label">Total</text>
            <text x="110" y="128" text-anchor="middle" class="donut-center-value">${fmtInt(total)}</text>
          </svg>
          <ul class="donut-legend">
            ${sorted
              .map(
                (s) => `<li class="donut-legend-item" data-type="${s.type}">
                <span class="legend-dot" style="background:${TYPE_COLORS[s.type] ?? '#475569'}"></span>
                <span class="donut-label">${escapeHtml(s.type.replace(/_/g, ' '))}</span>
                <span class="donut-count mono">${fmtInt(s.count)}</span>
                <span class="donut-pct muted">${((s.count / total) * 100).toFixed(1)}%</span>
              </li>`,
              )
              .join('')}
          </ul>
        </div>
      </div>
      <div class="card defs-card">
        <h3>Type definitions</h3>
        <dl class="defs-list">
          ${ACTION_TYPE_DEFINITIONS.map(
            (d) => `
            <div class="def-row">
              <dt>
                <span class="sev-dot" style="background:${SEVERITY_COLORS[d.severity]}"></span>
                <span>${escapeHtml(d.label)}</span>
              </dt>
              <dd>${escapeHtml(d.summary)}</dd>
            </div>`,
          ).join('')}
        </dl>
      </div>
    </div>
    <div class="card matrix-card">
      <h3>Cross-reference: service category × action type</h3>
      <p class="muted">Darker = more actions. Reveals which service categories attract which kinds of enforcement.</p>
      <div class="matrix-wrap">
        <table class="matrix">
          <thead>
            <tr>
              <th></th>
              ${allTypes
                .map(
                  (t) => `<th class="matrix-col-label">${escapeHtml(t.replace(/_/g, ' '))}</th>`,
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${matrix}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;

  // Wire donut/legend clicks → filter by type and jump to Browse.
  container.querySelectorAll<HTMLElement>('[data-type]').forEach((el) => {
    el.addEventListener('click', () => {
      const t = el.dataset.type as ActionType | undefined;
      if (!t) return;
      const next = new Set(ctx.state.selectedTypes);
      next.clear();
      next.add(t);
      ctx.setState({ selectedTypes: next, view: 'browse' });
    });
  });
}
