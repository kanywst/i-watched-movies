// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildMovieJsonLd,
  buildMoviePage,
  buildSitemap,
  describeMovie,
  ogImage,
} from './build-pages.js';

const movie = (overrides = {}) => ({
  id: 'a',
  title: 'A',
  published: true,
  tags: ['Drama', 'Thriller'],
  national: 'Japan',
  cover_image: 'https://image.tmdb.org/t/p/original/x.jpg',
  release_date: '2025-06-01T00:00:00.000Z',
  watch_date: '2026-04-01T00:00:00.000Z',
  point: 8.5,
  summary: 'A summary.',
  impression: 'Loved it',
  content: '',
  ...overrides,
});

const meta = (html, attr, key) =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];

describe('ogImage', () => {
  it('asks TMDB for w780 instead of the multi-megabyte original', () => {
    expect(ogImage('https://image.tmdb.org/t/p/original/x.jpg')).toBe(
      'https://image.tmdb.org/t/p/w780/x.jpg',
    );
  });

  it('passes other hosts through untouched', () => {
    expect(ogImage('https://upload.wikimedia.org/p.jpg')).toBe('https://upload.wikimedia.org/p.jpg');
    expect(ogImage('')).toBe('');
  });
});

describe('describeMovie', () => {
  it('leads with the score for a rated film', () => {
    expect(describeMovie(movie())).toBe('kanywst rated it 8.5/10. A summary.');
  });

  it.each([
    [{ published: false }, 'On the watchlist.'],
    [{ seen: true }, 'Seen, not rated.'],
    [{ watching: true }, 'Watching now.'],
    // dropped beats watching, the same precedence as partitionMovies.
    [{ watching: true, dropped: true }, 'Dropped partway.'],
    // A blank Point on the issue form: watched, but nothing to lead with.
    [{ point: 0 }, 'Watched, not scored.'],
  ])('names the list instead of a score for %o', (flags, lead) => {
    expect(describeMovie(movie(flags))).toBe(`${lead} A summary.`);
  });

  it('does not print a stale score carried by an unrated entry', () => {
    expect(describeMovie(movie({ seen: true }))).not.toContain('8.5');
  });
});

describe('buildMovieJsonLd', () => {
  it("attaches the diarist's score as a Review", () => {
    const ld = buildMovieJsonLd(movie());
    expect(ld['@type']).toBe('Movie');
    expect(ld.url).toBe('https://kanywst.github.io/i-watched-movies/m/a/');
    expect(ld.datePublished).toBe('2025-06-01');
    expect(ld.review).toMatchObject({
      '@type': 'Review',
      author: { name: 'kanywst' },
      datePublished: '2026-04-01',
      reviewBody: 'Loved it',
      reviewRating: { ratingValue: 8.5, bestRating: 10, worstRating: 0 },
    });
  });

  it('has no Review for an entry that is not rated', () => {
    expect(buildMovieJsonLd(movie({ published: false })).review).toBeUndefined();
    expect(buildMovieJsonLd(movie({ point: 0 })).review).toBeUndefined();
  });
});

describe('buildMoviePage', () => {
  it('carries the film, not the site, in its card metadata', () => {
    const html = buildMoviePage(movie());
    expect(html).toContain('<title>A (2025) · The Movies kanywst Watched</title>');
    expect(meta(html, 'property', 'og:title')).toBe('A (2025)');
    expect(meta(html, 'property', 'og:url')).toBe('https://kanywst.github.io/i-watched-movies/m/a/');
    expect(meta(html, 'property', 'og:image')).toBe('https://image.tmdb.org/t/p/w780/x.jpg');
    expect(meta(html, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(html).toContain('<link rel="canonical" href="https://kanywst.github.io/i-watched-movies/m/a/" />');
  });

  it('falls back to a small card and no image tags without a poster', () => {
    const html = buildMoviePage(movie({ cover_image: '' }));
    expect(meta(html, 'name', 'twitter:card')).toBe('summary');
    expect(html).not.toContain('og:image');
    expect(html).not.toContain('<img');
  });

  it('links into the app with the film open, relative to wherever it is served', () => {
    const html = buildMoviePage(movie({ id: 'x-2' }));
    expect(html).toContain('<a class="open" href="../../?selected=x-2">Open in the diary</a>');
  });

  it('does not redirect, so a crawler indexes the page rather than following it away', () => {
    expect(buildMoviePage(movie())).not.toMatch(/location\.|http-equiv="refresh"/);
  });

  it('keeps only rated films in search results', () => {
    expect(buildMoviePage(movie())).not.toContain('noindex');
    for (const flags of [{ published: false }, { seen: true }, { watching: true }, { dropped: true }, { point: 0 }]) {
      expect(buildMoviePage(movie(flags))).toContain('<meta name="robots" content="noindex" />');
    }
  });

  it('escapes entry text in markup and attributes', () => {
    const html = buildMoviePage(movie({ title: 'A "B" <C> & D' }));
    expect(html).toContain('<h1>A &quot;B&quot; &lt;C&gt; &amp; D</h1>');
    expect(meta(html, 'property', 'og:title')).toBe('A &quot;B&quot; &lt;C&gt; &amp; D (2025)');
    expect(html).not.toContain('<C>');
  });

  it('cannot close the JSON-LD script early from entry text', () => {
    const html = buildMoviePage(movie({ summary: '</script><script>alert(1)</script>' }));
    const ld = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)[1];
    expect(ld).not.toContain('</');
    expect(JSON.parse(ld).description).toBe('</script><script>alert(1)</script>');
  });

  it('shows the score only for a rated film', () => {
    expect(buildMoviePage(movie())).toContain('<p class="score">8.5<small>/ 10</small></p>');
    const watchlist = buildMoviePage(movie({ published: false }));
    expect(watchlist).not.toContain('class="score"');
    expect(watchlist).toContain('On the watchlist.');
  });

  it('marks the Japanese summary as Japanese', () => {
    expect(buildMoviePage(movie({ summary_ja: '要約' }))).toContain('<p lang="ja">要約</p>');
  });
});

describe('alternate titles', () => {
  const parasite = movie({ title: '기생충', title_en: 'Parasite', title_ja: 'パラサイト 半地下の家族', release_date: '2019-05-30' });

  it('prints the English and Japanese titles under the original one', () => {
    expect(buildMoviePage(parasite)).toContain(
      '<h1>기생충</h1>\n<p class="aka"><span lang="en">Parasite</span> · <span lang="ja">パラサイト 半地下の家族</span></p>',
    );
  });

  it('puts every name in the page title and the structured data', () => {
    const html = buildMoviePage(parasite);
    expect(html).toContain('<title>기생충 · Parasite · パラサイト 半地下の家族 (2019) · The Movies kanywst Watched</title>');
    expect(buildMovieJsonLd(parasite).alternateName).toEqual(['Parasite', 'パラサイト 半地下の家族']);
  });

  it('adds nothing for a film with no other name', () => {
    expect(buildMoviePage(movie())).not.toContain('class="aka"');
    expect(buildMovieJsonLd(movie()).alternateName).toBeUndefined();
  });
});

describe('buildSitemap', () => {
  it('lists the diary and each rated film, and nothing else', () => {
    const xml = buildSitemap([
      movie({ id: 'a' }),
      movie({ id: 'w', published: false }),
      movie({ id: 's', seen: true }),
      movie({ id: 'p', watching: true }),
      movie({ id: 'd', dropped: true }),
      movie({ id: 'z', point: 0 }),
    ]);
    expect(xml).toContain('<url><loc>https://kanywst.github.io/i-watched-movies/</loc></url>');
    expect(xml).toContain('<url><loc>https://kanywst.github.io/i-watched-movies/m/a/</loc></url>');
    expect(xml.match(/<url>/g)).toHaveLength(2);
    expect(xml).not.toContain('lastmod');
  });
});
