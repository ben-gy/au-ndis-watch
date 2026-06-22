import type { DataMeta } from '../types';
import { escapeHtml, fmtDate, fmtInt } from '../utils/format';

export function openAbout(meta: DataMeta): void {
  const existing = document.getElementById('about-modal');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.id = 'about-modal';
  div.innerHTML = `
    <div class="modal-scrim" data-action="close"></div>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <header class="modal-head">
        <h2 id="about-title">About NDIS Watch (AU)</h2>
        <button class="modal-close" aria-label="Close" data-action="close">✕</button>
      </header>
      <div class="modal-body">
        <p>NDIS Watch makes the NDIS Quality and Safeguards Commission’s public <strong>Enforcement Register</strong> searchable, mappable, and explainable.</p>

        <h3>What you’re looking at</h3>
        <p>Every record on this site is a formal action the NDIS Commission has taken under the National Disability Insurance Scheme Act 2013 — banning orders, registration revocations, suspensions, refusals to re-register, compliance notices, and enforceable undertakings.</p>

        <h3>How to read the severity colours</h3>
        <ul>
          <li><strong style="color:#c1272d">Red</strong> — banning orders and revocations. Most serious; often permanent.</li>
          <li><strong style="color:#d97706">Amber</strong> — suspensions and refusals to re-register. Significant restriction, usually time-limited or contestable.</li>
          <li><strong style="color:#475569">Slate</strong> — compliance notices and enforceable undertakings. Correction expected; the most common action type.</li>
        </ul>

        <h3>Data source</h3>
        <p>
          ${escapeHtml(meta.dataset_title || 'NDIS Commission Compliance Actions')}<br/>
          Published by the NDIS Quality and Safeguards Commission via
          <a href="${escapeHtml(meta.csv_url)}" target="_blank" rel="noopener">data.gov.au</a>.
        </p>
        <dl class="kv">
          <div><dt>Records loaded</dt><dd class="mono">${fmtInt(meta.action_count ?? 0)}</dd></div>
          <div><dt>Dataset modified</dt><dd class="mono">${fmtDate(meta.dataset_modified ?? '')}</dd></div>
          <div><dt>Fetched</dt><dd class="mono">${fmtDate(meta.fetched_at ?? '')}</dd></div>
        </dl>

        <h3>How often the data refreshes</h3>
        <p>The Commission publishes an updated CSV roughly weekly. Our data pipeline checks data.gov.au for the latest dataset each Monday and republishes the site automatically.</p>

        <h3>Important caveats</h3>
        <ul>
          <li>An action against a person or company with a similar name to one you know <em>is not necessarily the same individual</em>. Always verify against the official register at <a href="https://www.ndiscommission.gov.au/about/regulatory-publications/compliance-and-enforcement-actions" target="_blank" rel="noopener">the NDIS Commission</a>.</li>
          <li>The dataset reflects published actions only. Investigations, complaints, and pending decisions are not included.</li>
          <li>“No longer in force” dates apply to time-limited actions (suspensions, fixed-term bans). Permanent banning orders have no end date.</li>
          <li>Registration-group classifications are derived from the raw "Registration Groups" field using substring matching — useful as a navigation aid, not as a legal classification.</li>
          <li>Per-100k rates use ABS Estimated Resident Population (June 2024), which is broader than the NDIS participant population.</li>
        </ul>

        <h3>Privacy and accuracy</h3>
        <p>All names and details on this site come directly from the NDIS Commission's public register, which the Commission is required to maintain under the NDIS Act. If you believe a record is inaccurate, contact the Commission directly — we re-mirror their data verbatim.</p>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  document.body.classList.add('modal-open');
  div.querySelectorAll<HTMLElement>('[data-action="close"]').forEach((el) => {
    el.addEventListener('click', closeAbout);
  });
  document.addEventListener('keydown', escClose);
}

function escClose(e: KeyboardEvent) {
  if (e.key === 'Escape') closeAbout();
}

function closeAbout() {
  const el = document.getElementById('about-modal');
  if (el) el.remove();
  document.body.classList.remove('modal-open');
  document.removeEventListener('keydown', escClose);
}
