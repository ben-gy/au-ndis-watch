// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { AppState, ComplianceAction, Stats } from '../types';
import { SEVERITY_COLORS, STATE_LABELS } from '../utils/colors';
import { escapeHtml, fmtInt, fmtNum } from '../utils/format';
import { termIcon } from '../glossary-tooltip';

interface StatesContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

export function renderStates(ctx: StatesContext, container: HTMLElement): void {
  const data = ctx.stats.state_leaderboard;
  const populationTotal = data.reduce((a, s) => a + s.population, 0);
  const actionTotal = data.reduce((a, s) => a + s.count, 0);
  const nationalRate = populationTotal ? (actionTotal / populationTotal) * 100000 : 0;
  const maxPer = Math.max(...data.map((s) => s.per_100k));
  const maxCount = Math.max(...data.map((s) => s.count));

  container.innerHTML = `
  <section class="states-view">
    <div class="view-header">
      <h2>State leaderboard ${termIcon('per-100k')}</h2>
      <p class="muted">Raw counts are dominated by population. Sort by per-100k to see where enforcement is most concentrated. National average: <strong>${fmtNum(nationalRate, 2)}</strong> per 100k.</p>
    </div>
    <div class="states-grid">
      ${data
        .map((s) => {
          const total =
            (s.severity_mix.red ?? 0) + (s.severity_mix.amber ?? 0) + (s.severity_mix.slate ?? 0);
          const wRed = total ? ((s.severity_mix.red ?? 0) / total) * 100 : 0;
          const wAmb = total ? ((s.severity_mix.amber ?? 0) / total) * 100 : 0;
          const wSla = total ? ((s.severity_mix.slate ?? 0) / total) * 100 : 0;
          const aboveAvg = nationalRate > 0 ? s.per_100k - nationalRate : 0;
          const flag =
            nationalRate > 0 && s.per_100k > nationalRate * 1.5
              ? `<span class="callout callout-warn">${fmtNum(s.per_100k / nationalRate, 1)}× national rate</span>`
              : '';
          return `
          <article class="state-card" data-state="${s.state}">
            <header>
              <div class="state-name">${escapeHtml(STATE_LABELS[s.state] ?? s.state)} <span class="muted mono">${s.state}</span></div>
              ${flag}
            </header>
            <div class="state-metrics">
              <div class="metric">
                <div class="metric-label">Total actions</div>
                <div class="metric-value mono">${fmtInt(s.count)}</div>
                <div class="bar" data-tip="${escapeHtml(`${STATE_LABELS[s.state] ?? s.state}: ${fmtInt(s.count)} actions`)}">
                  <span style="width:${(s.count / maxCount) * 100}%; background:${SEVERITY_COLORS.red}"></span>
                </div>
              </div>
              <div class="metric">
                <div class="metric-label">Per 100k population</div>
                <div class="metric-value mono">${fmtNum(s.per_100k, 2)}</div>
                <div class="bar" data-tip="${escapeHtml(`${STATE_LABELS[s.state] ?? s.state}: ${fmtNum(s.per_100k, 2)} per 100k (national ${fmtNum(nationalRate, 2)})`)}">
                  <span style="width:${(s.per_100k / maxPer) * 100}%; background:${SEVERITY_COLORS.amber}"></span>
                </div>
                <div class="muted xs">vs national ${fmtNum(nationalRate, 2)} (${aboveAvg >= 0 ? '+' : ''}${fmtNum(aboveAvg, 2)})</div>
              </div>
              <div class="metric">
                <div class="metric-label">Severity mix</div>
                <div class="sev-bar tall" data-tip="Red ${s.severity_mix.red ?? 0} · Amber ${s.severity_mix.amber ?? 0} · Slate ${s.severity_mix.slate ?? 0}" aria-label="Red ${s.severity_mix.red ?? 0} · Amber ${s.severity_mix.amber ?? 0} · Slate ${s.severity_mix.slate ?? 0}">
                  <span style="width:${wRed}%; background:${SEVERITY_COLORS.red}"></span>
                  <span style="width:${wAmb}%; background:${SEVERITY_COLORS.amber}"></span>
                  <span style="width:${wSla}%; background:${SEVERITY_COLORS.slate}"></span>
                </div>
                <div class="muted xs">
                  ${fmtInt(s.severity_mix.red ?? 0)} red ·
                  ${fmtInt(s.severity_mix.amber ?? 0)} amber ·
                  ${fmtInt(s.severity_mix.slate ?? 0)} slate
                </div>
              </div>
            </div>
            <footer>
              <button class="btn-link" data-action="filter-state" data-state="${s.state}">Show actions in ${s.state} →</button>
            </footer>
          </article>`;
        })
        .join('')}
    </div>
  </section>`;

  container.querySelectorAll<HTMLElement>('[data-action="filter-state"]').forEach((b) => {
    b.addEventListener('click', () => {
      const code = b.dataset.state as ComplianceAction['state'];
      if (!code) return;
      const set = new Set(ctx.state.selectedStates);
      set.clear();
      set.add(code);
      ctx.setState({ selectedStates: set, view: 'browse' });
    });
  });
}
