// Feedback widget — MANAGED FILE, do not edit here.
//
// Canonical source: gh-feedback/widget/feedback.ts
// Rolled out by hub/scripts/feedback/backfill.mjs. Local edits are overwritten
// on the next run; change the canonical file instead.

// Feedback widget — canonical source.
//
// Ships into every product in the factory network. Copies live at:
//   gh-site-factory/patterns/feedback.ts
//   gh-tool-factory/patterns/feedback.ts
//   gh-game-factory/patterns/feedback.ts
//   gh-game-engine/src/feedback.ts
// Edit HERE, then re-run hub/scripts/feedback/backfill.mjs to redistribute.
//
// Constraints it has to satisfy across ~80 products:
//   - zero dependencies, no build-time config
//   - safe under `default-src 'self'; style-src 'self' 'unsafe-inline'`
//   - class names prefixed `fbw-` so they cannot collide with product CSS
//   - inherits product theming through CSS custom properties, with standalone
//     light/dark fallbacks for products that define none

const ENDPOINT = 'https://feedback.benrichardson.dev/submit';
const STYLE_ID = 'fbw-style';
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 4000;

export interface FeedbackOptions {
  /** Where to append the trigger button. Defaults to the site footer. */
  mount?: Element | null;
  /** Trigger label. */
  label?: string;
  /** Free-form build/version string, forwarded as context on every report. */
  build?: string;
  /** Override for local testing. */
  endpoint?: string;
  /**
   * Element to hand focus back to on close. Worth passing explicitly: clicking
   * a button does not focus it in Safari or Firefox, so `document.activeElement`
   * at open time is often `<body>` and focus would otherwise be dropped.
   */
  returnFocusTo?: HTMLElement | null;
}

const CSS = `
.fbw-slot{display:inline;white-space:nowrap}
.fbw-trigger{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px;opacity:.85}
.fbw-trigger:hover{opacity:1}
.fbw-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55);overscroll-behavior:contain}
.fbw-panel{--fbw-bg:var(--surface,var(--bg,#fff));--fbw-fg:var(--text,var(--fg,#16181d));--fbw-line:var(--border,rgba(128,128,128,.34));--fbw-accent:var(--accent,var(--primary,#2f6feb));width:min(30rem,100%);max-height:min(90vh,40rem);overflow:auto;background:var(--fbw-bg);color:var(--fbw-fg);border:1px solid var(--fbw-line);border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.32);padding:20px;font:inherit;font-size:15px;line-height:1.5;box-sizing:border-box}
.fbw-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 4px}
.fbw-title{margin:0;font-size:1.05rem;font-weight:650}
.fbw-close{background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:inherit;opacity:.6;padding:2px 6px;border-radius:6px}
.fbw-close:hover{opacity:1}
.fbw-sub{margin:0 0 14px;opacity:.72;font-size:.88rem}
.fbw-kinds{display:flex;gap:8px;margin-bottom:12px}
.fbw-kind{flex:1;padding:9px 10px;border:1px solid var(--fbw-line);border-radius:8px;background:none;color:inherit;font:inherit;font-size:.9rem;cursor:pointer}
.fbw-kind[aria-pressed="true"]{border-color:var(--fbw-accent);box-shadow:inset 0 0 0 1px var(--fbw-accent);font-weight:600}
.fbw-label{display:block;font-size:.85rem;opacity:.8;margin:0 0 5px}
.fbw-field{width:100%;box-sizing:border-box;background:var(--fbw-bg);color:inherit;border:1px solid var(--fbw-line);border-radius:8px;padding:9px 10px;font:inherit;font-size:.92rem;margin-bottom:12px}
.fbw-field:focus-visible{outline:2px solid var(--fbw-accent);outline-offset:1px}
textarea.fbw-field{min-height:8.5rem;resize:vertical}
.fbw-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.fbw-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px}
.fbw-note{font-size:.78rem;opacity:.62;margin:0}
.fbw-submit{padding:9px 18px;border:0;border-radius:8px;background:var(--fbw-accent);color:#fff;font:inherit;font-size:.92rem;font-weight:600;cursor:pointer}
.fbw-submit[disabled]{opacity:.55;cursor:default}
.fbw-msg{margin:12px 0 0;font-size:.88rem}
.fbw-msg[data-tone="error"]{color:#c0392b}
.fbw-done{text-align:center;padding:26px 8px}
.fbw-done p{margin:0 0 6px}
@media (prefers-color-scheme:dark){.fbw-panel{--fbw-bg:var(--surface,var(--bg,#1a1c22));--fbw-fg:var(--text,var(--fg,#e9ecf1))}}
@media (max-width:480px){.fbw-panel{padding:16px}.fbw-kinds{flex-direction:column}}
@media (prefers-reduced-motion:no-preference){.fbw-panel{animation:fbw-in .16s ease-out}@keyframes fbw-in{from{opacity:0;transform:translateY(6px)}}}
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

function context(build?: string): Record<string, string> {
  const ctx: Record<string, string> = {
    url: location.href.slice(0, 500),
    ua: navigator.userAgent.slice(0, 300),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    lang: navigator.language || '',
  };
  if (build) ctx.build = build;
  return ctx;
}

let open = false;

/** Open the feedback dialog directly — useful where there is no visible footer. */
export function openFeedback(options: FeedbackOptions = {}): void {
  if (open) return;
  open = true;
  injectStyle();

  const endpoint = options.endpoint ?? ENDPOINT;
  const opened = Date.now();
  const lastFocused = options.returnFocusTo ?? (document.activeElement as HTMLElement | null);

  const overlay = document.createElement('div');
  overlay.className = 'fbw-overlay';
  overlay.innerHTML = `
    <div class="fbw-panel" role="dialog" aria-modal="true" aria-labelledby="fbw-title">
      <div class="fbw-head">
        <h2 class="fbw-title" id="fbw-title">Send feedback</h2>
        <button type="button" class="fbw-close" aria-label="Close">&times;</button>
      </div>
      <p class="fbw-sub">Goes straight to the person who built this. No account needed.</p>
      <div class="fbw-kinds" role="group" aria-label="Type of feedback">
        <button type="button" class="fbw-kind" data-kind="bug" aria-pressed="true">Something's broken</button>
        <button type="button" class="fbw-kind" data-kind="idea" aria-pressed="false">I have an idea</button>
      </div>
      <label class="fbw-label" for="fbw-message">What happened?</label>
      <textarea class="fbw-field" id="fbw-message" maxlength="${MAX_MESSAGE}"
        placeholder="The more specific, the easier it is to fix. What did you do, and what did you expect instead?"></textarea>
      <label class="fbw-label" for="fbw-email">Email <span style="opacity:.6">(optional — only if you want a reply)</span></label>
      <input class="fbw-field" id="fbw-email" type="email" autocomplete="email" placeholder="you@example.com">
      <input class="fbw-hp" tabindex="-1" aria-hidden="true" autocomplete="off" name="company">
      <div class="fbw-foot">
        <p class="fbw-note">No cookies, no tracking.</p>
        <button type="button" class="fbw-submit">Send</button>
      </div>
      <p class="fbw-msg" role="status" aria-live="polite"></p>
    </div>`;

  const q = <T extends Element>(sel: string) => overlay.querySelector(sel) as T;
  const panel = q<HTMLElement>('.fbw-panel');
  const message = q<HTMLTextAreaElement>('#fbw-message');
  const email = q<HTMLInputElement>('#fbw-email');
  const honeypot = q<HTMLInputElement>('.fbw-hp');
  const submit = q<HTMLButtonElement>('.fbw-submit');
  const status = q<HTMLParagraphElement>('.fbw-msg');
  const kinds = Array.from(overlay.querySelectorAll<HTMLButtonElement>('.fbw-kind'));

  let kind: 'bug' | 'idea' = 'bug';
  kinds.forEach((btn) =>
    btn.addEventListener('click', () => {
      kind = btn.dataset.kind === 'idea' ? 'idea' : 'bug';
      kinds.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      message.setAttribute(
        'placeholder',
        kind === 'bug'
          ? 'The more specific, the easier it is to fix. What did you do, and what did you expect instead?'
          : 'What would make this more useful to you?',
      );
    }),
  );

  function close(): void {
    if (!open) return;
    open = false;
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    lastFocused?.focus?.();
  }

  // Focus trap: a product's own UI must not be tabbable behind the dialog.
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, textarea, input:not([tabindex="-1"]), a[href]',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function setStatus(text: string, tone: 'error' | 'info' = 'info'): void {
    status.textContent = text;
    status.dataset.tone = tone;
  }

  async function send(): Promise<void> {
    const text = message.value.trim();
    if (text.length < MIN_MESSAGE) {
      setStatus(`Please add a bit more detail (at least ${MIN_MESSAGE} characters).`, 'error');
      message.focus();
      return;
    }

    submit.disabled = true;
    setStatus('Sending…');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          message: text,
          email: email.value.trim() || null,
          dwell: Date.now() - opened,
          hp: honeypot.value,
          context: context(options.build),
        }),
      });

      if (res.ok) {
        panel.innerHTML = `<div class="fbw-done">
          <p style="font-size:1.6rem">Thank you</p>
          <p style="opacity:.75">${
            kind === 'bug'
              ? 'This gets looked at within a day.'
              : 'Good ideas do get built — this one is now on the list.'
          }</p>
          <p style="margin-top:16px"><button type="button" class="fbw-submit fbw-dismiss">Close</button></p>
        </div>`;
        panel.querySelector<HTMLButtonElement>('.fbw-dismiss')?.addEventListener('click', close);
        panel.querySelector<HTMLButtonElement>('.fbw-dismiss')?.focus();
        return;
      }

      const detail = (await res.json().catch(() => null)) as { error?: string } | null;
      setStatus(
        res.status === 429
          ? 'That is a lot of feedback in one go — please try again a little later.'
          : detail?.error
            ? `Could not send: ${detail.error}`
            : 'Could not send that. Please try again in a moment.',
        'error',
      );
    } catch {
      setStatus('Could not reach the server. Check your connection and try again.', 'error');
    } finally {
      submit.disabled = false;
    }
  }

  submit.addEventListener('click', send);
  // Ctrl/Cmd+Enter submits, matching the convention in the rest of the catalog.
  message.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') send();
  });
  q<HTMLButtonElement>('.fbw-close').addEventListener('click', close);
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener('keydown', onKey, true);

  document.body.appendChild(overlay);
  message.focus();
}

const FOOTER_SELECTORS = ['.site-footer', 'footer'];
const WAIT_FOR_FOOTER_MS = 15_000;

/**
 * The deepest element that still contains the whole "Built by …" run.
 *
 * Anchoring to the attribution rather than to the footer container is what
 * keeps this correct across the catalog's very different footers. Several
 * products use a flex `space-between` status bar as their footer, where
 * appending to the container makes the trigger its own justified slot at the
 * far end — visually divorced from the text it belongs to.
 */
function findAttribution(root: Element): Element | null {
  let best: Element | null = null;
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (!/built by/i.test(el.textContent ?? '')) continue;
    if (!best || best.contains(el)) best = el;
  }
  return best;
}

function findHost(explicit?: Element | null): { host: Element; inline: boolean } | null {
  if (explicit) return { host: explicit, inline: true };

  for (const selector of FOOTER_SELECTORS) {
    const footer = document.querySelector(selector);
    if (!footer) continue;

    const attribution = findAttribution(footer);
    if (attribution) return { host: attribution, inline: true };

    const inner = footer.querySelector('.footer-inner');
    if (inner) return { host: inner, inline: true };

    // Last resort: the footer itself. Not inline — a leading separator here
    // would strand a floating "·" in a flex layout.
    return { host: footer, inline: false };
  }
  return null;
}

function attach(host: Element, inline: boolean, options: FeedbackOptions): void {
  if (host.querySelector('.fbw-trigger')) return;

  injectStyle();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fbw-trigger';
  button.textContent = options.label ?? 'Feedback';
  button.addEventListener('click', () => openFeedback({ ...options, returnFocusTo: button }));

  // One wrapper element, never a loose text node: a bare separator appended to
  // a flex container becomes its own flex item and drifts away from the button.
  const slot = document.createElement('span');
  slot.className = 'fbw-slot';
  if (inline && host.childNodes.length) slot.appendChild(document.createTextNode(' · '));
  slot.appendChild(button);
  host.appendChild(slot);
}

/**
 * Add a "Feedback" trigger to the page, in the footer by default.
 *
 * Products across the catalog build their footer in wildly different ways —
 * static markup in `index.html`, an `innerHTML` assignment during boot, a
 * re-render on every view change. So this does not assume the footer exists
 * yet: if it is missing, it watches for it and attaches as soon as it appears,
 * then stops watching. That makes the call safe from anywhere in startup.
 *
 * Games hide `.site-footer` mid-round via `body.playing`. The footer returns on
 * the menu, lobby and results screens, so the trigger is reachable there — but
 * wiring `openFeedback()` into the results screen too is worthwhile, since that
 * is when a player is most likely to want it.
 */
export function mountFeedback(options: FeedbackOptions = {}): void {
  const found = findHost(options.mount);
  if (found) {
    attach(found.host, found.inline, options);
    return;
  }

  if (typeof MutationObserver === 'undefined') return;

  const observer = new MutationObserver(() => {
    const late = findHost(options.mount);
    if (!late) return;
    observer.disconnect();
    clearTimeout(timer);
    attach(late.host, late.inline, options);
  });

  // Give up eventually rather than observing the document forever on a product
  // that genuinely has no footer.
  const timer = setTimeout(() => observer.disconnect(), WAIT_FOR_FOOTER_MS);
  observer.observe(document.body ?? document.documentElement, {
    childList: true,
    subtree: true,
  });
}

export const _internal = { CSS, ENDPOINT, MIN_MESSAGE, context };
