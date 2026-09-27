import { SITE_URL, SITE_NAME, SITE_DESC, escape, isPublished, entryPageUrl } from './build-feeds.js';

// One static page per entry, at m/<id>/, so a film has a URL that means that film to
// something that does not run JavaScript. The app itself is one index.html that opens a
// film from `?selected=`, and a static host serves the same <head> for every query string,
// so a shared `?selected=` link unfurled on X, Slack or LINE as the site card, never the
// film. These pages carry the film's own title, poster, score and Review structured data.
//
// They stand on their own rather than redirecting into the app. Googlebot runs JavaScript
// and reads a script redirect as a redirect, so a page that bounced to `?selected=` (whose
// canonical is the bare root) would have every sitemap URL reported as a redirect and none
// of this indexed. The app is one prominent link away instead.
//
// Only scored films are offered to search engines. A watchlist, in-progress, seen or dropped
// page is a line of state over a synopsis that exists all over the web, so those carry
// noindex and stay out of the sitemap; they still exist, because they still unfurl.

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

// src/titles.ts restated for the build scripts, which cannot import the app's TypeScript:
// the English then Japanese title, each only when it is set and not a name already shown.
export function alternateTitles(m) {
  const shown = [String(m.title || '').trim()];
  const out = [];
  for (const [lang, raw] of [['en', m.title_en], ['ja', m.title_ja]]) {
    const text = String(raw || '').trim();
    if (!text || shown.includes(text)) continue;
    shown.push(text);
    out.push({ lang, text });
  }
  return out;
}

const year = (iso) => (/^\d{4}/.exec(iso || '') || [''])[0];

/** Which list the entry sits in, mirroring partitionMovies' precedence. */
function stateOf(m) {
  if (m.dropped) return 'Dropped partway.';
  if (m.watching) return 'Watching now.';
  if (m.seen) return 'Seen, not rated.';
  if (!m.published) return 'On the watchlist.';
  // A blank Point on the issue form parses to 0, which every feed here reads as unscored.
  if (!(m.point > 0)) return 'Watched, not scored.';
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
    alternateName: alternateTitles(m).map((t) => t.text).length
      ? alternateTitles(m).map((t) => t.text)
      : undefined,
    url: entryPageUrl(m.id),
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
  const url = entryPageUrl(m.id);
  const alternates = alternateTitles(m);
  // Every name the film goes by, so a search for パラサイト or Parasite lands on 기생충.
  const names = [m.title, ...alternates.map((t) => t.text)].join(' · ');
  const pageTitle = `${names}${year(m.release_date) ? ` (${year(m.release_date)})` : ''}`;
  const fullTitle = `${pageTitle} · ${SITE_NAME}`;
  const description = describeMovie(m) || SITE_DESC;
  const image = ogImage(m.cover_image);
  const rated = isPublished(m) && m.point > 0;
  // A watched entry with no score is kept out too: without one the page is only a synopsis.
  const indexable = rated;
  // Relative, so the page works from any host the build is served on (a local preview
  // included), the same reason vite.config.ts builds with base './'.
  const appHref = `../../?selected=${encodeURIComponent(m.id)}`;
  const facts = [year(m.release_date), m.national]
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
${indexable ? '' : `<meta name="robots" content="noindex" />
`}<link rel="icon" type="image/png" href="https://github.com/kanywst.png" />
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&display=swap" />
<style>
:root{color-scheme:light dark;--bg:#fafaf9;--fg:#1c1917;--muted:#57534e;--rule:#e7e5e4;--chip:#f5f5f4;--accent:#d61f6d}
@media (prefers-color-scheme:dark){:root{--bg:#0c0a09;--fg:#e7e5e4;--muted:#a8a29e;--rule:#292524;--chip:#1c1917;--accent:#ff4d97}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:60rem;margin:0 auto;padding:0 1rem}
header{background:#0c0a09;color:#fafaf9}
header .wrap{padding-block:1rem}
.mark{font-family:"Bricolage Grotesque","Helvetica Neue",Arial,sans-serif;font-weight:800;font-size:1.25rem;letter-spacing:-.02em;color:inherit;text-decoration:none}
.mark em{font-style:normal;color:#ff4d97}
main.wrap{display:grid;gap:2rem;padding-block:2.5rem 4rem}
@media (min-width:44rem){main.wrap{grid-template-columns:18rem 1fr;align-items:start}}
.poster{width:100%;max-width:18rem;height:auto;aspect-ratio:2/3;object-fit:cover;border-radius:.75rem;box-shadow:0 10px 30px rgb(0 0 0/.25)}
h1{font-family:"Bricolage Grotesque","Helvetica Neue",Arial,sans-serif;font-weight:800;font-size:clamp(2rem,5vw,3rem);line-height:1.05;letter-spacing:-.02em;margin:0}
.aka{font-size:1.1rem;color:var(--muted);margin:.5rem 0 0}
.facts,.state{color:var(--muted);font-size:.9rem;margin:.75rem 0 0}
.tags{display:flex;flex-wrap:wrap;gap:.5rem;padding:0;margin:1rem 0 0;list-style:none}
.tags li{font-size:.75rem;padding:.25rem .65rem;border-radius:999px;background:var(--chip);border:1px solid var(--rule)}
.score{margin:1.75rem 0 0;font-size:4rem;font-weight:300;line-height:1;font-variant-numeric:tabular-nums}
.score small{font-size:1rem;color:var(--muted);margin-left:.25rem}
.by{color:var(--muted);font-size:.85rem;margin:.5rem 0 0}
.text p{margin:1.25rem 0 0}
blockquote{margin:1.5rem 0 0;padding-left:1rem;border-left:3px solid var(--accent);font-style:italic}
/* White on #d61f6d is 4.91:1, the --accent-a-solid pairing in src/index.css. The brighter dark-mode accent (#ff4d97) is 3.11:1 under white (measured 2026-09-28), so the button keeps the solid in both schemes. */
.open{display:inline-block;margin-top:2rem;padding:.75rem 1.25rem;border-radius:999px;background:#d61f6d;color:#fff;font-weight:600;text-decoration:none}
.open:hover{filter:brightness(1.08)}
.open:focus-visible{outline:2px solid var(--fg);outline-offset:3px}
</style>
</head>
<body>
<header><div class="wrap"><a class="mark" href="../../">The Movies <em>${escape(AUTHOR)}</em> Watched</a></div></header>
<main class="wrap">
${image ? `<img class="poster" src="${escape(image)}" alt="${escape(`Poster for ${m.title}`)}" width="288" height="432" />
` : ''}<article>
<h1>${escape(m.title)}</h1>
${alternates.length ? `<p class="aka">${alternates.map((t) => `<span lang="${t.lang}">${escape(t.text)}</span>`).join(' · ')}</p>
` : ''}${facts ? `<p class="facts">${facts}</p>
` : ''}${m.tags?.length ? `<ul class="tags">${m.tags.map((t) => `<li>${escape(t)}</li>`).join('')}</ul>
` : ''}${rated ? `<p class="score">${escape(m.point)}<small>/ 10</small></p>
<p class="by">Rated by ${escape(AUTHOR)}${m.watch_date ? ` on ${escape(m.watch_date.slice(0, 10))}` : ''}</p>
` : stateOf(m) ? `<p class="state">${escape(stateOf(m))}</p>
` : ''}<div class="text">
${m.summary ? `<p>${escape(m.summary)}</p>
` : ''}${m.summary_ja ? `<p lang="ja">${escape(m.summary_ja)}</p>
` : ''}${m.impression ? `<blockquote>${escape(m.impression)}</blockquote>
` : ''}</div>
<a class="open" href="${escape(appHref)}">Open in the diary</a>
</article>
</main>
</body>
</html>
`;
}

/**
 * The pages worth a search engine's time: the diary itself and each scored film. No lastmod:
 * the only date an entry has is when it was watched, which a re-score or a rewritten
 * impression does not move, and Google discounts a lastmod it finds unreliable.
 */
export function buildSitemap(movies) {
  const urls = [
    SITE_URL,
    ...movies.filter((m) => isPublished(m) && m.point > 0).map((m) => entryPageUrl(m.id)),
  ].map((loc) => `  <url><loc>${escape(loc)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
