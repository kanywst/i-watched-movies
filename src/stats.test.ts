import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import type { Movie } from './types';

const make = (overrides: Partial<Movie>): Movie => ({
  id: 'x',
  title: 'X',
  published: true,
  tags: [],
  cover_image: '',
  release_date: '2025-01-01',
  watch_date: '2025-01-01',
  point: 5,
  content: '',
  ...overrides,
});

describe('computeStats', () => {
  it('returns zeros for empty list', () => {
    expect(computeStats([], new Date('2026-05-02'))).toEqual({
      total: 0,
      averagePoint: 0,
      thisYearCount: 0,
      currentYear: 2026,
    });
  });

  it('computes average point', () => {
    const movies = [make({ point: 8 }), make({ point: 6 }), make({ point: 4 })];
    expect(computeStats(movies, new Date('2026-05-02')).averagePoint).toBe(6);
  });

  it('counts movies watched this year only', () => {
    const movies = [
      make({ id: 'a', watch_date: '2026-01-01' }),
      make({ id: 'b', watch_date: '2026-12-31' }),
      make({ id: 'c', watch_date: '2025-06-01' }),
      make({ id: 'd', watch_date: '2024-01-01' }),
    ];
    expect(computeStats(movies, new Date('2026-05-02')).thisYearCount).toBe(2);
  });

  it('skips movies with empty or invalid watch_date in year count', () => {
    const movies = [
      make({ id: 'a', watch_date: '' }),
      make({ id: 'b', watch_date: 'not-a-date' }),
      make({ id: 'c', watch_date: '2026-01-01' }),
    ];
    expect(computeStats(movies, new Date('2026-05-02')).thisYearCount).toBe(1);
  });
});
