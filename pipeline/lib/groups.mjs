// Classify the messy "Registration Groups" CSV field into a small number of
// human-readable service categories.
//
// The raw field is a semicolon-separated list mixing text descriptors
// ("social and civic activities", "transitions and supports") and numeric
// NDIS support category codes ("136 group and centre-based activities",
// "127 management of funding for supports in participant plans").

export const CATEGORIES = [
  {
    code: 'personal_care',
    label: 'Personal care & daily living',
    summary: 'Help with showering, dressing, meal prep, household tasks, high-intensity supports.',
    color: '#0b6bcb',
    match: [
      /\b(104|107|117|120)\b/i,
      /personal activities/i,
      /household tasks/i,
      /daily living/i,
    ],
  },
  {
    code: 'accommodation',
    label: 'Accommodation & shared living',
    summary: 'Supported Independent Living (SIL), Specialist Disability Accommodation (SDA), tenancy assistance.',
    color: '#dc2828',
    match: [
      /\b(101|115|131)\b/i,
      /accommodation/i,
      /tenancy/i,
      /shared living/i,
      /independent living/i,
    ],
  },
  {
    code: 'community',
    label: 'Community participation',
    summary: 'Group programs, centre-based activities, social and civic engagement, recreation.',
    color: '#7c3aed',
    match: [
      /\b(116|125|136)\b/i,
      /social and civic/i,
      /community participation/i,
      /group and centre-based/i,
    ],
  },
  {
    code: 'support_coordination',
    label: 'Support coordination & plan mgmt',
    summary: 'Support coordinators, specialist support coordination, plan managers.',
    color: '#0d9488',
    match: [
      /\b(106|127|132)\b/i,
      /coordinating or managing life stages/i,
      /management of funding/i,
      /specialised support coordination/i,
    ],
  },
  {
    code: 'employment_education',
    label: 'Employment & education',
    summary: 'School-leaver supports, supported employment, training.',
    color: '#d97706',
    match: [/\b(102|133)\b/i, /employment or higher education/i, /supported employment/i],
  },
  {
    code: 'therapy_nursing',
    label: 'Therapy & nursing',
    summary: 'Allied health, behaviour support, community nursing care.',
    color: '#65a30d',
    match: [/\b(114|128)\b/i, /therapeutic supports/i, /nursing/i],
  },
  {
    code: 'transport',
    label: 'Transport',
    summary: 'Travel and transport supports for participants.',
    color: '#0891b2',
    match: [/\b108\b/i, /travel\/transport/i, /travel and transport/i],
  },
  {
    code: 'transitions',
    label: 'Transitions',
    summary: 'Transition supports — school-leaver, capacity building introductions.',
    color: '#b45309',
    match: [/transitions and supports/i],
  },
];

export function classifyRegistrationGroups(groupCodes) {
  if (!groupCodes || !groupCodes.length) return [];
  const haystack = groupCodes.join(' ; ').toLowerCase();
  const matched = new Set();
  for (const cat of CATEGORIES) {
    for (const m of cat.match) {
      if (m.test(haystack)) {
        matched.add(cat.code);
        break;
      }
    }
  }
  return [...matched];
}

export function categoryByCode(code) {
  return CATEGORIES.find((c) => c.code === code) ?? null;
}
