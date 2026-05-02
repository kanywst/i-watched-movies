import matter from 'gray-matter';

export function parseMovie(fileContent, id) {
  const { data, content } = matter(fileContent);

  if (data.published === false) return null;

  return {
    id,
    title: data.title || 'Untitled',
    published: data.published ?? true,
    tags: data.tags || [],
    national: data.national || null,
    cover_image: data.cover_image || '',
    release_date: data.release_date ? new Date(data.release_date).toISOString() : null,
    watch_date: data.watch_date ? new Date(data.watch_date).toISOString() : null,
    point: data.point || 0,
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
