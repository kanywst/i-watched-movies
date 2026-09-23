import type { Movie } from './types';
import { isValidWatchDate } from './activity';

/**
 * How the top of the diary got to where it is, rebuilt from the entries themselves rather
 * than from git. The Cloudflare build clones the repo at a depth nobody controls here, so a
 * history read out of `git log` would silently shrink to whatever the clone happened to hold.
 *
 * The rated films are replayed in the order they were watched and the top `limit` is
 * re-cut after each one. The price of doing it from content is that every film enters with
 * the score it carries today: a film re-scored after it was logged is replayed at its new
 * score from the day it was watched. The git record shows one case as of 2026-09-23:
 * 死刑にいたる病 sat at #3 at 8.6 for part of 2026-07-13, then was re-scored to 8.4, so
 * the replay never places it in the top at all.
 *
 * Ties go to the incumbent. A film that matches a score already in the top slots sits below
 * the films that got there first, so equalling the #1 score does not take #1. "Highest yet"
 * is the claim a reign makes, and a tie is not higher. The rank badges on the Watched grid
 * break a tie by list order instead (sortMovies is a stable sort over the parsed files), so
 * the two can disagree about which of two tied films is #3 when the tie sits on the cut.
 */

export interface RankEvent {
  /** The day the film that caused the change was watched, as parseMovie wrote it. */
  date: string;
  /** The film whose arrival changed the top. */
  entrant: Movie;
  /** 1-based slot the entrant landed in. */
  rank: number;
  /** The top after the change, best first. */
  top: Movie[];
  /** The film pushed out of the top by this arrival, if the top was already full. */
  displaced: Movie | null;
}

export interface Reign {
  holder: Movie;
  /** The day the holder was watched and went to #1. */
  from: string;
  /** The day it was knocked off, or `null` while it still holds #1. */
  to: string | null;
  /** Whole days held, to `to` or to `now` for the current holder. */
  days: number;
}

export interface RankHistory {
  events: RankEvent[];
  reigns: Reign[];
}

const DAY_MS = 86_400_000;

const dayOf = (iso: string): number => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

// Same-day entries are ordered by when they were logged. `added` is a full ISO instant, so a
// plain string compare orders it; an entry without one sorts after those that have it, and
// the id settles whatever is left so the replay never depends on file order.
function compareReplayOrder(a: Movie, b: Movie): number {
  const byDay = dayOf(a.watch_date) - dayOf(b.watch_date);
  if (byDay !== 0) return byDay;
  if (a.added && b.added && a.added !== b.added) return a.added < b.added ? -1 : 1;
  if (Boolean(a.added) !== Boolean(b.added)) return a.added ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * `watched` must be the rated list (isWatched), the same population RATED_POINTS and the
 * rank badges are built from. Entries without a usable watch_date cannot be placed on the
 * timeline and are skipped.
 */
export function computeRankHistory(watched: Movie[], limit: number, now: Date): RankHistory {
  const replay = watched.filter(m => isValidWatchDate(m.watch_date)).sort(compareReplayOrder);

  const top: Movie[] = [];
  const events: RankEvent[] = [];
  const reigns: Reign[] = [];

  for (const film of replay) {
    // First slot whose holder scores strictly lower. Equal scores stay ahead (incumbency).
    let slot = top.findIndex(m => m.point < film.point);
    if (slot === -1) slot = top.length;
    if (slot >= limit) continue;

    top.splice(slot, 0, film);
    const displaced = top.length > limit ? (top.pop() ?? null) : null;
    events.push({ date: film.watch_date, entrant: film, rank: slot + 1, top: [...top], displaced });

    if (slot === 0) {
      const previous = reigns[reigns.length - 1];
      if (previous) {
        previous.to = film.watch_date;
        previous.days = Math.round((dayOf(film.watch_date) - dayOf(previous.from)) / DAY_MS);
      }
      reigns.push({ holder: film, from: film.watch_date, to: null, days: 0 });
    }
  }

  const current = reigns[reigns.length - 1];
  if (current) {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    current.days = Math.max(0, Math.round((today - dayOf(current.from)) / DAY_MS));
  }

  return { events, reigns };
}
