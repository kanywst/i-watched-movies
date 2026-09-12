import type { Movie } from './types';
import { SCORE_BAND_CUTS } from './constants';

/**
 * Where one score stands in the diary as a whole.
 *
 * The scores are tight. Measured on 2026-09-12, across 56 rated films, the quartiles are
 * 7.2 / 7.7 / 8.2: the middle half of the diary sits inside a single point. An absolute
 * 0-10 ramp would therefore give nearly every film the same treatment and say nothing, so a
 * band is cut on percentile within the diary instead, which is what "rated high" and "rated
 * low" actually mean on one person's scale. That figure moves as the diary grows; it is
 * recorded to justify the approach, not relied on by the code.
 *
 * Pure and separate from src/collections.ts (which applies it to the baked-in JSON) for the
 * same reason as src/partition.ts: movies.json is a gitignored build artifact, so anything
 * importing it cannot be unit-tested.
 */
export type ScoreBand = 'low' | 'mid' | 'high' | 'top';

/** Ascending rated points: the population a band is measured against. */
export function buildRatedPoints(movies: Movie[]): number[] {
  return movies.map(m => m.point).sort((a, b) => a - b);
}

/**
 * Share of the diary a score stands at or above, 0-1.
 *
 * Ties are split down the middle (the midrank convention) rather than counted as beaten or
 * not: six films shared 8.5 when this was written, and either alternative would hand the
 * same number either the whole block or none of it, moving it a tenth of the diary for
 * free. A linear scan is fine at this size, one pass over ~56 numbers per card that carries
 * a score.
 *
 * For a score that is itself in `rated` the result is strictly inside (0, 1), since the
 * score always counts half of itself. A score absent from `rated` can reach both ends: the
 * modal reads a band for every entry it opens, including an unrated one whose point is 0,
 * and 0 is in no rated list. An empty `rated` has no diary to compare against at all, so it
 * reports the midpoint, which puts the score in the neutral band rather than at an extreme.
 */
export function percentileOf(rated: number[], point: number): number {
  if (rated.length === 0) return 0.5;
  let below = 0;
  let equal = 0;
  for (const p of rated) {
    if (p < point) below += 1;
    else if (p === point) equal += 1;
  }
  return (below + equal / 2) / rated.length;
}

/** The cuts are inclusive: a score landing exactly on one takes the higher band. */
export function bandOf(rated: number[], point: number): ScoreBand {
  const p = percentileOf(rated, point);
  if (p >= SCORE_BAND_CUTS.top) return 'top';
  if (p >= SCORE_BAND_CUTS.high) return 'high';
  if (p >= SCORE_BAND_CUTS.mid) return 'mid';
  return 'low';
}

/**
 * How many rated films a score beats outright, for the line the modal prints under it.
 *
 * A strict count rather than the percentile the bands are cut on, because the sentence
 * around it claims a strict comparison and the midrank does not support one: a 7.2 tied
 * with five other films stands above 13 of 56, and its midrank of 29% would read as
 * standing above 16. Ties belong in the band, where they are the point, and out of the
 * count, where they would be a false claim.
 */
export function countRatedBelow(rated: number[], point: number): number {
  return rated.reduce((n, p) => (p < point ? n + 1 : n), 0);
}
