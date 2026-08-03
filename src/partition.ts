import type { Movie } from './types';
import { isValidWatchDate } from './activity';

/**
 * The rules that split the diary into its three states, kept separate from the data they
 * are applied to (src/collections.ts) so they can be unit-tested. `src/data/movies.json` is
 * a gitignored build artifact and CI runs `npm test` before `npm run build`, so anything
 * that imports it cannot be covered by a test.
 *
 * The three states are mutually exclusive and exhaustive:
 *
 * - watched   `published && !seen`  rated, shows a score
 * - watchlist `!published && !seen` not watched yet
 * - seen      `seen`                watched but deliberately unrated
 */
export const isWatched = (m: Movie): boolean => m.published && !m.seen;
export const isWatchlist = (m: Movie): boolean => !m.published && !m.seen;
export const isSeen = (m: Movie): boolean => Boolean(m.seen);

/** Everything actually watched, rated or not. This is what the History view plots. */
export const isHistory = (m: Movie): boolean => m.published || Boolean(m.seen);

export interface MoviePartitions {
  watched: Movie[];
  watchlist: Movie[];
  seen: Movie[];
  history: Movie[];
}

export function partitionMovies(movies: Movie[]): MoviePartitions {
  return {
    watched: movies.filter(isWatched),
    watchlist: movies.filter(isWatchlist),
    seen: movies.filter(isSeen),
    history: movies.filter(isHistory),
  };
}

/**
 * History entries with a usable watch_date. Watchlist entries legitimately carry an empty
 * one, and this is the figure the History tab badge shows, so it cannot be a list length.
 */
export const countLogged = (movies: Movie[]): number =>
  movies.filter(m => isValidWatchDate(m.watch_date)).length;

export const countGenres = (movies: Movie[]): number =>
  new Set(movies.flatMap(m => m.tags)).size;
