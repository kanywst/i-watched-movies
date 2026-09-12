// The deployed workers.dev hostname. `kanywst12` was never a real subdomain (it does not
// resolve), so every RSS item link, the feed's channel link and the JSON-LD `url` pointed at
// a dead host. Keep this in step with the canonical/og:url pair in index.html.
const SITE_URL = 'https://i-watched-movies.edgebox12.workers.dev/';
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

/**
 * What both feeds publish: films actually watched through and rated.
 *
 * The three negated flags are not redundant. This is `isWatched` from src/partition.ts
 * restated for the build scripts, which cannot import the app's TypeScript: `dropped` and
 * `watching` each win over `published`, and `seen` files an entry under Seen with no score
 * shown. Reading bare `m.published` here would have the feeds disagree with the site about
 * the same file: the grid would file it as in progress, dropped or unrated while the RSS
 * and the JSON-LD announced it as watched, with whatever stale score it was carrying, and
 * the JSON-LD would attach an aggregateRating to a film the site deliberately shows none
 * for.
 *
 * The issue pipeline cannot currently produce those combinations (the List dropdown is
 * exclusive), but a hand-edited frontmatter can, and this is the fourth place that has to
 * agree on the shape after parse-movie.js, types.ts and build-movie-from-issue.js.
 */
const isPublished = (m) => m.published && !m.seen && !m.watching && !m.dropped;

export function buildJsonLd(movies) {
  const watched = movies.filter(isPublished);
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
    .filter(m => isPublished(m) && m.watch_date)
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
