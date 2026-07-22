// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Normalise the raw "Type" column from the NDIS Commission CSV into a stable
// machine code, a human label, and a severity bucket.
//
// Severity:
//   red   — banning order, revocation (most serious; permanent or near-permanent)
//   amber — refusal to re-register, suspension (significant restriction)
//   slate — compliance notice, enforceable undertaking (correction expected)

export const ACTION_TYPES = [
  {
    code: 'banning_order',
    label: 'Banning order',
    severity: 'red',
    summary:
      'A formal order under section 73ZN of the NDIS Act prohibiting a person or company from providing NDIS supports. Often permanent.',
    match: /banning/i,
  },
  {
    code: 'revocation',
    label: 'Revocation of registration',
    severity: 'red',
    summary:
      "Cancellation of a provider's NDIS registration by the Commissioner. The provider can no longer deliver registered supports.",
    match: /revocation/i,
  },
  {
    code: 'refusal_to_reregister',
    label: 'Refusal to re-register',
    severity: 'amber',
    summary:
      "The Commission has refused a provider's application to renew its NDIS registration.",
    match: /refusal/i,
  },
  {
    code: 'suspension',
    label: 'Suspension of registration',
    severity: 'amber',
    summary:
      'Temporary suspension of a provider’s registration. The provider cannot deliver registered supports during the suspension period.',
    match: /suspension/i,
  },
  {
    code: 'compliance_notice',
    label: 'Compliance notice',
    severity: 'slate',
    summary:
      'Formal direction issued by the Commission requiring the provider to do (or stop doing) something to comply with the NDIS Act.',
    match: /compliance/i,
  },
  {
    code: 'enforceable_undertaking',
    label: 'Enforceable undertaking',
    severity: 'slate',
    summary:
      'Legally binding promise given by a provider to the Commission, accepted in lieu of stronger enforcement action.',
    match: /undertaking/i,
  },
];

export function normaliseActionType(raw) {
  for (const t of ACTION_TYPES) {
    if (t.match.test(raw)) {
      return { normalised: t.code, label: t.label };
    }
  }
  return { normalised: 'other', label: raw };
}

export function severityFor(normalisedCode) {
  const t = ACTION_TYPES.find((x) => x.code === normalisedCode);
  return t ? t.severity : 'slate';
}

export const SEVERITY_ORDER = ['red', 'amber', 'slate'];
