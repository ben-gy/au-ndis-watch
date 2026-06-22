import { describe, expect, it } from 'vitest';
import { normaliseActionType, severityFor } from '../pipeline/lib/types.mjs';

describe('normaliseActionType', () => {
  it('normalises banning order', () => {
    expect(normaliseActionType('ER - Banning Order').normalised).toBe('banning_order');
  });
  it('normalises revocation', () => {
    expect(normaliseActionType('ER - Revocation of registration').normalised).toBe('revocation');
  });
  it('normalises compliance notice', () => {
    expect(normaliseActionType('ER - Compliance notice').normalised).toBe('compliance_notice');
  });
  it('normalises refusal', () => {
    expect(normaliseActionType('ER - Refusal to re-register').normalised).toBe(
      'refusal_to_reregister',
    );
  });
  it('normalises suspension', () => {
    expect(normaliseActionType('ER - Suspension of registration').normalised).toBe('suspension');
  });
  it('normalises enforceable undertaking', () => {
    expect(normaliseActionType('ER - Enforceable Undertaking').normalised).toBe(
      'enforceable_undertaking',
    );
  });
  it('falls back to "other" for unknown', () => {
    expect(normaliseActionType('Mystery Action').normalised).toBe('other');
  });
});

describe('severityFor', () => {
  it('rates banning order red', () => {
    expect(severityFor('banning_order')).toBe('red');
  });
  it('rates revocation red', () => {
    expect(severityFor('revocation')).toBe('red');
  });
  it('rates suspension amber', () => {
    expect(severityFor('suspension')).toBe('amber');
  });
  it('rates refusal_to_reregister amber', () => {
    expect(severityFor('refusal_to_reregister')).toBe('amber');
  });
  it('rates compliance notice slate', () => {
    expect(severityFor('compliance_notice')).toBe('slate');
  });
  it('rates unknown as slate', () => {
    expect(severityFor('other')).toBe('slate');
  });
});
