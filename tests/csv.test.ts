import { describe, expect, it } from 'vitest';
import { parseCsv } from '../pipeline/lib/csv.mjs';

describe('parseCsv', () => {
  it('parses a simple table', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6\n';
    expect(parseCsv(csv)).toEqual([
      { a: '1', b: '2', c: '3' },
      { a: '4', b: '5', c: '6' },
    ]);
  });

  it('respects quoted commas', () => {
    const csv = 'name,note\n"Smith, John","hello, world"\n';
    expect(parseCsv(csv)).toEqual([{ name: 'Smith, John', note: 'hello, world' }]);
  });

  it('respects quoted newlines', () => {
    const csv = 'name,note\n"Acme","line one\nline two"\n';
    expect(parseCsv(csv)).toEqual([{ name: 'Acme', note: 'line one\nline two' }]);
  });

  it('respects escaped double quotes', () => {
    const csv = 'name\n"He said ""hi"""\n';
    expect(parseCsv(csv)).toEqual([{ name: 'He said "hi"' }]);
  });

  it('returns empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('handles trailing newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toHaveLength(1);
  });

  it('handles missing trailing newline', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([{ a: '1', b: '2' }]);
  });

  it('handles fields with carriage returns', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }]);
  });

  it('pads missing columns as empty strings', () => {
    expect(parseCsv('a,b,c\n1,2\n')).toEqual([{ a: '1', b: '2', c: '' }]);
  });
});
