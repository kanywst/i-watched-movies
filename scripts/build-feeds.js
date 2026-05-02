const SITE_URL = 'https://i-watched-movies.kanywst12.workers.dev/';
const SITE_NAME = 'The Movies kanywst Watched';
const SITE_DESC = 'A personal archive of movies kanywst has watched, with scores and impressions.';
const FEED_LIMIT = 20;

const escape = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function buildJsonLd(movies) {
  const watched = movies.filter(m => m.published);
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: SITE_NAME,
    description: SITE_DESC,
    url: SITE_URL,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: watched.length,
      itemListElement: watched.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Movie',
          name: m.title,
          image: m.cover_image || undefined,
          datePublished: m.release_date || undefined,
          countryOfOrigin: m.national || undefined,
          genre: m.tags?.length ? m.tags : undefined,
          aggregateRating: m.point > 0
            ? {
              '@type': 'AggregateRating',
              ratingValue: m.point,
              bestRating: 10,
              worstRating: 0,
              ratingCount: 1,
            }
            : undefined,
        },
      })),
    },
  };
}

export function buildRssFeed(movies, now = new Date()) {
  const items = movies
    .filter(m => m.published && m.watch_date)
    .slice(0, FEED_LIMIT)
    .map((m) => `    <item>
      <title>${escape(m.title)}</title>
      <link>${SITE_URL}?selected=${escape(m.id)}</link>
      <guid isPermaLink="false">${escape(m.id)}</guid>
      <pubDate>${new Date(m.watch_date).toUTCString()}</pubDate>
      <description>${escape(m.impression || m.summary || '')}</description>
    </item>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escape(SITE_DESC)}</description>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
