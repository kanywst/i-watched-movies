import type { Movie, SortKey } from './types';

const dateValue = (s: string): number => {
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
};

export function sortMovies(movies: Movie[], key: SortKey): Movie[] {
  const sorted = [...movies];
  switch (key) {
    case 'watch_date_desc':
      return sorted.sort((a, b) => dateValue(b.watch_date) - dateValue(a.watch_date));
    case 'watch_date_asc':
      return sorted.sort((a, b) => dateValue(a.watch_date) - dateValue(b.watch_date));
    // `added` is optional on Movie, so an entry written before the stamp existed scores 0
    // and lands at the bottom under _desc rather than somewhere in the middle of the run.
    case 'added_desc':
      return sorted.sort((a, b) => dateValue(b.added ?? '') - dateValue(a.added ?? ''));
    case 'added_asc':
      return sorted.sort((a, b) => dateValue(a.added ?? '') - dateValue(b.added ?? ''));
    case 'release_date_desc':
      return sorted.sort((a, b) => dateValue(b.release_date) - dateValue(a.release_date));
    case 'release_date_asc':
      return sorted.sort((a, b) => dateValue(a.release_date) - dateValue(b.release_date));
    case 'point_desc':
      return sorted.sort((a, b) => b.point - a.point);
    case 'point_asc':
      return sorted.sort((a, b) => a.point - b.point);
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
