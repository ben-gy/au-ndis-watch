// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
const NF = new Intl.NumberFormat('en-AU');

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return NF.format(Math.round(n));
}

export function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-AU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const year = m[1];
  const month = MONTHS[Math.max(0, Math.min(11, parseInt(m[2], 10) - 1))];
  const day = parseInt(m[3], 10);
  return `${day} ${month} ${year}`;
}

export function fmtMonth(ym: string | null | undefined): string {
  if (!ym) return '—';
  const m = ym.match(/^(\d{4})-(\d{2})/);
  if (!m) return ym;
  return `${MONTHS[Math.max(0, Math.min(11, parseInt(m[2], 10) - 1))]} ${m[1]}`;
}

export function ageInDays(iso: string | null | undefined, ref = new Date()): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeAge(iso: string | null | undefined, ref = new Date()): string {
  const d = ageInDays(iso, ref);
  if (d === null) return '—';
  if (d < 1) return 'today';
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  const years = (d / 365).toFixed(1);
  return `${years}y ago`;
}

export function escapeHtml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(s: string, max: number): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

export function pluralise(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}
