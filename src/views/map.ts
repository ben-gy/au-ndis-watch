import L from 'leaflet';
import type { AppState, ComplianceAction, Stats } from '../types';
import { SEVERITY_COLORS, STATE_CENTROIDS, STATE_LABELS } from '../utils/colors';
import { fmtInt, fmtNum, escapeHtml } from '../utils/format';
import { termIcon } from '../glossary-tooltip';

interface MapContext {
  actions: ComplianceAction[];
  stats: Stats;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

let mapInstance: L.Map | null = null;
let circleLayer: L.LayerGroup | null = null;
const minRadius = 14;
const maxRadius = 56;

function radius(count: number, max: number): number {
  if (max === 0) return minRadius;
  return minRadius + (maxRadius - minRadius) * Math.sqrt(count / max);
}

export function renderMap(ctx: MapContext, container: HTMLElement): void {
  container.innerHTML = `
  <section class="map-view">
    <div class="map-header">
      <div>
        <h2>Where enforcement happens</h2>
        <p class="muted">Bubble area shows the number of compliance actions by state. Click a state to filter the Browse view.
        Per-100k rates use ${termIcon('per-100k', 'ABS population')} (June 2024).</p>
      </div>
      <div class="map-legend">
        <span class="legend-dot" style="background:${SEVERITY_COLORS.red}"></span> Banning / Revocation
        <span class="legend-dot" style="background:${SEVERITY_COLORS.amber}"></span> Suspension / Refusal
        <span class="legend-dot" style="background:${SEVERITY_COLORS.slate}"></span> Compliance notice
      </div>
    </div>
    <div id="map-canvas" class="map-canvas" role="region" aria-label="Map of Australia"></div>
    <div class="map-leader">
      <h3>State leaderboard</h3>
      <table class="mini-table">
        <thead><tr><th>State</th><th class="num">Actions</th><th class="num">Per 100k</th><th>Top severity mix</th></tr></thead>
        <tbody>
          ${ctx.stats.state_leaderboard
            .map((s) => {
              const total = (s.severity_mix.red ?? 0) + (s.severity_mix.amber ?? 0) + (s.severity_mix.slate ?? 0);
              const widthRed = total ? ((s.severity_mix.red ?? 0) / total) * 100 : 0;
              const widthAmber = total ? ((s.severity_mix.amber ?? 0) / total) * 100 : 0;
              const widthSlate = total ? ((s.severity_mix.slate ?? 0) / total) * 100 : 0;
              return `
              <tr data-state="${s.state}">
                <td><strong>${escapeHtml(STATE_LABELS[s.state] ?? s.state)}</strong> <span class="muted">${s.state}</span></td>
                <td class="num mono">${fmtInt(s.count)}</td>
                <td class="num mono">${fmtNum(s.per_100k, 2)}</td>
                <td>
                  <div class="sev-bar" title="Red ${s.severity_mix.red ?? 0} · Amber ${s.severity_mix.amber ?? 0} · Slate ${s.severity_mix.slate ?? 0}">
                    <span style="width:${widthRed}%;background:${SEVERITY_COLORS.red}"></span>
                    <span style="width:${widthAmber}%;background:${SEVERITY_COLORS.amber}"></span>
                    <span style="width:${widthSlate}%;background:${SEVERITY_COLORS.slate}"></span>
                  </div>
                </td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  </section>`;

  const canvas = container.querySelector<HTMLDivElement>('#map-canvas');
  if (!canvas) return;
  canvas.innerHTML = '';

  mapInstance = L.map(canvas, {
    center: [-26.5, 134.5],
    zoom: 4,
    minZoom: 3,
    maxZoom: 8,
    zoomControl: true,
    scrollWheelZoom: false,
  });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(mapInstance);

  circleLayer = L.layerGroup().addTo(mapInstance);

  const max = Math.max(...ctx.stats.state_leaderboard.map((s) => s.count));
  for (const s of ctx.stats.state_leaderboard) {
    const center = STATE_CENTROIDS[s.state];
    if (!center) continue;
    const total = s.count;
    if (total === 0) continue;
    const dominant =
      (s.severity_mix.red ?? 0) >= (s.severity_mix.amber ?? 0) &&
      (s.severity_mix.red ?? 0) >= (s.severity_mix.slate ?? 0)
        ? 'red'
        : (s.severity_mix.amber ?? 0) >= (s.severity_mix.slate ?? 0)
          ? 'amber'
          : 'slate';
    const circle = L.circleMarker(center, {
      radius: radius(total, max),
      color: '#fff',
      weight: 2,
      fillColor: SEVERITY_COLORS[dominant],
      fillOpacity: 0.85,
    }).addTo(circleLayer);
    circle.bindTooltip(
      `<strong>${STATE_LABELS[s.state] ?? s.state}</strong><br/>` +
        `${fmtInt(s.count)} actions<br/>` +
        `${fmtNum(s.per_100k, 2)} per 100k`,
      { direction: 'top' },
    );
    circle.on('click', () => {
      const next = new Set(ctx.state.selectedStates);
      next.clear();
      next.add(s.state);
      ctx.setState({ selectedStates: next, view: 'browse' });
    });
  }

  container.querySelectorAll<HTMLElement>('tr[data-state]').forEach((row) => {
    row.addEventListener('click', () => {
      const code = row.dataset.state as ComplianceAction['state'];
      if (!code) return;
      const next = new Set(ctx.state.selectedStates);
      next.clear();
      next.add(code);
      ctx.setState({ selectedStates: next, view: 'browse' });
    });
  });
}
