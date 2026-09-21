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
  make({ id: 'a', watch_date: '2026-01-01', release_date: '2024-06-01', point: 7, added: '2026-02-01T00:00:00Z' }),
  make({ id: 'b', watch_date: '2026-03-01', release_date: '2025-01-01', point: 9, added: '2026-01-01T00:00:00Z' }),
  make({ id: 'c', watch_date: '2025-12-01', release_date: '2026-01-01', point: 5, added: '2026-03-01T00:00:00Z' }),
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

  it('sorts added descending', () => {
    expect(ids(sortMovies(movies, 'added_desc'))).toEqual(['c', 'a', 'b']);
  });

  it('sorts added ascending', () => {
    expect(ids(sortMovies(movies, 'added_asc'))).toEqual(['b', 'a', 'c']);
  });

  // added orders the lists that carry no watch_date, and it is the one sort key whose
  // field is optional on Movie, so a stampless entry has to land at the bottom of _desc
  // rather than in the middle of the run.
  it('puts an entry with no added stamp last under added_desc', () => {
    const withMissing: Movie[] = [
      make({ id: 'old', added: '2026-01-01T00:00:00Z' }),
      make({ id: 'none' }),
      make({ id: 'new', added: '2026-06-01T00:00:00Z' }),
    ];
    expect(ids(sortMovies(withMissing, 'added_desc'))).toEqual(['new', 'old', 'none']);
  });

  // The reason the key exists: every entry outside Watched has an empty watch_date, so
  // added has to be read off its own field rather than fall through to the date sort.
  it('orders entries that share an empty watch_date', () => {
    const unwatched: Movie[] = [
      make({ id: 'first', watch_date: '', added: '2026-01-01T00:00:00Z' }),
      make({ id: 'second', watch_date: '', added: '2026-05-01T00:00:00Z' }),
    ];
    expect(ids(sortMovies(unwatched, 'added_desc'))).toEqual(['second', 'first']);
    expect(ids(sortMovies(unwatched, 'watch_date_desc'))).toEqual(['first', 'second']);
  });

  it('orders two stamps within the same day, which a date-only stamp could not', () => {
    const sameDay: Movie[] = [
      make({ id: 'morning', added: '2026-09-12T09:15:00Z' }),
      make({ id: 'evening', added: '2026-09-12T21:40:00Z' }),
    ];
    expect(ids(sortMovies(sameDay, 'added_desc'))).toEqual(['evening', 'morning']);
  });

  it('handles invalid date string as oldest', () => {
    const withBad: Movie[] = [
      make({ id: 'x', watch_date: '2026-01-01' }),
      make({ id: 'y', watch_date: 'not-a-date' }),
    ];
    expect(ids(sortMovies(withBad, 'watch_date_desc'))).toEqual(['x', 'y']);
  });
});
