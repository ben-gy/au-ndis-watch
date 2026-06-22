export type Severity = 'red' | 'amber' | 'slate';

export type ActionType =
  | 'banning_order'
  | 'revocation'
  | 'refusal_to_reregister'
  | 'suspension'
  | 'compliance_notice'
  | 'enforceable_undertaking'
  | 'other';

export type State = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface ComplianceAction {
  id: number;
  raw_type: string;
  type: ActionType;
  type_label: string;
  severity: Severity;
  effective_from: string | null;
  effective_from_ym: string | null;
  no_longer_in_force: string | null;
  name: string;
  is_person: boolean;
  key: string;
  abn: string | null;
  city: string | null;
  state: State | null;
  postcode: string | null;
  provider_number: string | null;
  other_info: string | null;
  group_codes: string[];
  group_categories: string[];
  narrative: string;
}

export interface StateLeaderboardEntry {
  state: State;
  count: number;
  population: number;
  per_100k: number;
  severity_mix: Partial<Record<Severity, number>>;
}

export interface TimelinePoint {
  month: string;
  counts: Partial<Record<ActionType, number>>;
}

export interface RepeatEntity {
  key: string;
  name: string;
  is_person: boolean;
  state: State | null;
  action_count: number;
  action_types: ActionType[];
  first_action: string | null;
  last_action: string | null;
}

export interface GroupTotal {
  category: string;
  count: number;
}

export interface Stats {
  total_actions: number;
  total_entities: number;
  repeat_entities_count: number;
  by_type: Partial<Record<ActionType, number>>;
  by_state: Partial<Record<State, number>>;
  by_severity: Record<Severity, number>;
  state_leaderboard: StateLeaderboardEntry[];
  timeline: TimelinePoint[];
  repeat_entities: RepeatEntity[];
  group_totals: GroupTotal[];
  group_by_type: Partial<Record<string, Partial<Record<ActionType, number>>>>;
  last_12m_actions: number;
  last_12m_bans: number;
  prev_12m_bans: number;
  earliest_action: string | null;
  latest_action: string | null;
}

export interface DataMeta {
  fetched_at: string;
  dataset_name: string;
  dataset_title: string;
  dataset_modified: string | null;
  csv_url: string;
  csv_bytes: number;
  aggregated_at?: string;
  action_count?: number;
}

export type ViewKey =
  | 'browse'
  | 'map'
  | 'timeline'
  | 'types'
  | 'states'
  | 'groups'
  | 'insights';

export interface AppState {
  view: ViewKey;
  search: string;
  selectedTypes: Set<ActionType>;
  selectedStates: Set<State>;
  selectedSeverities: Set<Severity>;
  selectedCategories: Set<string>;
  yearFrom: number | null;
  yearTo: number | null;
  drilldownKey: string | null;
  sortKey: 'date_desc' | 'date_asc' | 'name_asc' | 'severity_desc';
}
