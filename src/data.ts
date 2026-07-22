// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { ComplianceAction, DataMeta, Stats } from './types';

export interface LoadedData {
  actions: ComplianceAction[];
  stats: Stats;
  meta: DataMeta;
}

export async function loadAllData(): Promise<LoadedData> {
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`;
  const [actions, stats, meta] = await Promise.all([
    fetch(`${base}/actions.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load actions.json: ${r.status}`);
      return r.json() as Promise<ComplianceAction[]>;
    }),
    fetch(`${base}/stats.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load stats.json: ${r.status}`);
      return r.json() as Promise<Stats>;
    }),
    fetch(`${base}/meta.json`).then((r) => {
      if (!r.ok) throw new Error(`Failed to load meta.json: ${r.status}`);
      return r.json() as Promise<DataMeta>;
    }),
  ]);
  return { actions, stats, meta };
}
