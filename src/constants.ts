import type { SortKey } from './types';

export const RANK_LIMIT = 3;
export const NEW_LIMIT = 2;

// Activity heatmap. GitHub buckets non-zero days into relative quartiles, which is
// unstable for a sparse movie diary (0-3 films/day), so we use fixed absolute cutoffs:
// the minimum film count that reaches level 1..4. `4+` films all land on level 4.
export const ACTIVITY_LEVEL_THRESHOLDS = [1, 2, 3, 4];
// Columns in the trailing-year grid (53 weeks is the GitHub-recognisable width).
export const ACTIVITY_WEEKS = 53;

export const COUNTRY_FLAGS: Record<string, string> = {
  Japan: '🇯🇵',
  USA: '🇺🇸',
  UK: '🇬🇧',
  France: '🇫🇷',
  Korea: '🇰🇷',
  China: '🇨🇳',
  'Hong Kong': '🇭🇰',
  India: '🇮🇳',
  Germany: '🇩🇪',
  Canada: '🇨🇦',
  Australia: '🇦🇺',
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'watch_date_desc', label: 'Watch Date (Newest)' },
  { value: 'watch_date_asc', label: 'Watch Date (Oldest)' },
  { value: 'point_desc', label: 'Score (High to Low)' },
  { value: 'point_asc', label: 'Score (Low to High)' },
  { value: 'release_date_desc', label: 'Release Date (Newest)' },
  { value: 'release_date_asc', label: 'Release Date (Oldest)' },
];
