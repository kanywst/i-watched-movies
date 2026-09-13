import { Movie, Season } from './types';

/**
 * The one season a card is allowed to print, or null.
 *
 * A card has room for a single figure, and the entry's own score is not it for a series
 * watched partway: `point` is 0 there and `isWatched` is false, so the chip is suppressed
 * and the 7.3 that was actually earned never reaches the grid. This picks the season that
 * stands in for it.
 *
 * Lowest-numbered scored season rather than the highest, the newest, or the best. The grid
 * is a diary and the first season is where a series is judged from; picking the best would
 * make the chip an argument for the show rather than a record of it, and picking the newest
 * would move a card's number as later seasons are logged, which is the thing rank and NEW
 * badges are deliberately built to avoid.
 *
 * Unscored seasons are skipped rather than ending the search, so a series whose first season
 * was left unrated still shows the first one that carries a number.
 */
export function firstScoredSeason(seasons: Season[] | undefined): Season | null {
  if (!seasons || seasons.length === 0) return null;
  let best: Season | null = null;
  for (const s of seasons) {
    if (s.point === null) continue;
    if (!best || s.season < best.season) best = s;
  }
  return best;
}

/**
 * The season score a card should fall back to, or null when the entry has its own score.
 *
 * `hasEntryScore` is the caller's `isWatched(movie)`, passed in rather than imported so the
 * card cannot end up applying one rule and this another. A rated entry keeps the chip it
 * already has: the entry as a whole is rated once or not at all, and two figures in one
 * corner is a worse card than one.
 */
export function cardSeasonScore(movie: Movie, hasEntryScore: boolean): Season | null {
  if (hasEntryScore) return null;
  return firstScoredSeason(movie.seasons);
}
