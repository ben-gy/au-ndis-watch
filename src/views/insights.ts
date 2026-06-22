import type { AppState, ComplianceAction, Stats } from '../types';
import { buildInsights } from '../utils/insights';
import { escapeHtml, fmtDate, fmtInt } from '../utils/format';
import { SEVERITY_COLORS } from '../utils/colors';

interface InsightsContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

export function renderInsights(ctx: InsightsContext, container: HTMLElement): void {
  const insights = buildInsights(ctx.actions, ctx.stats);
  const repeat = ctx.stats.repeat_entities.slice(0, 20);

  container.innerHTML = `
  <section class="insights-view">
    <div class="view-header">
      <h2>Insights</h2>
      <p class="muted">Auto-generated findings from the dataset — not editorial commentary. Use them as starting points; click through to verify against the source records.</p>
    </div>
    <div class="insight-grid">
      ${insights
        .map(
          (i) => `
        <article class="insight-card insight-${i.severity}">
          <div class="insight-head">
            <span class="insight-tag">${escapeHtml(i.severity.toUpperCase())}</span>
            ${i.metric ? `<span class="insight-metric mono">${escapeHtml(i.metric)}</span>` : ''}
          </div>
          <h3>${escapeHtml(i.title)}</h3>
          <p>${escapeHtml(i.body)}</p>
        </article>`,
        )
        .join('')}
    </div>
    <div class="card repeat-card">
      <h3>Entities with the most separate compliance actions</h3>
      <p class="muted">${ctx.stats.repeat_entities_count} entities have 2 or more separate actions. Showing the top 20.</p>
      <table class="mini-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Entity</th>
            <th>State</th>
            <th class="num">Actions</th>
            <th>First → last</th>
          </tr>
        </thead>
        <tbody>
          ${repeat
            .map(
              (e, i) => `
            <tr data-entity="${escapeHtml(e.key)}">
              <td class="mono">${i + 1}</td>
              <td>
                <strong>${escapeHtml(e.name)}</strong>
                ${e.is_person ? '<span class="badge-person">person</span>' : '<span class="badge-org">organisation</span>'}
              </td>
              <td>${e.state ?? '—'}</td>
              <td class="num mono" style="color:${SEVERITY_COLORS.red}">${e.action_count}</td>
              <td class="muted xs">${fmtDate(e.first_action)} → ${fmtDate(e.last_action)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="card stats-footer">
      <h3>Dataset overview</h3>
      <dl class="kv">
        <div><dt>Total actions</dt><dd class="mono">${fmtInt(ctx.stats.total_actions)}</dd></div>
        <div><dt>Distinct entities</dt><dd class="mono">${fmtInt(ctx.stats.total_entities)}</dd></div>
        <div><dt>Months covered</dt><dd class="mono">${fmtInt(ctx.stats.timeline.length)}</dd></div>
        <div><dt>Earliest action</dt><dd class="mono">${fmtDate(ctx.stats.earliest_action)}</dd></div>
        <div><dt>Latest action</dt><dd class="mono">${fmtDate(ctx.stats.latest_action)}</dd></div>
        <div><dt>Banning orders (lifetime)</dt><dd class="mono" style="color:${SEVERITY_COLORS.red}">${fmtInt(ctx.stats.by_type.banning_order ?? 0)}</dd></div>
      </dl>
    </div>
  </section>`;

  container.querySelectorAll<HTMLElement>('tr[data-entity]').forEach((row) => {
    row.addEventListener('click', () => {
      const key = row.dataset.entity;
      if (key) ctx.setState({ drilldownKey: key });
    });
  });
}
