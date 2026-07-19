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
//
// Why a native <dialog> rather than a positioned <div>:
// `showModal()` promotes the element to the **top layer**, which is the only
// way to be certain a product cannot break the overlay. A `position:fixed`
// overlay is positioned against the nearest ancestor with a transform, filter,
// backdrop-filter or `will-change` — several products animate a wrapper, which
// silently reparented the old overlay and left the scrim covering only part of
// the screen. The top layer escapes ancestor transforms, overflow clipping and
// z-index entirely, and `::backdrop` always paints the full viewport.

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

const PLACEHOLDER = {
  bug: 'The more specific, the easier it is to fix. What did you do, and what did you expect instead?',
  idea: 'What would make this more useful to you?',
} as const;

// Layout notes that are easy to regress:
//   - The dialog is pinned to the **visual** viewport (--fbw-vh / --fbw-top),
//     not the layout viewport. On iOS the layout viewport does not shrink when
//     the keyboard opens, so a `100dvh` panel puts Send underneath the keyboard.
//   - The panel is a flex column: only `.fbw-body` scrolls, so the title and
//     the Send button stay visible however long the message gets.
//   - On phones it is a bottom sheet — reachable with a thumb, and it grows
//     upward as the keyboard eats the bottom of the screen.
//   - Every horizontal box is `min-width:0` / `box-sizing:border-box`; the old
//     panel overflowed its own padding and clipped against the right edge.
const CSS = `
.fbw-slot{display:inline;white-space:nowrap}
.fbw-trigger{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px;opacity:.85}
.fbw-trigger:hover{opacity:1}
.fbw-trigger:focus-visible{outline:2px solid var(--accent,var(--primary,#2f6feb));outline-offset:3px;border-radius:3px}

.fbw-dialog{--fbw-bg:var(--surface,var(--bg,#fff));--fbw-fg:var(--text,var(--fg,#16181d));--fbw-line:var(--border,rgba(128,128,128,.3));--fbw-accent:var(--accent,var(--primary,#2f6feb));--fbw-radius:16px;position:fixed;left:0;right:0;top:var(--fbw-top,0px);width:100%;max-width:100%;height:var(--fbw-vh,100%);max-height:none;margin:0;padding:0;border:0;background:transparent;overflow:hidden;color:var(--fbw-fg);font:inherit;font-size:15px;line-height:1.5}
.fbw-dialog[open]{display:flex;align-items:center;justify-content:center}
.fbw-dialog::backdrop{background:rgba(8,10,14,.6)}

.fbw-panel{display:flex;flex-direction:column;width:min(31rem,100%);max-height:100%;min-height:0;background:var(--fbw-bg);border:1px solid var(--fbw-line);border-radius:var(--fbw-radius);box-shadow:0 24px 60px -12px rgba(0,0,0,.4),0 4px 12px rgba(0,0,0,.12);box-sizing:border-box;overflow:hidden}
.fbw-grab{display:none}

.fbw-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 20px 0;flex:0 0 auto}
.fbw-titles{min-width:0}
.fbw-title{margin:0;font-size:1.0625rem;font-weight:650;letter-spacing:-.01em}
.fbw-sub{margin:3px 0 0;opacity:.7;font-size:.85rem}
.fbw-close{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;margin:-6px -6px 0 0;background:none;border:0;border-radius:9px;color:inherit;opacity:.6;cursor:pointer}
.fbw-close:hover{opacity:1;background:color-mix(in srgb,currentColor 9%,transparent)}
.fbw-close svg{width:17px;height:17px;display:block}

.fbw-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:16px 20px 4px}

.fbw-kinds{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 16px;padding:0}
.fbw-kind{min-height:44px;padding:10px 12px;border:1px solid var(--fbw-line);border-radius:10px;background:none;color:inherit;font:inherit;font-size:.9rem;cursor:pointer;transition:border-color .12s,box-shadow .12s,background-color .12s}
.fbw-kind:hover{border-color:color-mix(in srgb,var(--fbw-accent) 45%,var(--fbw-line))}
.fbw-kind[aria-pressed="true"]{border-color:var(--fbw-accent);box-shadow:inset 0 0 0 1px var(--fbw-accent);background:color-mix(in srgb,var(--fbw-accent) 8%,transparent);font-weight:600}

.fbw-label{display:block;font-size:.85rem;opacity:.8;margin:0 0 6px}
.fbw-opt{opacity:.6;font-weight:400}
.fbw-field{display:block;width:100%;box-sizing:border-box;min-width:0;background:var(--fbw-bg);color:inherit;border:1px solid var(--fbw-line);border-radius:10px;padding:11px 12px;font:inherit;font-size:16px;margin:0 0 14px;transition:border-color .12s,box-shadow .12s}
.fbw-field::placeholder{color:currentColor;opacity:.45}
.fbw-field:focus{outline:0;border-color:var(--fbw-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--fbw-accent) 22%,transparent)}
textarea.fbw-field{min-height:7.5rem;resize:vertical}
.fbw-count{display:block;text-align:right;font-size:.72rem;opacity:.5;margin:-8px 0 12px;font-variant-numeric:tabular-nums}
.fbw-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}

.fbw-foot{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 20px calc(16px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--fbw-line);background:var(--fbw-bg)}
.fbw-note{font-size:.76rem;opacity:.6;margin:0;min-width:0}
.fbw-submit{flex:0 0 auto;min-height:44px;padding:11px 22px;border:0;border-radius:10px;background:var(--fbw-accent);color:#fff;font:inherit;font-size:.92rem;font-weight:600;cursor:pointer;transition:filter .12s}
.fbw-submit:hover{filter:brightness(1.07)}
.fbw-submit[disabled]{opacity:.55;cursor:default;filter:none}
.fbw-close:focus-visible,.fbw-kind:focus-visible,.fbw-submit:focus-visible{outline:2px solid var(--fbw-accent);outline-offset:2px}

.fbw-msg{margin:0 0 12px;font-size:.86rem}
.fbw-msg:empty{display:none}
.fbw-msg[data-tone="error"]{color:#d34a3a}
.fbw-done{padding:34px 24px calc(34px + env(safe-area-inset-bottom,0px));text-align:center}
.fbw-done-mark{width:46px;height:46px;margin:0 auto 14px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--fbw-accent) 14%,transparent);color:var(--fbw-accent)}
.fbw-done-mark svg{width:23px;height:23px}
.fbw-done h2{margin:0 0 6px;font-size:1.2rem;font-weight:650}
.fbw-done p{margin:0;opacity:.72;font-size:.9rem}
.fbw-done .fbw-submit{margin-top:20px}

@media (prefers-color-scheme:dark){
.fbw-dialog{--fbw-bg:var(--surface,var(--bg,#1a1c22));--fbw-fg:var(--text,var(--fg,#e9ecf1));--fbw-line:var(--border,rgba(160,160,170,.26))}
.fbw-dialog::backdrop{background:rgba(0,0,0,.68)}
.fbw-msg[data-tone="error"]{color:#ff8a7a}
}

/* Phones: bottom sheet. Full-bleed, thumb-reachable, and it rides the top of
   the keyboard because the dialog tracks the visual viewport. */
@media (max-width:560px){
.fbw-dialog[open]{align-items:flex-end}
.fbw-panel{width:100%;max-height:100%;border-radius:var(--fbw-radius) var(--fbw-radius) 0 0;border-bottom:0;box-shadow:0 -8px 40px rgba(0,0,0,.34)}
.fbw-grab{display:block;flex:0 0 auto;width:38px;height:4px;margin:8px auto 0;border-radius:99px;background:currentColor;opacity:.22}
.fbw-head{padding-top:12px}
.fbw-body{padding:14px 16px 4px}
.fbw-foot{padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px))}
.fbw-kinds{gap:8px}
.fbw-note{font-size:.72rem}
}

/* Very short viewports (landscape phone, or the keyboard taking most of the
   screen): drop the sub-heading rather than let the sheet outgrow the space. */
@media (max-height:420px){
.fbw-sub{display:none}
.fbw-head{padding-top:10px}
textarea.fbw-field{min-height:4.5rem}
.fbw-done{padding:20px}
}

@media (prefers-reduced-motion:no-preference){
.fbw-panel{animation:fbw-pop .18s cubic-bezier(.2,.8,.3,1)}
.fbw-dialog::backdrop{animation:fbw-fade .18s ease-out}
@keyframes fbw-pop{from{opacity:0;transform:translateY(8px) scale(.985)}}
@keyframes fbw-fade{from{opacity:0}}
@media (max-width:560px){.fbw-panel{animation:fbw-sheet .24s cubic-bezier(.2,.8,.3,1)}@keyframes fbw-sheet{from{transform:translateY(100%)}}}
}

/* Fallback for browsers without dialog.showModal(): no top layer, so paint our
   own scrim and pin above everything. */
.fbw-dialog.fbw-fallback{z-index:2147483000;background:rgba(8,10,14,.6)}
@media (prefers-color-scheme:dark){.fbw-dialog.fbw-fallback{background:rgba(0,0,0,.68)}}
`;

const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const ICON_TICK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

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

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
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

  const dialog = document.createElement('dialog');
  dialog.className = 'fbw-dialog';
  const modal = typeof dialog.showModal === 'function';
  if (!modal) dialog.classList.add('fbw-fallback');

  dialog.innerHTML = `
    <div class="fbw-panel" role="document">
      <div class="fbw-grab" aria-hidden="true"></div>
      <div class="fbw-head">
        <div class="fbw-titles">
          <h2 class="fbw-title" id="fbw-title">Send feedback</h2>
          <p class="fbw-sub">Goes straight to the person who built this. No account needed.</p>
        </div>
        <button type="button" class="fbw-close" aria-label="Close">${ICON_CLOSE}</button>
      </div>
      <div class="fbw-body">
        <div class="fbw-kinds" role="group" aria-label="Type of feedback">
          <button type="button" class="fbw-kind" data-kind="bug" aria-pressed="true">Something's broken</button>
          <button type="button" class="fbw-kind" data-kind="idea" aria-pressed="false">I have an idea</button>
        </div>
        <label class="fbw-label" for="fbw-message">What happened?</label>
        <textarea class="fbw-field" id="fbw-message" maxlength="${MAX_MESSAGE}"
          placeholder="${escapeHtml(PLACEHOLDER.bug)}"></textarea>
        <span class="fbw-count" aria-hidden="true"></span>
        <label class="fbw-label" for="fbw-email">Email <span class="fbw-opt">(optional — only if you want a reply)</span></label>
        <input class="fbw-field" id="fbw-email" type="email" autocomplete="email" placeholder="you@example.com">
        <input class="fbw-hp" tabindex="-1" aria-hidden="true" autocomplete="off" name="company">
        <p class="fbw-msg" role="status" aria-live="polite"></p>
      </div>
      <div class="fbw-foot">
        <p class="fbw-note">No cookies, no tracking.</p>
        <button type="button" class="fbw-submit">Send</button>
      </div>
    </div>`;

  dialog.setAttribute('aria-labelledby', 'fbw-title');

  const q = <T extends Element>(sel: string) => dialog.querySelector(sel) as T;
  const panel = q<HTMLElement>('.fbw-panel');
  const message = q<HTMLTextAreaElement>('#fbw-message');
  const email = q<HTMLInputElement>('#fbw-email');
  const honeypot = q<HTMLInputElement>('.fbw-hp');
  const submit = q<HTMLButtonElement>('.fbw-submit');
  const status = q<HTMLParagraphElement>('.fbw-msg');
  const count = q<HTMLElement>('.fbw-count');
  const kinds = Array.from(dialog.querySelectorAll<HTMLButtonElement>('.fbw-kind'));

  let kind: 'bug' | 'idea' = 'bug';
  kinds.forEach((btn) =>
    btn.addEventListener('click', () => {
      kind = btn.dataset.kind === 'idea' ? 'idea' : 'bug';
      kinds.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      message.setAttribute('placeholder', PLACEHOLDER[kind]);
      message.focus();
    }),
  );

  // Only worth showing as the limit gets close — a counter on an empty field is
  // noise.
  message.addEventListener('input', () => {
    const left = MAX_MESSAGE - message.value.length;
    count.textContent = left <= 300 ? `${left} characters left` : '';
  });

  // ── Viewport tracking ────────────────────────────────────────────
  // The dialog is sized to the *visual* viewport so the sheet sits on top of
  // the keyboard instead of behind it. Without this the Send button is
  // unreachable on iOS, which is exactly what the bug reports showed.
  const vv = window.visualViewport;
  function syncViewport(): void {
    if (!vv) return;
    dialog.style.setProperty('--fbw-vh', `${vv.height}px`);
    dialog.style.setProperty('--fbw-top', `${vv.offsetTop}px`);
  }
  syncViewport();
  vv?.addEventListener('resize', syncViewport);
  vv?.addEventListener('scroll', syncViewport);

  // ── Background scroll lock ───────────────────────────────────────
  // Keeps the page behind still while the sheet is up, and restores the exact
  // scroll position on close (iOS loses it otherwise).
  const scrollY = window.scrollY;
  const body = document.body;
  const prev = {
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    overflow: body.style.overflow,
  };
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.overflow = 'hidden';

  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    open = false;

    document.removeEventListener('keydown', onKey, true);
    vv?.removeEventListener('resize', syncViewport);
    vv?.removeEventListener('scroll', syncViewport);

    body.style.position = prev.position;
    body.style.top = prev.top;
    body.style.width = prev.width;
    body.style.overflow = prev.overflow;
    window.scrollTo(0, scrollY);

    if (modal && dialog.open) dialog.close();
    dialog.remove();
    // `preventScroll` so handing focus back cannot undo the scroll restore
    // above — focusing an off-screen trigger otherwise jumps the page.
    lastFocused?.focus?.({ preventScroll: true });
  }

  // Escape is handled here rather than left to the UA. `showModal()` is supposed
  // to fire `cancel` on Escape, but that is a user-agent "close request" and it
  // does not fire reliably everywhere — automation-driven keys never trigger it,
  // and embedded webviews vary. Closing on the keydown as well costs nothing:
  // `close()` is guarded, so whichever path fires first wins and the other is a
  // no-op. The Tab trap below is fallback-only — a real modal traps focus itself.
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (modal || event.key !== 'Tab') return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>('button, textarea, input:not([tabindex="-1"]), a[href]'),
    ).filter((el) => !el.hasAttribute('disabled'));
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
          <div class="fbw-done-mark">${ICON_TICK}</div>
          <h2>Thank you</h2>
          <p>${
            kind === 'bug'
              ? 'This gets looked at within a day.'
              : 'Good ideas do get built — this one is now on the list.'
          }</p>
          <button type="button" class="fbw-submit fbw-dismiss">Close</button>
        </div>`;
        const dismiss = panel.querySelector<HTMLButtonElement>('.fbw-dismiss');
        dismiss?.addEventListener('click', close);
        dismiss?.focus();
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

  // Click-outside: the dialog element itself is the full-viewport container, so
  // an event landing on it (rather than on the panel) is on the scrim.
  //
  // Both ends of the click have to land on the scrim. Closing on `mousedown`
  // alone loses a text selection that starts inside the message box and is
  // dragged past the panel edge, and it also drops focus — the `click` that
  // follows the teardown lands on <body> and steals it back from the trigger.
  let pressedOnScrim = false;
  dialog.addEventListener('mousedown', (event) => {
    pressedOnScrim = event.target === dialog;
  });
  dialog.addEventListener('click', (event) => {
    if (pressedOnScrim && event.target === dialog) close();
    pressedOnScrim = false;
  });
  // Escape reaches the dialog as `cancel`; route it through our own teardown so
  // the scroll lock is always released.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  document.addEventListener('keydown', onKey, true);

  document.body.appendChild(dialog);
  if (modal) dialog.showModal();
  else dialog.setAttribute('open', '');

  // Focusing the textarea directly would pop the keyboard over the sheet before
  // it has finished animating in; the panel takes focus and the user taps in.
  message.focus({ preventScroll: true });
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

export const _internal = { CSS, ENDPOINT, MIN_MESSAGE, MAX_MESSAGE, PLACEHOLDER, context };
