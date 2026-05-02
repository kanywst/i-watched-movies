import { describe, expect, it } from 'vitest';
import { sortMovies } from './sortMovies';
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

const movies: Movie[] = [
  make({ id: 'a', watch_date: '2026-01-01', release_date: '2024-06-01', point: 7 }),
  make({ id: 'b', watch_date: '2026-03-01', release_date: '2025-01-01', point: 9 }),
  make({ id: 'c', watch_date: '2025-12-01', release_date: '2026-01-01', point: 5 }),
];

const ids = (sorted: Movie[]) => sorted.map(m => m.id);

describe('sortMovies', () => {
  it('does not mutate input', () => {
    const original = ids(movies);
    sortMovies(movies, 'point_desc');
    expect(ids(movies)).toEqual(original);
  });

  it('sorts watch_date descending', () => {
    expect(ids(sortMovies(movies, 'watch_date_desc'))).toEqual(['b', 'a', 'c']);
  });

  it('sorts watch_date ascending', () => {
    expect(ids(sortMovies(movies, 'watch_date_asc'))).toEqual(['c', 'a', 'b']);
  });

  it('sorts release_date descending', () => {
    expect(ids(sortMovies(movies, 'release_date_desc'))).toEqual(['c', 'b', 'a']);
  });

  it('sorts release_date ascending', () => {
    expect(ids(sortMovies(movies, 'release_date_asc'))).toEqual(['a', 'b', 'c']);
  });

  it('sorts point descending', () => {
    expect(ids(sortMovies(movies, 'point_desc'))).toEqual(['b', 'a', 'c']);
  });

  it('sorts point ascending', () => {
    expect(ids(sortMovies(movies, 'point_asc'))).toEqual(['c', 'a', 'b']);
  });

  it('handles invalid date string as oldest', () => {
    const withBad: Movie[] = [
      make({ id: 'x', watch_date: '2026-01-01' }),
      make({ id: 'y', watch_date: 'not-a-date' }),
    ];
    expect(ids(sortMovies(withBad, 'watch_date_desc'))).toEqual(['x', 'y']);
  });
});
