import type { Movie } from './types';
import { isValidWatchDate } from './activity';

/**
 * The rules that split the diary into its five states, kept separate from the data they
 * are applied to (src/collections.ts) so they can be unit-tested. `src/data/movies.json` is
 * a gitignored build artifact and CI runs `npm test` before `npm run build`, so anything
 * that imports it cannot be covered by a test.
 *
 * The five states are mutually exclusive and exhaustive, in this order of precedence:
 *
 * - dropped   `dropped`              started and abandoned partway, never finished
 * - watching  `watching`             started, not finished (a long series, mostly)
 * - seen      `seen`                 watched through but deliberately unrated
 * - watched   `published && !seen`   rated, shows a score
 * - watchlist `!published && !seen`  not watched yet
 *
 * `watching` wins over the score flags rather than being a combination of them: a series in
 * flight is neither on the watchlist any more nor watched yet, and the score it will
 * eventually get must not be there while it is being watched. `dropped` in turn wins over
 * `watching`, because giving up is what ends a viewing that was in progress, and the issue
 * pipeline re-files the same entry rather than writing a second one. Everything else is
 * therefore written `!m.dropped && !m.watching && ...`, which is what keeps the split
 * exhaustive when an entry is later re-filed by the issue pipeline.
 */
export const isDropped = (m: Movie): boolean => Boolean(m.dropped);
export const isWatching = (m: Movie): boolean => !m.dropped && Boolean(m.watching);
export const isSeen = (m: Movie): boolean => !m.dropped && !m.watching && Boolean(m.seen);
export const isWatched = (m: Movie): boolean =>
  !m.dropped && !m.watching && m.published && !m.seen;
export const isWatchlist = (m: Movie): boolean =>
  !m.dropped && !m.watching && !m.published && !m.seen;

/**
 * Everything actually watched through, rated or not. This is what the History view plots,
 * so an unfinished series is excluded (there is no date on which it was watched yet), and
 * so is an abandoned one: it was never watched through at all.
 */
export const isHistory = (m: Movie): boolean =>
  !m.dropped && !m.watching && (m.published || Boolean(m.seen));

export interface MoviePartitions {
  watched: Movie[];
  watching: Movie[];
  watchlist: Movie[];
  seen: Movie[];
  dropped: Movie[];
  history: Movie[];
}

export function partitionMovies(movies: Movie[]): MoviePartitions {
  return {
    watched: movies.filter(isWatched),
    watching: movies.filter(isWatching),
    watchlist: movies.filter(isWatchlist),
    seen: movies.filter(isSeen),
    dropped: movies.filter(isDropped),
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
