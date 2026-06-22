import type { ActionType, Severity } from './types';

// Mirrors the pipeline-side action type table; used in UI for definitions.
export const ACTION_TYPE_DEFINITIONS: {
  code: ActionType;
  label: string;
  severity: Severity;
  summary: string;
}[] = [
  {
    code: 'banning_order',
    label: 'Banning order',
    severity: 'red',
    summary:
      'Prohibits a person or company from being involved in NDIS supports — sometimes permanently. The Commission’s strongest tool against an individual worker or controller.',
  },
  {
    code: 'revocation',
    label: 'Revocation of registration',
    severity: 'red',
    summary:
      'Cancels a provider’s NDIS registration. The provider can no longer deliver registered supports until they re-register from scratch.',
  },
  {
    code: 'refusal_to_reregister',
    label: 'Refusal to re-register',
    severity: 'amber',
    summary:
      'A decision to reject a provider’s application to renew their registration when it expires.',
  },
  {
    code: 'suspension',
    label: 'Suspension of registration',
    severity: 'amber',
    summary:
      'Temporarily halts a provider’s registration. The provider cannot deliver registered supports during the suspension.',
  },
  {
    code: 'compliance_notice',
    label: 'Compliance notice',
    severity: 'slate',
    summary:
      'A formal direction requiring the provider to do (or stop doing) something specific to meet NDIS law. Most common action type.',
  },
  {
    code: 'enforceable_undertaking',
    label: 'Enforceable undertaking',
    severity: 'slate',
    summary:
      'A legally binding promise given by a provider to the Commission, accepted instead of stronger enforcement.',
  },
];
