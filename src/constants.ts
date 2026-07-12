import type { SortKey } from './types';

export const RANK_LIMIT = 3;
export const NEW_LIMIT = 2;

export const COUNTRY_FLAGS: Record<string, string> = {
  Japan: '🇯🇵',
  USA: '🇺🇸',
  UK: '🇬🇧',
  France: '🇫🇷',
  Korea: '🇰🇷',
  China: '🇨🇳',
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
