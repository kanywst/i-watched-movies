import type { SortKey } from './types';
import netflixLogo from './assets/streaming/netflix.svg';
import disneyPlusLogo from './assets/streaming/disneyplus.svg';
import primeVideoLogo from './assets/streaming/primevideo.svg';
import uNextLogo from './assets/streaming/unext.svg';
import huluLogo from './assets/streaming/hulu.svg';

export const RANK_LIMIT = 3;
export const NEW_LIMIT = 2;

// Activity heatmap. GitHub buckets non-zero days into relative quartiles, which is
// unstable for a sparse movie diary (0-3 films/day), so we use fixed absolute cutoffs:
// the minimum film count that reaches level 1..4. `4+` films all land on level 4.
export const ACTIVITY_LEVEL_THRESHOLDS = [1, 2, 3, 4];
// Columns in the trailing-year grid (53 weeks is the GitHub-recognisable width).
export const ACTIVITY_WEEKS = 53;

// Taste analysis (src/taste.ts).
// An affinity built on one film is noise, so anything below MIN_AFFINITY_SAMPLE is shown
// but never used to call a genre a favourite. AFFINITY_PRIOR shrinks a small sample back
// toward the personal baseline when predicting a score: weight = count / (count + prior),
// so a 2-film genre only carries 40% of its measured delta while a 15-film one carries 83%.
export const MIN_AFFINITY_SAMPLE = 2;
export const AFFINITY_PRIOR = 3;
// National is a weaker signal than genre, so it moves a prediction by half as much.
export const COUNTRY_AFFINITY_WEIGHT = 0.5;
// Score histogram bucket width, and the band (± this) counted as "at the baseline".
export const SCORE_BUCKET_STEP = 0.5;
// A rating this many standard deviations from the mean is called out as an outlier.
export const OUTLIER_SIGMA = 2;
export const RECOMMENDATION_LIMIT = 12;
export const REASON_LIMIT = 2;
// A film watched within this many days of release counts as caught on release.
export const NEW_RELEASE_WINDOW_DAYS = 90;
// Below this many rated films, an early-half vs late-half average says nothing.
export const MIN_DRIFT_SAMPLE = 6;

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

// Streaming badges shown on watchlist entries. Keyed by the value written to a movie's
// `streaming` frontmatter. Like COUNTRY_FLAGS, a service with no entry here renders no
// badge. Each badge is a solid brand-colour pill; `logo`, when present, is a bundled SVG
// repainted to a flat white silhouette at render time (so the source colours never fight
// the pill and it reads identically in light and dark), otherwise the label is white text.
// `search`, when present, is a verified per-service search URL; services without a
// crawlable search page (e.g. Disney+, whose search is an auth-gated SPA route) fall back
// to justWatchSearchUrl so every badge still links somewhere current.
export interface StreamingService {
  label: string;
  // Solid pill background; white content is chosen to stay legible on it.
  brandBg: string;
  // Bundled SVG logo, repainted to white at render time (brightness(0) invert(1)).
  logo?: string;
  search?: (title: string) => string;
}

export const STREAMING_SERVICES: Record<string, StreamingService> = {
  Netflix: {
    label: 'Netflix',
    brandBg: '#E50914',
    logo: netflixLogo,
    search: (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,
  },
  'Disney+': {
    label: 'Disney+',
    brandBg: '#113CCF',
    logo: disneyPlusLogo,
  },
  'Prime Video': {
    label: 'Prime Video',
    brandBg: '#146EB4',
    logo: primeVideoLogo,
    search: (t) => `https://www.amazon.co.jp/s?k=${encodeURIComponent(t)}&i=prime-instant-video`,
  },
  'U-NEXT': {
    label: 'U-NEXT',
    brandBg: '#000000',
    logo: uNextLogo,
  },
  Hulu: {
    label: 'Hulu',
    brandBg: '#00778B',
    logo: huluLogo,
  },
};

// JustWatch JP search for a title: always current, region-correct, and the fallback link
// for both unmapped services and the "re-check availability" affordance.
export function justWatchSearchUrl(title: string): string {
  return `https://www.justwatch.com/jp/検索?q=${encodeURIComponent(title)}`;
}

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'watch_date_desc', label: 'Watch Date (Newest)' },
  { value: 'watch_date_asc', label: 'Watch Date (Oldest)' },
  { value: 'point_desc', label: 'Score (High to Low)' },
  { value: 'point_asc', label: 'Score (Low to High)' },
  { value: 'release_date_desc', label: 'Release Date (Newest)' },
  { value: 'release_date_asc', label: 'Release Date (Oldest)' },
];
