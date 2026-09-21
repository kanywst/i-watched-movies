import matter from 'gray-matter';

function normalizePoint(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStreaming(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

// `checked` is a "last verified" stamp at month granularity. An unquoted YYYY-MM-DD in
// YAML parses to a Date, so coerce that back to a YYYY-MM string; anything else passes
// through as a trimmed string.
function normalizeChecked(value) {
  if (value === undefined || value === null || value === '') return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 7);
  }
  const m = String(value).trim().match(/^\d{4}-(?:0[1-9]|1[0-2])/);
  return m ? m[0] : '';
}

const SEASON_STATUSES = new Set(['watched', 'watching', 'dropped']);

function seasonDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// A series entry can carry a record per season. The season scores are deliberately not
// folded into the entry's own `point`: an abandoned series is unrated as a whole (point 0,
// `dropped: true`), and RATED_POINTS is built from entry points, so a season score stays
// out of the score bands and the taste figures. See `seasons` in src/types.ts.
//
// A season without a usable number is dropped rather than renumbered, since its position in
// the list is not evidence of which season it is. Sorted by number so the file's order does
// not decide the display order.
function normalizeSeasons(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(raw => {
      if (!raw || typeof raw !== 'object') return null;
      const season = Number(raw.season);
      if (!Number.isFinite(season)) return null;
      const point = normalizeSeasonPoint(raw.point);
      const status = String(raw.status ?? '').trim().toLowerCase();
      return {
        season,
        point,
        status: SEASON_STATUSES.has(status) ? status : 'watched',
        watch_date: seasonDate(raw.watch_date),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.season - b.season);
}

// Null, not 0: a season watched but left unrated has no score, and 0 is a real score on a
// scale that starts there. This is why it does not share normalizePoint.
function normalizeSeasonPoint(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseMovie(fileContent, id) {
  const { data, content } = matter(fileContent);

  return {
    id,
    title: data.title || 'Untitled',
    published: data.published ?? true,
    seen: data.seen ?? false,
    watching: data.watching ?? false,
    dropped: data.dropped ?? false,
    tags: data.tags || [],
    national: data.national || null,
    cover_image: data.cover_image || '',
    release_date: data.release_date ? new Date(data.release_date).toISOString() : null,
    watch_date: data.watch_date ? new Date(data.watch_date).toISOString() : null,
    point: normalizePoint(data.point),
    seasons: normalizeSeasons(data.seasons),
    summary: data.summary || '',
    summary_ja: data.summary_ja || '',
    impression: data.impression || '',
    streaming: normalizeStreaming(data.streaming),
    checked: normalizeChecked(data.checked),
    added: data.added ? new Date(data.added).toISOString() : null,
    content,
  };
}

export function compareByWatchDateDesc(a, b) {
  const dateA = a.watch_date ? new Date(a.watch_date).getTime() : 0;
  const dateB = b.watch_date ? new Date(b.watch_date).getTime() : 0;
  return dateB - dateA;
}
