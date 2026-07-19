import matter from 'gray-matter';

function normalizePoint(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
    content,
  };
}

export function compareByWatchDateDesc(a, b) {
  const dateA = a.watch_date ? new Date(a.watch_date).getTime() : 0;
  const dateB = b.watch_date ? new Date(b.watch_date).getTime() : 0;
  return dateB - dateA;
}
