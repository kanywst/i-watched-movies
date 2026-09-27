import { SITE_URL, SITE_NAME, SITE_DESC, escape, isPublished, moviePageUrl } from './build-feeds.js';

// One static page per entry, at m/<id>/, so a film has a URL that means that film to
// something that does not run JavaScript. The app itself is one index.html that opens a
// film from `?selected=`, and a static host serves the same <head> for every query string,
// so a shared `?selected=` link unfurled on X, Slack or LINE as the site card, never the
// film. These pages carry the film's own title, poster, score and Review structured data,
// then hand a reader with JavaScript to the app with that film open.

const AUTHOR = 'kanywst';
const AUTHOR_URL = 'https://github.com/kanywst';

// The same rewrite as src/tmdbImage.ts, which the build scripts cannot import. w780 keeps
// a card preview sharp on a 2x display without shipping the 2000x3000 original, which
// runs to 2.4 MB and is over some unfurlers' size limits.
const TMDB_ORIGINAL = /^(https:\/\/image\.tmdb\.org\/t\/p\/)original(\/.+)$/;
export const ogImage = (url) => {
  const m = TMDB_ORIGINAL.exec(url || '');
  return m ? `${m[1]}w780${m[2]}` : url || '';
};

const year = (iso) => (/^\d{4}/.exec(iso || '') || [''])[0];

/** Which list the entry sits in, mirroring partitionMovies' precedence. */
function stateOf(m) {
  if (m.dropped) return 'Dropped partway.';
  if (m.watching) return 'Watching now.';
  if (m.seen) return 'Seen, not rated.';
  if (!m.published) return 'On the watchlist.';
  return '';
}

/** The one-line description used for <meta name=description> and the card text. */
export function describeMovie(m) {
  const lead = isPublished(m) && m.point > 0
    ? `${AUTHOR} rated it ${m.point}/10.`
    : stateOf(m);
  return [lead, m.summary || ''].filter(Boolean).join(' ');
}

/** Schema.org Movie for one entry, with the diarist's score as a Review when there is one. */
export function buildMovieJsonLd(m) {
  const rated = isPublished(m) && m.point > 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: m.title,
    url: moviePageUrl(m.id),
    image: m.cover_image || undefined,
    datePublished: m.release_date ? m.release_date.slice(0, 10) : undefined,
    countryOfOrigin: m.national || undefined,
    genre: m.tags?.length ? m.tags : undefined,
    description: m.summary || undefined,
    review: rated
      ? {
        '@type': 'Review',
        author: { '@type': 'Person', name: AUTHOR, url: AUTHOR_URL },
        datePublished: m.watch_date ? m.watch_date.slice(0, 10) : undefined,
        reviewBody: m.impression || undefined,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: m.point,
          bestRating: 10,
          worstRating: 0,
        },
      }
      : undefined,
  };
}

// `</` inside a JSON string would close the <script> element early.
const safeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function buildMoviePage(m) {
  const url = moviePageUrl(m.id);
  const pageTitle = `${m.title}${year(m.release_date) ? ` (${year(m.release_date)})` : ''}`;
  const fullTitle = `${pageTitle} · ${SITE_NAME}`;
  const description = describeMovie(m) || SITE_DESC;
  const image = ogImage(m.cover_image);
  const rated = isPublished(m) && m.point > 0;
  // Relative, so the page works from any host the build is served on (a local preview
  // included), the same reason vite.config.ts builds with base './'.
  const appHref = `../../?selected=${encodeURIComponent(m.id)}`;
  const facts = [year(m.release_date), m.national, (m.tags || []).join(', ')]
    .filter(Boolean)
    .map(escape)
    .join(' · ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escape(fullTitle)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${escape(url)}" />
<link rel="icon" type="image/png" href="https://github.com/kanywst.png" />
<link rel="alternate" type="application/rss+xml" title="${escape(SITE_NAME)}" href="../../feed.xml" />
<meta property="og:type" content="video.movie" />
<meta property="og:site_name" content="${escape(SITE_NAME)}" />
<meta property="og:title" content="${escape(pageTitle)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:url" content="${escape(url)}" />
${image ? `<meta property="og:image" content="${escape(image)}" />
<meta property="og:image:alt" content="${escape(`Poster for ${m.title}`)}" />
` : ''}<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${escape(pageTitle)}" />
<meta name="twitter:description" content="${escape(description)}" />
${image ? `<meta name="twitter:image" content="${escape(image)}" />
` : ''}<script type="application/ld+json">${safeJson(buildMovieJsonLd(m))}</script>
<script>location.replace(${safeJson(appHref)});</script>
<style>
:root{color-scheme:light dark;--bg:#fafaf9;--fg:#1c1917;--muted:#78716c;--rule:#e7e5e4}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#e7e5e4;--muted:#a8a29e;--rule:#292524}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,sans-serif}
main{max-width:40rem;margin:0 auto;padding:2rem 1rem 4rem}
a{color:inherit}
img{display:block;max-width:14rem;width:100%;height:auto;border-radius:.5rem;margin:1.5rem 0}
h1{font-size:2rem;line-height:1.2;margin:0}
.facts,.back{color:var(--muted);font-size:.875rem}
.score{font-size:3.5rem;font-weight:300;line-height:1;margin:1.5rem 0 .25rem}
.score small{font-size:1rem;color:var(--muted)}
blockquote{margin:1.5rem 0;padding-left:1rem;border-left:2px solid var(--rule)}
</style>
</head>
<body>
<main>
<p class="back"><a href="../../">${escape(SITE_NAME)}</a></p>
<h1>${escape(m.title)}</h1>
${facts ? `<p class="facts">${facts}</p>
` : ''}${image ? `<img src="${escape(image)}" alt="${escape(`Poster for ${m.title}`)}" width="300" height="450" />
` : ''}${rated ? `<p class="score">${escape(m.point)} <small>/ 10</small></p>
` : stateOf(m) ? `<p class="facts">${escape(stateOf(m))}</p>
` : ''}${m.summary ? `<p>${escape(m.summary)}</p>
` : ''}${m.summary_ja ? `<p lang="ja">${escape(m.summary_ja)}</p>
` : ''}${m.impression ? `<blockquote>${escape(m.impression)}</blockquote>
` : ''}<p><a href="${escape(appHref)}">Open in the diary</a></p>
</main>
</body>
</html>
`;
}

/** Every page worth crawling: the diary itself and one page per entry. */
export function buildSitemap(movies) {
  const urls = [
    `  <url><loc>${escape(SITE_URL)}</loc></url>`,
    ...movies.map((m) => {
      const lastmod = (m.watch_date || m.added || '').slice(0, 10);
      return `  <url><loc>${escape(moviePageUrl(m.id))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
