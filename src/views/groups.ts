import type { ActionType, AppState, ComplianceAction, Stats } from '../types';
import { CATEGORY_COLORS, CATEGORY_LABELS, TYPE_COLORS } from '../utils/colors';
import { escapeHtml, fmtInt } from '../utils/format';
import { termIcon } from '../glossary-tooltip';

interface GroupsContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

interface FlowLink {
  src: string; // category
  dst: ActionType;
  value: number;
}

export function renderGroups(ctx: GroupsContext, container: HTMLElement): void {
  const cats = ctx.stats.group_totals.filter((g) => g.count > 0);
  if (!cats.length) {
    container.innerHTML = '<p class="empty">No registration-group classifications available.</p>';
    return;
  }
  const allTypes = Object.keys(ctx.stats.by_type) as ActionType[];

  const links: FlowLink[] = [];
  for (const cat of cats) {
    for (const t of allTypes) {
      const v = ctx.stats.group_by_type[cat.category]?.[t] ?? 0;
      if (v > 0) links.push({ src: cat.category, dst: t, value: v });
    }
  }
  const maxLink = Math.max(...links.map((l) => l.value), 1);

  const W = 880;
  const H = Math.max(360, cats.length * 50 + 80);
  const colW = 12;
  const leftX = 80;
  const rightX = W - 100;
  const srcPad = 6;
  const dstPad = 6;
  const totalSrc = cats.reduce((a, c) => a + c.count, 0);
  const totalDst = allTypes.reduce((a, t) => a + (ctx.stats.by_type[t] ?? 0), 0);
  const usableH = H - 60;

  const srcPositions: Record<string, { y: number; h: number }> = {};
  let yAcc = 30;
  for (const c of cats) {
    const h = (c.count / totalSrc) * (usableH - cats.length * srcPad);
    srcPositions[c.category] = { y: yAcc, h };
    yAcc += h + srcPad;
  }
  const dstPositions: Record<string, { y: number; h: number }> = {};
  yAcc = 30;
  for (const t of allTypes) {
    const h = ((ctx.stats.by_type[t] ?? 0) / totalDst) * (usableH - allTypes.length * dstPad);
    dstPositions[t] = { y: yAcc, h };
    yAcc += h + dstPad;
  }

  const srcOffsets: Record<string, number> = {};
  for (const c of cats) srcOffsets[c.category] = srcPositions[c.category].y;
  const dstOffsets: Record<string, number> = {};
  for (const t of allTypes) dstOffsets[t] = dstPositions[t].y;

  const sortedLinks = [...links].sort((a, b) => b.value - a.value);
  const flowPaths: string[] = [];
  for (const l of sortedLinks) {
    const src = srcPositions[l.src];
    const dst = dstPositions[l.dst];
    if (!src || !dst) continue;
    const srcH = (l.value / cats.find((c) => c.category === l.src)!.count) * src.h;
    const dstH = (l.value / (ctx.stats.by_type[l.dst] ?? 1)) * dst.h;
    const y1 = srcOffsets[l.src];
    const y2 = dstOffsets[l.dst];
    srcOffsets[l.src] = y1 + srcH;
    dstOffsets[l.dst] = y2 + dstH;
    const x1 = leftX + colW;
    const x2 = rightX;
    const xMid = (x1 + x2) / 2;
    const path = `M ${x1} ${y1 + srcH / 2} C ${xMid} ${y1 + srcH / 2}, ${xMid} ${y2 + dstH / 2}, ${x2} ${y2 + dstH / 2}`;
    const color = CATEGORY_COLORS[l.src] ?? '#475569';
    const opacity = 0.18 + (l.value / maxLink) * 0.32;
    const widthStroke = Math.max(1.5, Math.min(srcH, dstH));
    flowPaths.push(
      `<path d="${path}" stroke="${color}" stroke-opacity="${opacity}"
            stroke-width="${widthStroke.toFixed(2)}" fill="none"
            data-cat="${escapeHtml(l.src)}" data-type="${l.dst}" class="flow-link">
        <title>${escapeHtml(CATEGORY_LABELS[l.src] ?? l.src)} → ${escapeHtml(l.dst.replace(/_/g, ' '))}: ${fmtInt(l.value)}</title>
      </path>`,
    );
  }

  const srcNodes = cats
    .map(
      (c) => `
    <g class="flow-node" data-cat="${escapeHtml(c.category)}">
      <rect x="${leftX}" y="${srcPositions[c.category].y}" width="${colW}" height="${Math.max(2, srcPositions[c.category].h).toFixed(2)}"
            fill="${CATEGORY_COLORS[c.category] ?? '#475569'}" rx="2" />
      <text x="${leftX - 8}" y="${srcPositions[c.category].y + Math.min(14, srcPositions[c.category].h / 2 + 4)}"
            text-anchor="end" class="flow-label">${escapeHtml(CATEGORY_LABELS[c.category] ?? c.category)}
        <tspan class="flow-num"> · ${fmtInt(c.count)}</tspan>
      </text>
    </g>`,
    )
    .join('');

  const dstNodes = allTypes
    .map(
      (t) => `
    <g class="flow-node" data-type="${t}">
      <rect x="${rightX - colW}" y="${dstPositions[t].y}" width="${colW}" height="${Math.max(2, dstPositions[t].h).toFixed(2)}"
            fill="${TYPE_COLORS[t] ?? '#475569'}" rx="2" />
      <text x="${rightX + 8}" y="${dstPositions[t].y + Math.min(14, dstPositions[t].h / 2 + 4)}"
            class="flow-label">${escapeHtml(t.replace(/_/g, ' '))}
        <tspan class="flow-num"> · ${fmtInt(ctx.stats.by_type[t] ?? 0)}</tspan>
      </text>
    </g>`,
    )
    .join('');

  container.innerHTML = `
  <section class="groups-view">
    <div class="view-header">
      <h2>Service category → action type ${termIcon('registration-group')}</h2>
      <p class="muted">How enforcement flows from the kinds of supports a provider is registered to deliver, to the action the Commission ultimately takes. Click a band to filter the Browse view.</p>
    </div>
    <div class="card flow-card">
      <svg viewBox="0 0 ${W} ${H}" class="flow-svg" aria-label="Service category to action type flow">
        ${flowPaths.join('')}
        ${srcNodes}
        ${dstNodes}
      </svg>
    </div>
    <div class="card cat-list-card">
      <h3>All service categories</h3>
      <table class="mini-table">
        <thead><tr><th>Category</th><th class="num">Actions</th></tr></thead>
        <tbody>
          ${cats
            .map(
              (c) => `<tr data-cat="${escapeHtml(c.category)}">
              <td><span class="legend-dot" style="background:${CATEGORY_COLORS[c.category] ?? '#475569'}"></span>
                  ${escapeHtml(CATEGORY_LABELS[c.category] ?? c.category)}</td>
              <td class="num mono">${fmtInt(c.count)}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  </section>`;

  container.querySelectorAll<SVGElement>('[data-cat]').forEach((el) => {
    el.addEventListener('click', () => {
      const cat = el.getAttribute('data-cat');
      if (!cat) return;
      const set = new Set(ctx.state.selectedCategories);
      set.clear();
      set.add(cat);
      ctx.setState({ selectedCategories: set, view: 'browse' });
    });
  });
  container.querySelectorAll<SVGElement>('[data-type]').forEach((el) => {
    el.addEventListener('click', () => {
      const t = el.getAttribute('data-type') as ActionType | null;
      if (!t) return;
      const set = new Set(ctx.state.selectedTypes);
      set.clear();
      set.add(t);
      ctx.setState({ selectedTypes: set, view: 'browse' });
    });
  });
}
