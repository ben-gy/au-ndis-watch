// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Parse the raw NDIS Commission Compliance Actions CSV and emit normalised
// JSON for the frontend.
//
// Inputs: pipeline/raw/source.csv, pipeline/raw/source.meta.json
//   (collect.mjs writes these; falls back to ./source.csv at repo root for
//    initial build)
// Outputs: public/data/actions.json, public/data/stats.json,
//          public/data/meta.json

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCsv } from './lib/csv.mjs';
import { normaliseActionType, severityFor } from './lib/types.mjs';
import { classifyRegistrationGroups } from './lib/groups.mjs';
import { STATE_POPULATIONS } from './lib/population.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const OUT_DIR = resolve(REPO_ROOT, 'public', 'data');

const RAW_CSV_CANDIDATES = [
  resolve(HERE, 'raw', 'source.csv'),
  resolve(REPO_ROOT, 'source.csv'),
];
const META_PATH = resolve(HERE, 'raw', 'source.meta.json');

function entityKey(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function ymd(iso) {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function ym(iso) {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function squashWhitespace(s) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

function isPersonName(name) {
  return /,/.test(name) && !/\b(pty|ltd|inc|limited|services|group|foundation|association|trust|co\.)\b/i.test(name);
}

async function loadRawCsv() {
  for (const candidate of RAW_CSV_CANDIDATES) {
    if (existsSync(candidate)) {
      const csv = await readFile(candidate, 'utf8');
      return { csv, path: candidate };
    }
  }
  throw new Error(
    `No source CSV found. Run \`node pipeline/collect.mjs\` first, or place one at ${RAW_CSV_CANDIDATES.join(' or ')}`,
  );
}

async function loadMeta() {
  if (existsSync(META_PATH)) {
    return JSON.parse(await readFile(META_PATH, 'utf8'));
  }
  return null;
}

async function main() {
  const { csv, path: csvPath } = await loadRawCsv();
  console.log(`Reading ${csvPath} (${csv.length} chars)`);
  const rows = parseCsv(csv);
  console.log(`Parsed ${rows.length} rows`);

  const actions = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawType = squashWhitespace(row['Type']);
    if (!rawType) continue;
    const name = squashWhitespace(row['Name']);
    if (!name) continue;

    const typeInfo = normaliseActionType(rawType);
    const groupsRaw = squashWhitespace(row['Registration Groups']);
    const groupCodes = groupsRaw
      .split(/[,;]/)
      .map((g) => g.trim())
      .filter(Boolean);
    const groupCategories = classifyRegistrationGroups(groupCodes);
    const narrative = squashWhitespace(row['Relevant information']);
    const ABN = squashWhitespace(row['ABN']);
    const otherInfo = squashWhitespace(row['Other relevant info']);
    const stateRaw = squashWhitespace(row['State']).toUpperCase();
    const state = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].includes(stateRaw)
      ? stateRaw
      : null;

    actions.push({
      id: i + 1,
      raw_type: rawType,
      type: typeInfo.normalised,
      type_label: typeInfo.label,
      severity: severityFor(typeInfo.normalised),
      effective_from: ymd(row['Date effective from']) ?? null,
      effective_from_ym: ym(row['Date effective from']) ?? null,
      no_longer_in_force: ymd(row['Date no longer in force']) ?? null,
      name,
      is_person: isPersonName(name),
      key: entityKey(name),
      abn: ABN || null,
      city: squashWhitespace(row['City']) || null,
      state,
      postcode: squashWhitespace(row['Postcode']) || null,
      provider_number: squashWhitespace(row['Provider Number']) || null,
      other_info: otherInfo || null,
      group_codes: groupCodes,
      group_categories: groupCategories,
      narrative,
    });
  }

  actions.sort((a, b) => (b.effective_from ?? '').localeCompare(a.effective_from ?? ''));

  const byType = {};
  const byState = {};
  const byMonth = {};
  const bySeverityState = {};
  const groupCountByType = {};
  const entityCounts = new Map();
  const groupCountTotal = {};

  for (const a of actions) {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
    if (a.state) {
      byState[a.state] = (byState[a.state] ?? 0) + 1;
      bySeverityState[a.state] = bySeverityState[a.state] ?? {};
      bySeverityState[a.state][a.severity] = (bySeverityState[a.state][a.severity] ?? 0) + 1;
    }
    if (a.effective_from_ym) {
      byMonth[a.effective_from_ym] = byMonth[a.effective_from_ym] ?? {};
      byMonth[a.effective_from_ym][a.type] = (byMonth[a.effective_from_ym][a.type] ?? 0) + 1;
    }
    for (const cat of a.group_categories) {
      groupCountTotal[cat] = (groupCountTotal[cat] ?? 0) + 1;
      groupCountByType[cat] = groupCountByType[cat] ?? {};
      groupCountByType[cat][a.type] = (groupCountByType[cat][a.type] ?? 0) + 1;
    }
    const e = entityCounts.get(a.key) ?? {
      key: a.key,
      name: a.name,
      is_person: a.is_person,
      state: a.state,
      count: 0,
      types: new Set(),
      first: a.effective_from,
      last: a.effective_from,
    };
    e.count += 1;
    e.types.add(a.type);
    if (a.effective_from) {
      if (!e.first || a.effective_from < e.first) e.first = a.effective_from;
      if (!e.last || a.effective_from > e.last) e.last = a.effective_from;
    }
    entityCounts.set(a.key, e);
  }

  const repeatEntities = [...entityCounts.values()]
    .filter((e) => e.count > 1)
    .map((e) => ({
      key: e.key,
      name: e.name,
      is_person: e.is_person,
      state: e.state,
      action_count: e.count,
      action_types: [...e.types],
      first_action: e.first,
      last_action: e.last,
    }))
    .sort((a, b) => b.action_count - a.action_count);

  const stateLeaderboard = Object.entries(byState)
    .map(([state, count]) => ({
      state,
      count,
      population: STATE_POPULATIONS[state] ?? 0,
      per_100k:
        STATE_POPULATIONS[state]
          ? +((count / STATE_POPULATIONS[state]) * 100000).toFixed(2)
          : 0,
      severity_mix: bySeverityState[state] ?? {},
    }))
    .sort((a, b) => b.per_100k - a.per_100k);

  const months = Object.keys(byMonth).sort();
  const timeline = months.map((m) => ({ month: m, counts: byMonth[m] }));

  const totalsBySeverity = { red: 0, amber: 0, slate: 0 };
  for (const a of actions) totalsBySeverity[a.severity] = (totalsBySeverity[a.severity] ?? 0) + 1;

  let last12mCount = 0;
  let last12mBans = 0;
  let prev12mBans = 0;
  const now = new Date();
  const last12Start = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
  const prev12Start = new Date(now.getTime() - 2 * 365 * 24 * 3600 * 1000);
  for (const a of actions) {
    if (!a.effective_from) continue;
    const d = new Date(a.effective_from);
    if (d >= last12Start) {
      last12mCount += 1;
      if (a.type === 'banning_order') last12mBans += 1;
    } else if (d >= prev12Start) {
      if (a.type === 'banning_order') prev12mBans += 1;
    }
  }

  const stats = {
    total_actions: actions.length,
    total_entities: entityCounts.size,
    repeat_entities_count: repeatEntities.filter((e) => e.action_count >= 2).length,
    by_type: byType,
    by_state: byState,
    by_severity: totalsBySeverity,
    state_leaderboard: stateLeaderboard,
    timeline,
    repeat_entities: repeatEntities.slice(0, 50),
    group_totals: Object.entries(groupCountTotal)
      .map(([cat, count]) => ({ category: cat, count }))
      .sort((a, b) => b.count - a.count),
    group_by_type: groupCountByType,
    last_12m_actions: last12mCount,
    last_12m_bans: last12mBans,
    prev_12m_bans: prev12mBans,
    earliest_action: actions[actions.length - 1]?.effective_from ?? null,
    latest_action: actions[0]?.effective_from ?? null,
  };

  const meta = (await loadMeta()) ?? {
    fetched_at: new Date().toISOString(),
    dataset_name: 'ndis-commission-compliance-actions (embedded snapshot)',
    dataset_title: 'NDIS Commission Compliance Actions',
    dataset_modified: actions[0]?.effective_from ?? null,
    csv_url: 'https://data.gov.au/data/dataset/ndis-commission-provider-register-part-2',
    csv_bytes: csv.length,
  };
  meta.aggregated_at = new Date().toISOString();
  meta.action_count = actions.length;

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, 'actions.json'), JSON.stringify(actions), 'utf8');
  await writeFile(resolve(OUT_DIR, 'stats.json'), JSON.stringify(stats), 'utf8');
  await writeFile(resolve(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log(
    `Wrote ${actions.length} actions, ${entityCounts.size} entities, ${months.length} months`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
