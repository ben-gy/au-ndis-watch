import type { AppState, DataMeta, Stats, ViewKey } from '../types';
import { fmtInt } from '../utils/format';
import { openAbout } from './about';

const VIEW_DEFS: { key: ViewKey; label: string; subtitle?: string }[] = [
  { key: 'browse', label: 'Browse' },
  { key: 'map', label: 'Map' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'types', label: 'Types' },
  { key: 'states', label: 'States' },
  { key: 'groups', label: 'Service groups' },
  { key: 'insights', label: 'Insights' },
];

interface ShellContext {
  state: AppState;
  stats: Stats;
  meta: DataMeta;
  setState: (next: Partial<AppState>) => void;
}

export function renderHeader(ctx: ShellContext, root: HTMLElement): void {
  root.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#" data-action="home">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3 L20 7 V13 C20 17 16.5 20 12 21 C7.5 20 4 17 4 13 V7 Z"/>
              <circle cx="12" cy="12" r="2.4" fill="currentColor"/>
            </svg>
          </span>
          <span class="brand-name">NDIS Watch <span class="brand-region">(AU)</span></span>
        </a>
        <nav class="tabs" aria-label="Views">
          ${VIEW_DEFS.map(
            (v) => `
            <button class="tab ${ctx.state.view === v.key ? 'tab-on' : ''}" data-view="${v.key}">${v.label}</button>`,
          ).join('')}
        </nav>
        <div class="header-meta">
          <span class="count-pill" data-tip="Total actions loaded" aria-label="Total actions loaded">${fmtInt(ctx.stats.total_actions)} actions</span>
          <button class="btn-icon" data-action="about" aria-label="About this site">?</button>
        </div>
      </div>
    </header>
  `;
  root.querySelectorAll<HTMLElement>('[data-view]').forEach((el) => {
    el.addEventListener('click', () => {
      const v = el.dataset.view as ViewKey | undefined;
      if (v) ctx.setState({ view: v });
    });
  });
  const homeLink = root.querySelector<HTMLElement>('[data-action="home"]');
  if (homeLink) {
    homeLink.addEventListener('click', (e) => {
      e.preventDefault();
      ctx.setState({ view: 'browse' });
    });
  }
  const aboutBtn = root.querySelector<HTMLElement>('[data-action="about"]');
  if (aboutBtn) aboutBtn.addEventListener('click', () => openAbout(ctx.meta));
}

export function renderFooter(ctx: ShellContext, root: HTMLElement): void {
  const updated = ctx.meta.aggregated_at || ctx.meta.fetched_at;
  const year = new Date().getFullYear();
  root.innerHTML = `
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <strong>NDIS Watch (AU)</strong> · ${fmtInt(ctx.stats.total_actions)} compliance actions from the NDIS Commission Enforcement Register
        </div>
        <div class="muted">
          Data: <a href="${ctx.meta.csv_url}" target="_blank" rel="noopener">data.gov.au</a> · Last refresh ${
            updated ? new Date(updated).toISOString().slice(0, 10) : '—'
          } · Built by <a href="https://benrichardson.dev/" target="_blank" rel="noopener">benrichardson.dev</a> · <a href="https://sites.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a>
        </div>
      </div>
    </footer>
  `;
  void year;
}
