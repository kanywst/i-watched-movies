// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SORT_OPTIONS } from './constants';
import { DEFAULT_VIEW, VIEW_SPECS, isView, viewSpec } from './views';

describe('isView', () => {
  it('accepts every declared view', () => {
    for (const spec of VIEW_SPECS) expect(isView(spec.key)).toBe(true);
    expect(isView(DEFAULT_VIEW)).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isView('')).toBe(false);
    expect(isView('bogus')).toBe(false);
    expect(isView('Watched')).toBe(false);
  });

  // Regression: an `in` check against the spec index walked the prototype chain, so
  // `?view=toString` passed validation, fell through the exhaustive switch that builds the
  // header counters and blanked the page with "Cannot read properties of undefined".
  it('rejects Object.prototype keys', () => {
    for (const key of ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__']) {
      expect(isView(key)).toBe(false);
    }
  });
});

describe('viewSpec', () => {
  it('returns the spec for every view', () => {
    for (const spec of VIEW_SPECS) expect(viewSpec(spec.key)).toBe(spec);
  });

  it('gives the panel views no source list, so the grid and filters are suppressed', () => {
    expect(viewSpec('history').source).toBeNull();
    expect(viewSpec('stats').source).toBeNull();
    expect(viewSpec('watched').source).toBe('watched');
    expect(viewSpec('dropped').source).toBe('dropped');
  });

  it('hides the Stats tab count, which would only repeat the Watched tab', () => {
    expect(viewSpec('stats').showCount).toBe(false);
    expect(VIEW_SPECS.filter(s => !s.showCount).map(s => s.key)).toEqual(['stats']);
  });

  // Watched is the only list whose entries carry a watch_date. Sorting any of the others
  // by it compared zeroes, so the grid fell through to whatever order glob returned.
  it('opens the lists with no watch_date on added order', () => {
    expect(viewSpec('watched').defaultSort).toBe('watch_date_desc');
    for (const key of ['watchlist', 'watching', 'seen', 'dropped'] as const) {
      expect(viewSpec(key).defaultSort).toBe('added_desc');
    }
  });

  it('gives every view a default sort the dropdown offers', () => {
    const offered = SORT_OPTIONS.map(o => o.value);
    for (const spec of VIEW_SPECS) expect(offered).toContain(spec.defaultSort);
  });
});
