import { findTerm } from './glossary';
import { escapeHtml } from './utils/format';

let tipEl: HTMLDivElement | null = null;
let installed = false;

function ensureTooltip(): HTMLDivElement {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'glossary-tooltip';
    tipEl.setAttribute('role', 'tooltip');
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

function position(target: Element, tip: HTMLDivElement) {
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let top = rect.bottom + window.scrollY + 8;
  let left = rect.left + window.scrollX;
  if (left + tipRect.width > window.scrollX + window.innerWidth - 12) {
    left = window.scrollX + window.innerWidth - 12 - tipRect.width;
  }
  if (left < window.scrollX + 12) left = window.scrollX + 12;
  if (top + tipRect.height > window.scrollY + window.innerHeight - 8) {
    top = rect.top + window.scrollY - tipRect.height - 8;
  }
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

function show(target: Element) {
  const termId = (target as HTMLElement).dataset.term;
  if (!termId) return;
  const term = findTerm(termId);
  if (!term) return;
  const tip = ensureTooltip();
  tip.innerHTML = `
    <div class="glossary-tooltip-title">${escapeHtml(term.title)}</div>
    <div class="glossary-tooltip-body">${escapeHtml(term.body)}</div>
  `;
  tip.hidden = false;
  position(target, tip);
}

function hide() {
  if (tipEl) tipEl.hidden = true;
}

export function installGlossaryTooltips(root: HTMLElement = document.body): void {
  if (installed) return;
  installed = true;

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-term]') as HTMLElement | null;
    if (t) {
      e.preventDefault();
      e.stopPropagation();
      if (tipEl && !tipEl.hidden && tipEl.dataset.activeTerm === t.dataset.term) {
        tipEl.dataset.activeTerm = '';
        hide();
        return;
      }
      show(t);
      if (tipEl) tipEl.dataset.activeTerm = t.dataset.term ?? '';
      return;
    }
    if (tipEl && !tipEl.hidden) {
      const inside = tipEl.contains(e.target as Node);
      if (!inside) hide();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });

  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
}

export function termIcon(termId: string, label?: string): string {
  return `<button class="glossary-link" type="button" data-term="${termId}" aria-label="${
    label ? escapeHtml(label) : 'Show definition'
  }">${label ? escapeHtml(label) : 'ⓘ'}</button>`;
}
