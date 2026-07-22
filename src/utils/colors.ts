// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { ActionType, Severity } from '../types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  red: '#c1272d',
  amber: '#d97706',
  slate: '#475569',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  red: 'Most serious',
  amber: 'Significant',
  slate: 'Correction',
};

export const TYPE_COLORS: Record<ActionType, string> = {
  banning_order: '#c1272d',
  revocation: '#a01a1f',
  refusal_to_reregister: '#d97706',
  suspension: '#f59e0b',
  compliance_notice: '#475569',
  enforceable_undertaking: '#64748b',
  other: '#94a3b8',
};

export const CATEGORY_COLORS: Record<string, string> = {
  personal_care: '#0b6bcb',
  accommodation: '#c1272d',
  community: '#7c3aed',
  support_coordination: '#0d9488',
  employment_education: '#d97706',
  therapy_nursing: '#65a30d',
  transport: '#0891b2',
  transitions: '#b45309',
  other: '#94a3b8',
};

export const CATEGORY_LABELS: Record<string, string> = {
  personal_care: 'Personal care & daily living',
  accommodation: 'Accommodation & shared living',
  community: 'Community participation',
  support_coordination: 'Support coordination & plan mgmt',
  employment_education: 'Employment & education',
  therapy_nursing: 'Therapy & nursing',
  transport: 'Transport',
  transitions: 'Transitions',
  other: 'Other / unspecified',
};

export const STATE_LABELS: Record<string, string> = {
  NSW: 'New South Wales',
  VIC: 'Victoria',
  QLD: 'Queensland',
  WA: 'Western Australia',
  SA: 'South Australia',
  TAS: 'Tasmania',
  ACT: 'Australian Capital Territory',
  NT: 'Northern Territory',
};

export const STATE_CENTROIDS: Record<string, [number, number]> = {
  NSW: [-32.5, 147.0],
  VIC: [-36.7, 144.5],
  QLD: [-22.0, 144.5],
  WA: [-26.0, 121.0],
  SA: [-30.0, 135.5],
  TAS: [-42.0, 146.5],
  ACT: [-35.5, 149.0],
  NT: [-19.5, 134.0],
};
