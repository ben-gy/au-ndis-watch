export interface GlossaryTerm {
  id: string;
  title: string;
  body: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'ndis',
    title: 'NDIS',
    body: 'The National Disability Insurance Scheme — Australia’s federally funded scheme that provides individualised support packages to people with permanent and significant disability.',
  },
  {
    id: 'ndis-commission',
    title: 'NDIS Commission',
    body: 'Short for the NDIS Quality and Safeguards Commission — the independent agency that registers, regulates and disciplines NDIS providers under the NDIS Act 2013.',
  },
  {
    id: 'banning_order',
    title: 'Banning order',
    body: 'A formal order under section 73ZN of the NDIS Act that prohibits a named person or company from being involved in NDIS supports — sometimes permanently, sometimes for a fixed period. Banning orders are the strongest enforcement tool the Commission has against an individual.',
  },
  {
    id: 'revocation',
    title: 'Revocation of registration',
    body: 'Cancellation of a provider’s registration under the NDIS Act. Once revoked, the provider cannot deliver registered supports until they apply for and obtain a fresh registration.',
  },
  {
    id: 'suspension',
    title: 'Suspension of registration',
    body: 'A temporary halt on a provider’s NDIS registration. The provider cannot deliver registered supports while suspended.',
  },
  {
    id: 'refusal',
    title: 'Refusal to re-register',
    body: 'A decision to reject a provider’s application to renew its NDIS registration when the existing registration expires.',
  },
  {
    id: 'compliance_notice',
    title: 'Compliance notice',
    body: 'A formal written direction from the Commission requiring a provider to take a specific action — for example, to fix a worker-screening gap or to stop a particular practice — to comply with NDIS law. Failure to comply can lead to civil penalties.',
  },
  {
    id: 'enforceable_undertaking',
    title: 'Enforceable undertaking',
    body: 'A legally binding promise given by a provider to the Commission. The Commission may accept an enforceable undertaking instead of stronger action; if the provider breaks it, the Commission can take them to court.',
  },
  {
    id: 'er',
    title: 'ER (Enforcement Register)',
    body: 'The prefix "ER" on action types in the raw dataset signals an entry in the NDIS Commission’s public Enforcement Register — the official list of decisions taken under the NDIS Act.',
  },
  {
    id: 'registration-group',
    title: 'Registration group',
    body: 'A category that defines which kinds of NDIS supports a provider is registered to deliver — for example "group and centre-based activities" or "specialist disability accommodation". A provider can be registered for many groups at once.',
  },
  {
    id: 'sda',
    title: 'SDA (Specialist Disability Accommodation)',
    body: 'Housing designed for people with very high needs — high physical-support, robust construction, fully accessible, or with on-site overnight assistance.',
  },
  {
    id: 'sil',
    title: 'SIL (Supported Independent Living)',
    body: 'Help with everyday tasks (cooking, cleaning, personal care) provided to people who live in a shared-living arrangement.',
  },
  {
    id: 'support-coordination',
    title: 'Support coordination',
    body: 'A specialist service that helps an NDIS participant choose providers, navigate their plan, and connect with mainstream services.',
  },
  {
    id: 'per-100k',
    title: 'Per 100,000 population',
    body: 'Normalises raw action counts by state population (ABS ERP, June 2024). Lets you compare states of very different sizes — e.g. raw NSW counts will always dwarf NT, but per-100k rates may tell a different story.',
  },
  {
    id: 'severity',
    title: 'Severity (red / amber / slate)',
    body: 'Our colour-coding of action types by impact. Red = banning order or revocation (permanent or near-permanent restriction). Amber = suspension or refusal to re-register. Slate = compliance notice or enforceable undertaking (correction expected).',
  },
];

export function findTerm(id: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.id === id);
}
