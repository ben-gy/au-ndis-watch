import type { AppState, ComplianceAction } from '../types';
import { SEVERITY_COLORS } from '../utils/colors';
import { entityActions } from '../utils/filter';
import { escapeHtml, fmtDate, fmtInt } from '../utils/format';

interface DrillContext {
  actions: ComplianceAction[];
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

export function renderDrilldown(ctx: DrillContext, root: HTMLElement): void {
  const key = ctx.state.drilldownKey;
  if (!key) {
    root.innerHTML = '';
    document.body.classList.remove('drill-open');
    return;
  }
  const entityActs = entityActions(ctx.actions, key);
  if (!entityActs.length) {
    root.innerHTML = '';
    document.body.classList.remove('drill-open');
    return;
  }
  const head = entityActs[0];
  document.body.classList.add('drill-open');

  const byType: Record<string, number> = {};
  for (const a of entityActs) byType[a.type_label] = (byType[a.type_label] ?? 0) + 1;
  const typeChips = Object.entries(byType)
    .map(([t, n]) => `<span class="pill">${escapeHtml(t)} <span class="muted">×${n}</span></span>`)
    .join('');

  root.innerHTML = `
  <aside class="drilldown" role="dialog" aria-modal="false" aria-label="Entity details">
    <header class="drilldown-head">
      <div>
        <div class="drilldown-eyebrow">${head.is_person ? 'Person' : 'Organisation'}</div>
        <h2>${escapeHtml(head.name)}</h2>
        <div class="muted">
          ${head.state ? escapeHtml(head.state) : ''}
          ${head.city ? '· ' + escapeHtml(head.city) : ''}
          ${head.postcode ? '· ' + escapeHtml(head.postcode) : ''}
          ${head.abn ? '· ABN ' + escapeHtml(head.abn) : ''}
        </div>
      </div>
      <button class="drilldown-close" aria-label="Close" data-action="close">✕</button>
    </header>
    <div class="drilldown-summary">
      <div class="ds-stat">
        <div class="ds-label">Actions on record</div>
        <div class="ds-value mono" style="color:${SEVERITY_COLORS.red}">${fmtInt(entityActs.length)}</div>
      </div>
      <div class="ds-stat">
        <div class="ds-label">First action</div>
        <div class="ds-value mono">${fmtDate(entityActs[entityActs.length - 1].effective_from)}</div>
      </div>
      <div class="ds-stat">
        <div class="ds-label">Most recent</div>
        <div class="ds-value mono">${fmtDate(entityActs[0].effective_from)}</div>
      </div>
    </div>
    <div class="drilldown-types">${typeChips}</div>
    <ol class="drill-actions">
      ${entityActs
        .map(
          (a) => `
        <li class="drill-action" style="--sev:${SEVERITY_COLORS[a.severity]}">
          <div class="drill-action-head">
            <span class="drill-action-type" style="color:${SEVERITY_COLORS[a.severity]}">${escapeHtml(a.type_label)}</span>
            <span class="muted mono">${fmtDate(a.effective_from)}</span>
          </div>
          ${
            a.group_codes.length
              ? `<div class="drill-groups muted xs">${a.group_codes.map((g) => escapeHtml(g)).join(' · ')}</div>`
              : ''
          }
          ${a.narrative ? `<p class="drill-narrative">${escapeHtml(a.narrative)}</p>` : ''}
        </li>`,
        )
        .join('')}
    </ol>
    <footer class="drilldown-foot muted xs">
      Information taken from the NDIS Commission’s public Enforcement Register, published as open data on data.gov.au.
      Actions against a similarly-named person or company do not necessarily refer to the same individual.
    </footer>
  </aside>
  <div class="drilldown-scrim" data-action="close" aria-hidden="true"></div>
  `;

  root.querySelectorAll<HTMLElement>('[data-action="close"]').forEach((el) => {
    el.addEventListener('click', () => ctx.setState({ drilldownKey: null }));
  });

  document.addEventListener(
    'keydown',
    function esc(e) {
      if (e.key === 'Escape') {
        ctx.setState({ drilldownKey: null });
        document.removeEventListener('keydown', esc);
      }
    },
  );
}
