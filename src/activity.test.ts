import { describe, expect, it } from 'vitest';
import { activityLevel, computeActivity } from './activity';
import { ACTIVITY_WEEKS } from './constants';
import type { Movie } from './types';

const make = (overrides: Partial<Movie>): Movie => ({
  id: Math.random().toString(36).slice(2),
  title: 'X',
  published: true,
  tags: [],
  cover_image: '',
  release_date: '2025-01-01',
  watch_date: '2026-07-19',
  point: 5,
  content: '',
  ...overrides,
});

const NOW = new Date('2026-07-19T12:00:00Z'); // a Sunday

describe('activityLevel', () => {
  it('maps counts to fixed buckets', () => {
    expect(activityLevel(0)).toBe(0);
    expect(activityLevel(1)).toBe(1);
    expect(activityLevel(2)).toBe(2);
    expect(activityLevel(3)).toBe(3);
    expect(activityLevel(4)).toBe(4);
    expect(activityLevel(9)).toBe(4);
    expect(activityLevel(-1)).toBe(0);
  });
});

describe('computeActivity', () => {
  it('produces a 53-week grid of 7-day columns', () => {
    const a = computeActivity([], NOW);
    expect(a.weeks).toHaveLength(ACTIVITY_WEEKS);
    a.weeks.forEach(col => expect(col).toHaveLength(7));
  });

  it('counts films and active days, and finds the busiest day', () => {
    const movies = [
      make({ id: 'a', watch_date: '2026-07-12' }),
      make({ id: 'b', watch_date: '2026-07-19' }),
      make({ id: 'c', watch_date: '2026-07-19' }),
      make({ id: 'd', watch_date: '2026-07-19' }),
    ];
    const a = computeActivity(movies, NOW);
    expect(a.total).toBe(4);
    expect(a.activeDays).toBe(2);
    expect(a.busiestDay).toEqual({ date: '2026-07-19', count: 3 });
  });

  it('accepts the full ISO datetime that parseMovie writes', () => {
    // parseMovie normalises watch_date to '2026-07-19T00:00:00.000Z', not a bare date.
    const movies = [
      make({ id: 'a', watch_date: '2026-07-19T00:00:00.000Z' }),
      make({ id: 'b', watch_date: '2026-07-19T00:00:00.000Z' }),
      make({ id: 'c', watch_date: '2026-07-12T00:00:00.000Z' }),
    ];
    const a = computeActivity(movies, NOW);
    expect(a.total).toBe(3);
    expect(a.busiestDay).toEqual({ date: '2026-07-19', count: 2 });
    expect(a.monthly[11]).toMatchObject({ label: 'Jul', count: 3 });
  });

  it('includes seen (unrated) films but ignores empty/invalid watch_date', () => {
    const movies = [
      make({ id: 'seen', seen: true, published: false, watch_date: '2026-07-15' }),
      make({ id: 'watchlist', published: false, watch_date: '' }),
      make({ id: 'bad', watch_date: 'not-a-date' }),
    ];
    const a = computeActivity(movies, NOW);
    expect(a.total).toBe(1);
  });

  it('computes current and longest streaks', () => {
    const movies = [
      // A 3-day run ending today -> current streak 3.
      make({ id: 'a', watch_date: '2026-07-17' }),
      make({ id: 'b', watch_date: '2026-07-18' }),
      make({ id: 'c', watch_date: '2026-07-19' }),
      // A separate 4-day run earlier -> longest streak 4.
      make({ id: 'd', watch_date: '2026-06-01' }),
      make({ id: 'e', watch_date: '2026-06-02' }),
      make({ id: 'f', watch_date: '2026-06-03' }),
      make({ id: 'g', watch_date: '2026-06-04' }),
    ];
    const a = computeActivity(movies, NOW);
    expect(a.currentStreak).toBe(3);
    expect(a.longestStreak).toBe(4);
  });

  it('keeps the current streak alive when the latest film was yesterday', () => {
    // NOW is 2026-07-19; a film on the 18th (yesterday) should still count as streak 1.
    const movies = [
      make({ id: 'a', watch_date: '2026-07-17' }),
      make({ id: 'b', watch_date: '2026-07-18' }),
    ];
    const a = computeActivity(movies, NOW);
    expect(a.currentStreak).toBe(2);
  });

  it('reports a zero current streak when neither today nor yesterday has a film', () => {
    const movies = [make({ watch_date: '2026-07-10' })];
    const a = computeActivity(movies, NOW);
    expect(a.currentStreak).toBe(0);
  });

  it('never places two month labels within one column of each other', () => {
    // '2026-02-01' is a Sunday, so the trailing-year grid starts on a partial week that
    // can push adjacent month labels; the min-gap rule must keep them from overlapping.
    for (const now of [NOW, new Date('2026-02-01T12:00:00Z'), new Date('2026-01-31T12:00:00Z')]) {
      const { monthLabels } = computeActivity([], now);
      for (let i = 1; i < monthLabels.length; i += 1) {
        expect(monthLabels[i].index - monthLabels[i - 1].index).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('returns 12 trailing months oldest-first with per-month counts', () => {
    const movies = [
      make({ id: 'a', watch_date: '2026-07-19' }),
      make({ id: 'b', watch_date: '2026-07-01' }),
      make({ id: 'c', watch_date: '2026-06-15' }),
    ];
    const a = computeActivity(movies, NOW);
    expect(a.monthly).toHaveLength(12);
    expect(a.monthly[11]).toMatchObject({ label: 'Jul', count: 2 });
    expect(a.monthly[10]).toMatchObject({ label: 'Jun', count: 1 });
  });

  it('sorts a day\'s films by point descending for the tooltip', () => {
    const movies = [
      make({ id: 'low', watch_date: '2026-07-19', point: 4 }),
      make({ id: 'high', watch_date: '2026-07-19', point: 9 }),
    ];
    const a = computeActivity(movies, NOW);
    const today = a.weeks.flat().find(d => d?.date === '2026-07-19');
    expect(today?.movies.map(m => m.id)).toEqual(['high', 'low']);
  });
});
