/**
 * TMDB serves a poster at whatever width the path asks for, and every cover_image written
 * into movies/ so far uses `/t/p/original/`. For a grid card that means fetching a
 * 2000x3000 JPEG to paint a poster about 220px wide: measured across the watchlist the
 * originals average 596 KB and reach 2.4 MB, roughly 100 MB for one render of the grid.
 *
 * The width is rewritten here at render time rather than in the 202 markdown files that
 * hold an `original` URL, so the source stays the highest-quality reference and any future
 * layout can ask for a different size. Every other host in the diary (wikimedia, eiga.com,
 * gstatic) serves one fixed file with no size in the path, so those URLs pass through
 * untouched and keep working exactly as before.
 */

/** Widths TMDB actually publishes for posters. Anything else 404s. */
export type TmdbWidth = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780';

const TMDB_ORIGINAL = /^(https:\/\/image\.tmdb\.org\/t\/p\/)original(\/.+)$/;

/** `.../t/p/original/x.jpg` at the given width. Any other URL is returned unchanged. */
export function tmdbResize(url: string, width: TmdbWidth): string {
  const m = TMDB_ORIGINAL.exec(url);
  return m ? `${m[1]}${width}${m[2]}` : url;
}

/**
 * A `srcSet` for a TMDB poster, or undefined for a host that cannot be resized (in which
 * case the caller should omit the attribute rather than emit a single-candidate set).
 */
export function tmdbSrcSet(url: string, widths: TmdbWidth[]): string | undefined {
  if (!TMDB_ORIGINAL.test(url)) return undefined;
  return widths.map((w) => `${tmdbResize(url, w)} ${w.slice(1)}w`).join(', ');
}
