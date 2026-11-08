import type { Movie } from './types';

const addedValue = (m: Movie): number => {
  const t = new Date(m.added ?? '').getTime();
  return Number.isFinite(t) ? t : 0;
};

/**
 * The watchlist's "Recommended" order, as each film's 1-based place.
 *
 * Hand-set ranks (`recommend_rank`) come first, lowest number first. Everything unranked
 * follows, ordered by `predicted`, which is recommendWatchlist's score: the model on its own
 * barely beats guessing the average (Stats prints the live figure), so it orders the tail
 * rather than the head. Ties fall back to the newest addition, then the id, so the order is
 * total and does not depend on the input's order.
 *
 * Built from the whole watchlist, not the filtered grid, on the same rule as the Watched
 * view's ranks: a film's place must not move because the grid is searched or filtered.
 */
export function recommendationOrder(
  watchlist: Movie[],
  predicted: ReadonlyMap<string, number>,
): Map<string, number> {
  const score = (m: Movie) => predicted.get(m.id) ?? -Infinity;
  const rank = (m: Movie) => m.recommend_rank ?? Infinity;
  const sorted = [...watchlist].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      score(b) - score(a) ||
      addedValue(b) - addedValue(a) ||
      a.id.localeCompare(b.id),
  );
  return new Map(sorted.map((m, i) => [m.id, i + 1]));
}
