// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SORT_OPTIONS } from './constants';
import { DEFAULT_VIEW, VIEW_SPECS, isView, sortOptionsFor, viewSpec } from './views';

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
    expect(viewSpec('top').source).toBeNull();
    expect(viewSpec('history').source).toBeNull();
    expect(viewSpec('stats').source).toBeNull();
    expect(viewSpec('watched').source).toBe('watched');
    expect(viewSpec('dropped').source).toBe('dropped');
  });

  it('hides the Top and Stats tab counts, which would only repeat the Watched tab', () => {
    expect(VIEW_SPECS.filter(s => !s.showCount).map(s => s.key)).toEqual(['top', 'stats']);
  });

  // The podium is the front page: a bare URL (no ?view=) and any unknown view land on it,
  // and it is a panel, so the filter bar and grid stay off it.
  it('opens on the Top view, first in the tab strip, with no grid', () => {
    expect(DEFAULT_VIEW).toBe('top');
    expect(VIEW_SPECS[0].key).toBe('top');
    expect(viewSpec('top').source).toBeNull();
  });

  // Watched is the only list whose entries carry a watch_date. Sorting any of the others
  // by it compared zeroes, so the grid fell through to whatever order glob returned.
  it('opens the lists with no watch_date on added order, and the watchlist on its own', () => {
    expect(viewSpec('watched').defaultSort).toBe('watch_date_desc');
    expect(viewSpec('watchlist').defaultSort).toBe('recommended');
    for (const key of ['watching', 'seen', 'dropped'] as const) {
      expect(viewSpec(key).defaultSort).toBe('added_desc');
    }
  });

  it('gives every view a default sort its own dropdown offers', () => {
    for (const spec of VIEW_SPECS) {
      expect(sortOptionsFor(spec.source).map(o => o.value)).toContain(spec.defaultSort);
    }
  });

  it('offers the recommended order on the watchlist only', () => {
    expect(sortOptionsFor('watchlist').map(o => o.value)).toEqual(SORT_OPTIONS.map(o => o.value));
    for (const source of ['watched', 'watching', 'seen', 'dropped', null] as const) {
      const offered = sortOptionsFor(source).map(o => o.value);
      expect(offered).not.toContain('recommended');
      expect(offered).toHaveLength(SORT_OPTIONS.length - 1);
    }
  });
});
