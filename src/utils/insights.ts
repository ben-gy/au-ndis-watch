import type { ComplianceAction, Stats } from '../types';
import { STATE_LABELS } from './colors';

export type InsightSeverity = 'info' | 'warn' | 'alert';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  body: string;
  metric?: string;
}

const MS_DAY = 1000 * 60 * 60 * 24;

export function buildInsights(actions: ComplianceAction[], stats: Stats): Insight[] {
  const out: Insight[] = [];
  const now = new Date();

  // 1) Recent permanent bans (last 90 days)
  const ninetyAgo = new Date(now.getTime() - 90 * MS_DAY);
  const recentBans = actions.filter((a) => {
    if (a.type !== 'banning_order') return false;
    if (!a.effective_from) return false;
    const d = new Date(a.effective_from);
    return d >= ninetyAgo;
  });
  out.push({
    id: 'recent-bans',
    severity: 'alert',
    title: `${recentBans.length} banning ${recentBans.length === 1 ? 'order' : 'orders'} in the last 90 days`,
    body:
      recentBans.length > 0
        ? `Most recent: ${recentBans[0].name} (${recentBans[0].state ?? '—'}), effective ${recentBans[0].effective_from}. Use the Browse tab and filter to "Banning order" to see them all.`
        : 'No banning orders in the last 90 days.',
    metric: String(recentBans.length),
  });

  // 2) Year-over-year banning order change
  const bansLast = stats.last_12m_bans;
  const bansPrev = stats.prev_12m_bans;
  if (bansPrev > 0) {
    const change = ((bansLast - bansPrev) / bansPrev) * 100;
    const dir = change >= 0 ? 'up' : 'down';
    out.push({
      id: 'yoy-bans',
      severity: Math.abs(change) >= 40 ? 'warn' : 'info',
      title: `Banning orders ${dir} ${Math.abs(change).toFixed(0)}% year over year`,
      body: `${bansLast} banning orders in the last 12 months vs ${bansPrev} the year before.`,
      metric: `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`,
    });
  }

  // 3) Repeat-offender entities (3+ separate actions)
  const heavyRepeat = stats.repeat_entities.filter((e) => e.action_count >= 3);
  if (heavyRepeat.length > 0) {
    const top = heavyRepeat[0];
    out.push({
      id: 'repeat-offenders',
      severity: 'warn',
      title: `${heavyRepeat.length} ${heavyRepeat.length === 1 ? 'entity has' : 'entities have'} 3+ separate compliance actions`,
      body: `Top: ${top.name} (${top.action_count} actions). Click the "Repeat" view in the State or Insights panel for the full list.`,
      metric: String(heavyRepeat.length),
    });
  }

  // 4) State per-100k outliers
  const per100k = stats.state_leaderboard
    .filter((s) => s.population > 0)
    .map((s) => s.per_100k);
  if (per100k.length > 1) {
    const sorted = [...per100k].sort((a, b) => a - b);
    const mid = sorted.length / 2;
    const median =
      sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[Math.floor(mid)];
    const outliers = stats.state_leaderboard.filter(
      (s) => s.per_100k > 1.5 * median && s.population > 0,
    );
    if (outliers.length) {
      out.push({
        id: 'state-outlier',
        severity: 'info',
        title: `${outliers.length} ${outliers.length === 1 ? 'state has' : 'states have'} an enforcement rate >50% above the national median`,
        body: outliers
          .map((s) => `${STATE_LABELS[s.state] ?? s.state}: ${s.per_100k} per 100k`)
          .join('; '),
      });
    }
  }

  // 5) Surge month — busiest single month in the last 24
  const recentTimeline = stats.timeline.slice(-24);
  if (recentTimeline.length) {
    const monthly = recentTimeline.map((p) => ({
      month: p.month,
      total: Object.values(p.counts).reduce((a, b) => a + (b ?? 0), 0),
    }));
    const max = monthly.reduce((m, x) => (x.total > m.total ? x : m), monthly[0]);
    const avg = monthly.reduce((a, b) => a + b.total, 0) / monthly.length;
    if (max.total >= avg * 1.5 && max.total >= 30) {
      out.push({
        id: 'surge-month',
        severity: 'warn',
        title: `${max.total} actions in ${max.month} — a clear spike vs the trailing 24-month average of ${avg.toFixed(0)}`,
        body: 'Open the Timeline tab to see context for this month.',
        metric: String(max.total),
      });
    }
  }

  // 6) Group concentration — which service category dominates banning orders
  const banByCat: Record<string, number> = {};
  for (const a of actions) {
    if (a.type !== 'banning_order') continue;
    for (const c of a.group_categories) banByCat[c] = (banByCat[c] ?? 0) + 1;
  }
  const banCatRanked = Object.entries(banByCat).sort((a, b) => b[1] - a[1]);
  if (banCatRanked.length) {
    const [topCat, topCount] = banCatRanked[0];
    out.push({
      id: 'ban-concentration',
      severity: 'info',
      title: `Service category "${topCat.replace(/_/g, ' ')}" has the most banning orders`,
      body: `${topCount} banning orders mention this category. Cross-reference the Service Groups view for the full matrix.`,
    });
  }

  return out;
}
