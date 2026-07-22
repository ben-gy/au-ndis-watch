// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { ActionType, AppState, ComplianceAction, Stats } from '../types';
import { TYPE_COLORS } from '../utils/colors';
import { escapeHtml, fmtInt, fmtMonth } from '../utils/format';

interface TimelineContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

export function renderTimeline(ctx: TimelineContext, container: HTMLElement): void {
  const timeline = ctx.stats.timeline;
  if (!timeline.length) {
    container.innerHTML = '<p class="empty">No timeline data available.</p>';
    return;
  }

  const allTypes = Object.keys(ctx.stats.by_type) as ActionType[];
  const totals = timeline.map((p) => {
    let sum = 0;
    for (const t of allTypes) sum += p.counts[t] ?? 0;
    return sum;
  });
  const maxTotal = Math.max(1, ...totals);

  const svgWidth = 1100;
  const svgHeight = 360;
  const padLeft = 56;
  const padRight = 20;
  const padTop = 28;
  const padBottom = 60;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const n = timeline.length;
  const barGap = 1;
  const barWidth = Math.max(2, (chartW - barGap * (n - 1)) / n);

  const yTicks = 5;
  const yStep = Math.ceil(maxTotal / yTicks);
  const yMax = yStep * yTicks;
  const yScale = (v: number) => padTop + chartH - (v / yMax) * chartH;

  const tickLines: string[] = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = i * yStep;
    const y = yScale(val);
    tickLines.push(
      `<line class="grid-line" x1="${padLeft}" x2="${svgWidth - padRight}" y1="${y}" y2="${y}" />`,
      `<text class="grid-label" x="${padLeft - 8}" y="${y + 4}" text-anchor="end">${fmtInt(val)}</text>`,
    );
  }

  const xLabels: string[] = [];
  const labelEvery = Math.ceil(n / 12);
  for (let i = 0; i < n; i++) {
    if (i % labelEvery === 0 || i === n - 1) {
      const x = padLeft + i * (barWidth + barGap) + barWidth / 2;
      xLabels.push(
        `<text class="grid-label" x="${x}" y="${svgHeight - padBottom + 16}" text-anchor="middle">${fmtMonth(timeline[i].month)}</text>`,
      );
    }
  }

  const bars: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = timeline[i];
    let stackOffset = 0;
    const x = padLeft + i * (barWidth + barGap);
    let tooltipLines = `${fmtMonth(p.month)} — Total ${fmtInt(totals[i])}`;
    for (const t of allTypes) {
      const v = p.counts[t] ?? 0;
      if (v === 0) continue;
      const segH = (v / yMax) * chartH;
      const yTop = yScale(stackOffset + v);
      bars.push(
        `<rect class="bar-seg" data-month="${p.month}" data-type="${t}"
              x="${x.toFixed(2)}" y="${yTop.toFixed(2)}"
              width="${barWidth.toFixed(2)}" height="${segH.toFixed(2)}"
              fill="${TYPE_COLORS[t] ?? '#475569'}" />`,
      );
      tooltipLines += `\n${t.replace(/_/g, ' ')}: ${v}`;
      stackOffset += v;
    }
    bars.push(
      `<rect class="bar-hover" x="${x.toFixed(2)}" y="${padTop}"
            width="${barWidth.toFixed(2)}" height="${chartH}"
            data-tip="${escapeHtml(tooltipLines)}" aria-label="${escapeHtml(tooltipLines)}" data-month="${p.month}" />`,
    );
  }

  const legend = allTypes
    .map(
      (t) =>
        `<span class="legend-item"><span class="legend-dot" style="background:${TYPE_COLORS[t] ?? '#475569'}"></span> ${escapeHtml(
          t.replace(/_/g, ' '),
        )} <span class="muted">${fmtInt(ctx.stats.by_type[t] ?? 0)}</span></span>`,
    )
    .join('');

  container.innerHTML = `
  <section class="timeline-view">
    <div class="view-header">
      <h2>Enforcement intensity over time</h2>
      <p class="muted">Stacked bars: each colour = a different action type. The Commission’s Enforcement Register covers ${fmtInt(
        ctx.stats.total_actions,
      )} actions from ${escapeHtml(ctx.stats.earliest_action ?? '—')} to ${escapeHtml(
        ctx.stats.latest_action ?? '—',
      )}.</p>
    </div>
    <div class="legend">${legend}</div>
    <div class="chart-wrap">
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet" class="chart-svg" aria-label="Monthly enforcement actions by type">
        ${tickLines.join('')}
        ${bars.join('')}
        ${xLabels.join('')}
      </svg>
    </div>
    <div class="chart-summary">
      <div class="stat">
        <div class="stat-label">Last 12 months</div>
        <div class="stat-value mono">${fmtInt(ctx.stats.last_12m_actions)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Banning orders, last 12 months</div>
        <div class="stat-value mono">${fmtInt(ctx.stats.last_12m_bans)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Banning orders, prior 12 months</div>
        <div class="stat-value mono">${fmtInt(ctx.stats.prev_12m_bans)}</div>
      </div>
    </div>
  </section>`;
}
