// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Movie } from './types';
import { SCORE_BAND_CUTS } from './constants';
import { bandOf, buildRatedPoints, countRatedBelow, percentileOf } from './scoreBand';

const make = (overrides: Partial<Movie>): Movie => ({
  id: 'x',
  title: 'X',
  published: true,
  tags: [],
  cover_image: '',
  release_date: '2025-01-01',
  watch_date: '2025-01-01',
  point: 7,
  content: '',
  ...overrides,
});

const rate = (point: number): Movie => make({ id: String(point), point });

describe('buildRatedPoints', () => {
  it('returns the points ascending', () => {
    expect(buildRatedPoints([rate(8.5), rate(1), rate(7.2)])).toEqual([1, 7.2, 8.5]);
  });

  it('sorts numerically, not lexicographically', () => {
    expect(buildRatedPoints([rate(10), rate(9), rate(1)])).toEqual([1, 9, 10]);
  });

  it('leaves the list it was handed alone', () => {
    const movies = [rate(9), rate(1)];
    buildRatedPoints(movies);
    expect(movies.map(m => m.point)).toEqual([9, 1]);
  });
});

describe('percentileOf', () => {
  const rated = [1, 2, 3, 4];

  it('places a score by how much of the diary it stands above', () => {
    expect(percentileOf(rated, 1)).toBeCloseTo(0.125);
    expect(percentileOf(rated, 4)).toBeCloseTo(0.875);
  });

  it('splits a tie down the middle rather than crediting the whole block', () => {
    // Four films share 8.0 in the middle of ten. Counting the block as beaten would put the
    // score at 0.7, ignoring it at 0.3; the midrank is the half-way 0.5.
    const tied = [1, 2, 3, 8, 8, 8, 8, 9, 9, 10];
    expect(percentileOf(tied, 8)).toBeCloseTo(0.5);
  });

  it('stays inside the ends for a score that is itself in the diary', () => {
    expect(percentileOf(rated, 1)).toBeGreaterThan(0);
    expect(percentileOf(rated, 4)).toBeLessThan(1);
  });

  it('reaches the ends only for a score the diary does not hold', () => {
    // Not hypothetical: MovieDetailModal reads a band for every entry it opens, and an
    // unrated one carries point 0, which is in no rated list.
    expect(percentileOf(rated, 0)).toBe(0);
    expect(percentileOf(rated, 99)).toBe(1);
  });

  it('reports the midpoint for an empty diary, so nothing lands at an extreme', () => {
    expect(percentileOf([], 8)).toBe(0.5);
  });
});

describe('bandOf', () => {
  // The diary's own shape: tight in the middle, one very low outlier.
  const rated = buildRatedPoints(
    [1, 5, 6, 6.8, 7, 7.2, 7.2, 7.5, 7.7, 7.9, 8, 8.2, 8.2, 8.4, 8.5, 8.5, 8.7, 8.8].map(rate),
  );

  it('bands by standing in the diary, not by position on the 0-10 scale', () => {
    // 7.2 is comfortably above the midpoint of a 0-10 scale and still only middling here.
    expect(bandOf(rated, 6)).toBe('low');
    expect(bandOf(rated, 7.2)).toBe('mid');
    expect(bandOf(rated, 8.2)).toBe('high');
    expect(bandOf(rated, 8.7)).toBe('top');
  });

  it('puts a score landing exactly on a cut in the higher band', () => {
    // Asserted against the constants rather than against literals, so retuning a cut fails
    // here loudly instead of quietly ceasing to test the boundary.
    expect(percentileOf([1, 2, 3, 4], 1.5)).toBe(SCORE_BAND_CUTS.mid);
    expect(bandOf([1, 2, 3, 4], 1.5)).toBe('mid');
    expect(percentileOf([1, 2, 3, 4, 5], 3.5)).toBe(SCORE_BAND_CUTS.high);
    expect(bandOf([1, 2, 3, 4, 5], 3.5)).toBe('high');
    const twenty = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(percentileOf(twenty, 17.5)).toBe(SCORE_BAND_CUTS.top);
    expect(bandOf(twenty, 17.5)).toBe('top');
  });

  it('is monotonic: a higher score is never put in a lower band', () => {
    const order = { low: 0, mid: 1, high: 2, top: 3 } as const;
    const bands = rated.map(p => order[bandOf(rated, p)]);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i]).toBeGreaterThanOrEqual(bands[i - 1]);
    }
  });

  it('uses all four bands on a diary this shape', () => {
    expect(new Set(rated.map(p => bandOf(rated, p)))).toEqual(
      new Set(['low', 'mid', 'high', 'top']),
    );
  });

  it('puts the extremes in the extreme bands', () => {
    expect(bandOf(rated, rated[0])).toBe('low');
    expect(bandOf(rated, rated[rated.length - 1])).toBe('top');
  });

  it('bands a score below everything rated low, which is what an unrated entry hits', () => {
    expect(bandOf(rated, 0)).toBe('low');
  });

  it('falls back to the neutral band when there is nothing to compare against', () => {
    expect(bandOf([], 9.9)).toBe('mid');
  });
});

describe('countRatedBelow', () => {
  it('counts only what the score beats outright', () => {
    // Six films share 8.5. The score stands above the twelve under them and is level with
    // the other five, so the midrank's 15 would be a false claim in the modal's wording.
    const rated = [...Array(12).fill(7), ...Array(6).fill(8.5)];
    expect(countRatedBelow(rated, 8.5)).toBe(12);
    expect(percentileOf(rated, 8.5)).toBeCloseTo(15 / 18);
  });

  it('reports zero for the lowest score in the diary', () => {
    expect(countRatedBelow([1, 5, 7], 1)).toBe(0);
  });

  it('reports the whole diary for a score above all of it', () => {
    expect(countRatedBelow([1, 5, 7], 10)).toBe(3);
  });

  it('counts nothing in an empty diary', () => {
    expect(countRatedBelow([], 8)).toBe(0);
  });
});
