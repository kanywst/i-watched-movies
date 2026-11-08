import { describe, expect, it } from 'vitest';
import { recommendationOrder } from './recommendOrder';
import type { Movie } from './types';

const make = (id: string, overrides: Partial<Movie> = {}): Movie => ({
  id,
  title: id,
  published: false,
  tags: [],
  cover_image: '',
  release_date: '',
  watch_date: '',
  point: 0,
  content: '',
  ...overrides,
});

const placed = (order: Map<string, number>) =>
  [...order.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);

describe('recommendationOrder', () => {
  it('puts hand-ranked films first by rank, then the rest by predicted score', () => {
    const list = [
      make('model-high'),
      make('ranked-2', { recommend_rank: 2 }),
      make('model-low'),
      make('ranked-1', { recommend_rank: 1 }),
    ];
    const predicted = new Map([
      ['model-high', 9],
      ['model-low', 6],
      // A hand rank beats the model even where the model disagrees.
      ['ranked-2', 1],
      ['ranked-1', 2],
    ]);
    expect(placed(recommendationOrder(list, predicted))).toEqual([
      'ranked-1',
      'ranked-2',
      'model-high',
      'model-low',
    ]);
  });

  it('numbers places from 1', () => {
    const order = recommendationOrder([make('a'), make('b')], new Map([['a', 8], ['b', 7]]));
    expect(order.get('a')).toBe(1);
    expect(order.get('b')).toBe(2);
  });

  it('breaks a predicted tie by the newest addition, then by id', () => {
    const list = [
      make('old', { added: '2026-01-01T00:00:00Z' }),
      make('new', { added: '2026-02-01T00:00:00Z' }),
      make('b-same', { added: '2026-01-15T00:00:00Z' }),
      make('a-same', { added: '2026-01-15T00:00:00Z' }),
    ];
    const predicted = new Map(list.map(m => [m.id, 7]));
    expect(placed(recommendationOrder(list, predicted))).toEqual(['new', 'a-same', 'b-same', 'old']);
  });

  it('sorts a film the model did not score after every scored one', () => {
    const list = [make('unscored'), make('scored')];
    expect(placed(recommendationOrder(list, new Map([['scored', 0]])))).toEqual(['scored', 'unscored']);
  });

  it('does not depend on the input order', () => {
    const list = [make('a', { recommend_rank: 1 }), make('b'), make('c')];
    const predicted = new Map([['b', 8], ['c', 7]]);
    expect(placed(recommendationOrder([...list].reverse(), predicted))).toEqual(
      placed(recommendationOrder(list, predicted)),
    );
  });
});
