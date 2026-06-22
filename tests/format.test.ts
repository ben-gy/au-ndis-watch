import { describe, expect, it } from 'vitest';
import {
  ageInDays,
  escapeHtml,
  fmtDate,
  fmtInt,
  fmtMonth,
  fmtNum,
  pluralise,
  relativeAge,
  truncate,
} from '../src/utils/format';

describe('fmtInt', () => {
  it('formats thousands with locale separators', () => {
    expect(fmtInt(1234567)).toBe('1,234,567');
  });
  it('handles zero', () => {
    expect(fmtInt(0)).toBe('0');
  });
  it('handles negative numbers', () => {
    expect(fmtInt(-1234)).toBe('-1,234');
  });
  it('handles null/undefined/NaN', () => {
    expect(fmtInt(null)).toBe('—');
    expect(fmtInt(undefined)).toBe('—');
    expect(fmtInt(Number.NaN)).toBe('—');
  });
  it('rounds floats', () => {
    expect(fmtInt(1234.7)).toBe('1,235');
  });
});

describe('fmtNum', () => {
  it('formats with given decimals', () => {
    expect(fmtNum(12.345, 2)).toBe('12.35');
  });
  it('handles zero with decimals', () => {
    expect(fmtNum(0, 2)).toBe('0.00');
  });
  it('handles negative decimals', () => {
    expect(fmtNum(-1.5, 1)).toBe('-1.5');
  });
});

describe('fmtDate', () => {
  it('formats ISO date as D Mon YYYY', () => {
    expect(fmtDate('2026-06-22')).toBe('22 Jun 2026');
  });
  it('handles full ISO timestamps', () => {
    expect(fmtDate('2026-01-05T00:00:00Z')).toBe('5 Jan 2026');
  });
  it('handles null', () => {
    expect(fmtDate(null)).toBe('—');
  });
  it('returns input unchanged when not a date', () => {
    expect(fmtDate('not-a-date')).toBe('not-a-date');
  });
});

describe('fmtMonth', () => {
  it('formats YYYY-MM as Mon YYYY', () => {
    expect(fmtMonth('2026-03')).toBe('Mar 2026');
  });
  it('handles null', () => {
    expect(fmtMonth(null)).toBe('—');
  });
});

describe('ageInDays / relativeAge', () => {
  it('returns integer day count', () => {
    const past = new Date('2026-01-01T00:00:00Z');
    const ref = new Date('2026-01-11T00:00:00Z');
    expect(ageInDays(past.toISOString(), ref)).toBe(10);
  });
  it('renders weeks/months', () => {
    const ref = new Date('2026-06-22T00:00:00Z');
    expect(relativeAge('2026-06-20', ref)).toBe('2d ago');
    expect(relativeAge('2026-06-10', ref)).toBe('1w ago');
    expect(relativeAge('2026-04-22', ref)).toBe('2mo ago');
  });
  it('handles invalid', () => {
    expect(ageInDays(null)).toBeNull();
  });
});

describe('escapeHtml', () => {
  it('escapes the five core entities', () => {
    expect(escapeHtml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&#39;f');
  });
  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
  it('appends ellipsis when over limit', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });
});

describe('pluralise', () => {
  it('returns singular for 1', () => {
    expect(pluralise(1, 'action')).toBe('action');
  });
  it('returns plural for 0 or many', () => {
    expect(pluralise(0, 'action')).toBe('actions');
    expect(pluralise(5, 'action')).toBe('actions');
  });
  it('respects explicit plural', () => {
    expect(pluralise(2, 'entity', 'entities')).toBe('entities');
  });
});
