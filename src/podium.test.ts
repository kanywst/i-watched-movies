// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Movie } from './types';
import { podiumSteps, rankById } from './podium';

const make = (id: string, point: number, watch_date = '2026-01-01'): Movie => ({
  id,
  title: id.toUpperCase(),
  published: true,
  tags: [],
  cover_image: '',
  release_date: '2025-01-01',
  watch_date,
  point,
  content: '',
});

const shape = (movies: Movie[], limit = 3) =>
  podiumSteps(movies, limit).map(s => [s.rank, s.point, s.movies.map(m => m.id)]);

describe('podiumSteps', () => {
  it('ranks distinct scores 1, 2, 3 from the top and stops at the limit', () => {
    const movies = [make('c', 8.7), make('a', 8.9), make('d', 8.6), make('b', 8.8)];
    expect(shape(movies)).toEqual([
      [1, 8.9, ['a']],
      [2, 8.8, ['b']],
      [3, 8.7, ['c']],
    ]);
  });

  it('puts tied films on one step instead of ranking them by list order', () => {
    const movies = [make('a', 9), make('b', 8), make('c', 8), make('d', 7)];
    expect(shape(movies)).toEqual([
      [1, 9, ['a']],
      [2, 8, ['b', 'c']],
    ]);
  });

  it('skips the place a tie uses up (competition ranking, not dense)', () => {
    // Two films share first, so the next score down has two films above it: third, not second.
    const movies = [make('a', 9), make('b', 9), make('c', 8), make('d', 7)];
    expect(shape(movies)).toEqual([
      [1, 9, ['a', 'b']],
      [3, 8, ['c']],
    ]);
  });

  it('keeps a whole tie on the last place even when that overfills the podium', () => {
    const movies = [make('a', 9), make('b', 8.8), make('c', 8.5), make('d', 8.5), make('e', 8.5)];
    const steps = podiumSteps(movies, 3);
    expect(steps[steps.length - 1]).toMatchObject({ rank: 3, point: 8.5 });
    expect(steps.flatMap(s => s.movies).length).toBe(5);
  });

  it('drops a step whose rank lands past the limit', () => {
    // Three films tie on first, so 8 is fourth and has no place on a three-step podium.
    const movies = [make('a', 9), make('b', 9), make('c', 9), make('d', 8)];
    expect(shape(movies)).toEqual([[1, 9, ['a', 'b', 'c']]]);
  });

  it('leads a step with the film that was watched first', () => {
    const movies = [make('late', 9, '2026-09-01'), make('early', 9, '2026-01-05')];
    expect(podiumSteps(movies, 3)[0].movies.map(m => m.id)).toEqual(['early', 'late']);
  });

  it('puts an undated film behind the dated ones on its step', () => {
    const movies = [make('undated', 9, ''), make('dated', 9, '2026-09-01')];
    expect(podiumSteps(movies, 3)[0].movies.map(m => m.id)).toEqual(['dated', 'undated']);
  });

  it('orders numerically, not lexicographically', () => {
    expect(shape([make('nine', 9), make('ten', 10)], 1)).toEqual([[1, 10, ['ten']]]);
  });

  it('returns nothing for an empty diary', () => {
    expect(podiumSteps([], 3)).toEqual([]);
  });

  it('leaves the list it was handed alone', () => {
    const movies = [make('b', 8, '2026-02-01'), make('a', 8, '2026-01-01')];
    podiumSteps(movies, 3);
    expect(movies.map(m => m.id)).toEqual(['b', 'a']);
  });
});

describe('rankById', () => {
  it('gives every film on a step that step\'s rank', () => {
    const movies = [make('a', 9), make('b', 9), make('c', 8), make('d', 1)];
    const ranks = rankById(podiumSteps(movies, 3));
    expect(Object.fromEntries(ranks)).toEqual({ a: 1, b: 1, c: 3 });
  });
});
