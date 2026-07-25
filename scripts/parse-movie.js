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
  const m = String(value).trim().match(/^\d{4}-\d{2}/);
  return m ? m[0] : '';
}

export function parseMovie(fileContent, id) {
  const { data, content } = matter(fileContent);

  return {
    id,
    title: data.title || 'Untitled',
    published: data.published ?? true,
    seen: data.seen ?? false,
    tags: data.tags || [],
    national: data.national || null,
    cover_image: data.cover_image || '',
    release_date: data.release_date ? new Date(data.release_date).toISOString() : null,
    watch_date: data.watch_date ? new Date(data.watch_date).toISOString() : null,
    point: normalizePoint(data.point),
    summary: data.summary || '',
    impression: data.impression || '',
    streaming: normalizeStreaming(data.streaming),
    checked: normalizeChecked(data.checked),
    content,
  };
}

export function compareByWatchDateDesc(a, b) {
  const dateA = a.watch_date ? new Date(a.watch_date).getTime() : 0;
  const dateB = b.watch_date ? new Date(b.watch_date).getTime() : 0;
  return dateB - dateA;
}
