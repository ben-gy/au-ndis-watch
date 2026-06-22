import { describe, expect, it } from 'vitest';
import { classifyRegistrationGroups, categoryByCode } from '../pipeline/lib/groups.mjs';

describe('classifyRegistrationGroups', () => {
  it('returns empty for empty input', () => {
    expect(classifyRegistrationGroups([])).toEqual([]);
  });

  it('matches numeric code 136 to community', () => {
    expect(classifyRegistrationGroups(['136 group and centre-based activities'])).toContain(
      'community',
    );
  });

  it('matches numeric code 107 to personal_care', () => {
    expect(
      classifyRegistrationGroups(['107 assistance with daily personal activities']),
    ).toContain('personal_care');
  });

  it('matches numeric code 106 to support_coordination', () => {
    expect(
      classifyRegistrationGroups(['106 assistance in coordinating or managing life stages']),
    ).toContain('support_coordination');
  });

  it('matches text "social and civic activities" to community', () => {
    expect(classifyRegistrationGroups(['social and civic activities'])).toContain('community');
  });

  it('matches "transitions and supports" to transitions', () => {
    expect(classifyRegistrationGroups(['transitions and supports'])).toContain('transitions');
  });

  it('returns multiple categories for multi-coded entries', () => {
    const groups = [
      '101 accommodation/tenancy assistance',
      '127 management of funding for supports in participant plans',
      '128 therapeutic supports',
    ];
    const result = classifyRegistrationGroups(groups);
    expect(result).toContain('accommodation');
    expect(result).toContain('support_coordination');
    expect(result).toContain('therapy_nursing');
  });

  it('does not duplicate categories', () => {
    const result = classifyRegistrationGroups([
      '107 assistance with daily personal activities',
      '120 household tasks',
    ]);
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });
});

describe('categoryByCode', () => {
  it('finds known categories', () => {
    expect(categoryByCode('accommodation')?.label).toMatch(/Accommodation/i);
  });
  it('returns null for unknown', () => {
    expect(categoryByCode('nope')).toBeNull();
  });
});
