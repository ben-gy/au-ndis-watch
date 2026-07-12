import './styles.css';
import 'leaflet/dist/leaflet.css';

import { loadAllData } from './data';
import { renderBrowse } from './views/browse';
import { renderInsights } from './views/insights';
import { renderMap } from './views/map';
import { renderStates } from './views/states';
import { renderTimeline } from './views/timeline';
import { renderTypes } from './views/types';
import { renderGroups } from './views/groups';
import { renderHeader, renderFooter } from './components/shell';
import { renderDrilldown } from './components/drilldown';
import { installGlossaryTooltips } from './glossary-tooltip';
import { initTooltip } from './tooltip';
import { createInitialState, parseHash, writeHash } from './state';
import type { AppState, ComplianceAction, DataMeta, Stats, ViewKey } from './types';

interface AppContext {
  actions: ComplianceAction[];
  stats: Stats;
  meta: DataMeta;
  state: AppState;
  setState: (next: Partial<AppState>) => void;
}

const app = document.getElementById('app');
if (!app) throw new Error('Root element #app not found');

app.innerHTML = `
  <div id="header"></div>
  <main id="main-content" class="main-content"></main>
  <div id="drilldown-root"></div>
  <div id="footer"></div>
`;

const headerEl = app.querySelector<HTMLElement>('#header')!;
const mainEl = app.querySelector<HTMLElement>('#main-content')!;
const drillEl = app.querySelector<HTMLElement>('#drilldown-root')!;
const footerEl = app.querySelector<HTMLElement>('#footer')!;

mainEl.innerHTML = `
  <div class="loading-screen">
    <div class="loading-spinner" aria-hidden="true"></div>
    <p>Loading NDIS Commission enforcement register…</p>
  </div>
`;

installGlossaryTooltips(document.body);
initTooltip();

async function bootstrap() {
  let actions: ComplianceAction[];
  let stats: Stats;
  let meta: DataMeta;
  try {
    const data = await loadAllData();
    actions = data.actions;
    stats = data.stats;
    meta = data.meta;
  } catch (err) {
    mainEl.innerHTML = `
      <div class="error-screen">
        <h2>Could not load data</h2>
        <p>${(err as Error).message}</p>
        <p>Please try refreshing the page. If the problem persists, the data files may be temporarily unavailable.</p>
      </div>`;
    return;
  }

  let state = parseHash(location.hash, createInitialState());

  function setState(next: Partial<AppState>) {
    state = { ...state, ...next };
    writeHash(state);
    render();
  }

  const ctx: AppContext = {
    actions,
    stats,
    meta,
    get state() {
      return state;
    },
    setState,
  };

  function render() {
    renderHeader(ctx, headerEl);
    renderFooter(ctx, footerEl);
    const view: ViewKey = state.view;
    switch (view) {
      case 'browse':
        renderBrowse(ctx, mainEl);
        break;
      case 'map':
        renderMap(ctx, mainEl);
        break;
      case 'timeline':
        renderTimeline(ctx, mainEl);
        break;
      case 'types':
        renderTypes(ctx, mainEl);
        break;
      case 'states':
        renderStates(ctx, mainEl);
        break;
      case 'groups':
        renderGroups(ctx, mainEl);
        break;
      case 'insights':
        renderInsights(ctx, mainEl);
        break;
      default:
        renderBrowse(ctx, mainEl);
    }
    renderDrilldown(ctx, drillEl);
    mainEl.scrollTop = 0;
  }

  window.addEventListener('hashchange', () => {
    state = parseHash(location.hash, state);
    render();
  });

  render();
}

bootstrap();
