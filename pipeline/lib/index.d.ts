// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
declare module '*.mjs' {
  const value: unknown;
  export default value;
  export const parseCsv: (text: string) => Record<string, string>[];
  export const normaliseActionType: (raw: string) => { normalised: string; label: string };
  export const severityFor: (code: string) => string;
  export const classifyRegistrationGroups: (groupCodes: string[]) => string[];
  export const categoryByCode: (code: string) => { label: string } | null;
}
