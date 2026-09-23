import type { Movie } from './types';

/**
 * One step of the podium: every film sharing one score, and the place that score holds.
 *
 * A step is a score, not a film, because the diary is scored to a tenth and ties are
 * common further down (six films shared 8.5 at one point). Handing out 1, 2, 3 by array
 * position would crown whichever tied film happened to sort first and quietly demote an
 * equal to a lower place, which the podium would then print in a large numeral.
 */
export interface PodiumStep {
  /** Competition ranking ("1224"): one more than the number of films scored strictly higher. */
  rank: number;
  point: number;
  /**
   * The films on this step, earliest watched first. That order is for display only (which
   * poster leads the step) and implies nothing about standing: the film that reached the
   * score first keeps the front of the step rather than being bumped by a later equal.
   */
  movies: Movie[];
}

const byWatchDateAsc = (a: Movie, b: Movie): number => {
  // An undated film goes behind the dated ones on its step. Watched entries always carry a
  // date today, but the ordering should not depend on that staying true.
  if (!a.watch_date !== !b.watch_date) return a.watch_date ? -1 : 1;
  return a.watch_date.localeCompare(b.watch_date) || a.id.localeCompare(b.id);
};

/**
 * The podium over `movies`: score steps from the top, kept while their competition rank is
 * within `limit`.
 *
 * Competition ranking rather than dense ranking on purpose. With two films tied on top, the
 * next score down is third, not second: two films really are above it, and a "2" would claim
 * otherwise. So a tie can leave a place empty, and a tie on the last place kept can put more
 * than `limit` films on the podium; both are the honest outcome.
 */
export function podiumSteps(movies: Movie[], limit: number): PodiumStep[] {
  const byPoint = new Map<number, Movie[]>();
  for (const m of movies) {
    const step = byPoint.get(m.point);
    if (step) step.push(m);
    else byPoint.set(m.point, [m]);
  }

  const steps: PodiumStep[] = [];
  let above = 0;
  for (const point of [...byPoint.keys()].sort((a, b) => b - a)) {
    const rank = above + 1;
    if (rank > limit) break;
    const group = byPoint.get(point)!;
    steps.push({ rank, point, movies: group.sort(byWatchDateAsc) });
    above += group.length;
  }
  return steps;
}

/** Film id to its podium place, for the rank marker on a grid card. */
export function rankById(steps: PodiumStep[]): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const step of steps) for (const m of step.movies) ranks.set(m.id, step.rank);
  return ranks;
}
