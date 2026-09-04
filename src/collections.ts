import moviesData from './data/movies.json';
import type { Movie, View } from './types';
import { countGenres, countLogged, partitionMovies } from './partition';

/**
 * The diary is a static JSON module baked at build time, so every partition of it is a
 * constant. Deriving them here rather than in App means the filters run once per page load
 * instead of once per component instance, and it removes a row of `useMemo(..., [allMovies])`
 * guards that were protecting against a dependency that could never change.
 *
 * This module is data only; the rules live in src/partition.ts, which is what the tests
 * cover (movies.json is a gitignored build artifact and CI tests before it is generated).
 */
export const ALL_MOVIES = moviesData as Movie[];

const PARTITIONS = partitionMovies(ALL_MOVIES);

export const WATCHED_MOVIES = PARTITIONS.watched;
export const WATCHING_MOVIES = PARTITIONS.watching;
export const WATCHLIST_MOVIES = PARTITIONS.watchlist;
export const SEEN_MOVIES = PARTITIONS.seen;
export const HISTORY_MOVIES = PARTITIONS.history;

export const HISTORY_COUNT = countLogged(HISTORY_MOVIES);
export const SEEN_GENRE_COUNT = countGenres(SEEN_MOVIES);
export const WATCHING_GENRE_COUNT = countGenres(WATCHING_MOVIES);

/**
 * Tab badge counts. History counts entries with a usable watch_date rather than the raw list
 * length, and Stats deliberately shows none (its figure would only repeat Watched's), so
 * this cannot be read off the source lists alone.
 */
export const TAB_COUNTS: Record<View, number> = {
  watched: WATCHED_MOVIES.length,
  watching: WATCHING_MOVIES.length,
  watchlist: WATCHLIST_MOVIES.length,
  seen: SEEN_MOVIES.length,
  history: HISTORY_COUNT,
  stats: 0,
};
