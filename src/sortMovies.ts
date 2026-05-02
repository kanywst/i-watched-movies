import type { Movie, SortKey } from './types';

const dateValue = (s: string): number => new Date(s).getTime();

export function sortMovies(movies: Movie[], key: SortKey): Movie[] {
  const sorted = [...movies];
  switch (key) {
    case 'watch_date_desc':
      return sorted.sort((a, b) => dateValue(b.watch_date) - dateValue(a.watch_date));
    case 'watch_date_asc':
      return sorted.sort((a, b) => dateValue(a.watch_date) - dateValue(b.watch_date));
    case 'release_date_desc':
      return sorted.sort((a, b) => dateValue(b.release_date) - dateValue(a.release_date));
    case 'release_date_asc':
      return sorted.sort((a, b) => dateValue(a.release_date) - dateValue(b.release_date));
    case 'point_desc':
      return sorted.sort((a, b) => Number(b.point) - Number(a.point));
    case 'point_asc':
      return sorted.sort((a, b) => Number(a.point) - Number(b.point));
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
