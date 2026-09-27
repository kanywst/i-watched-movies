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

  it('hands a reader to the app with the film open, relative to wherever it is served', () => {
    const html = buildMoviePage(movie({ id: 'x-2' }));
    expect(html).toContain('location.replace("../../?selected=x-2")');
    expect(html).toContain('<a href="../../?selected=x-2">Open in the diary</a>');
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
    expect(buildMoviePage(movie())).toContain('<p class="score">8.5 <small>/ 10</small></p>');
    const watchlist = buildMoviePage(movie({ published: false }));
    expect(watchlist).not.toContain('class="score"');
    expect(watchlist).toContain('On the watchlist.');
  });

  it('marks the Japanese summary as Japanese', () => {
    expect(buildMoviePage(movie({ summary_ja: '要約' }))).toContain('<p lang="ja">要約</p>');
  });
});

describe('buildSitemap', () => {
  it('lists the diary and one page per entry, dated by watch or add date', () => {
    const xml = buildSitemap([
      movie({ id: 'a' }),
      movie({ id: 'b', watch_date: '', added: '2026-09-01T10:00:00Z' }),
      movie({ id: 'c', watch_date: '' }),
    ]);
    expect(xml).toContain('<loc>https://kanywst.github.io/i-watched-movies/</loc>');
    expect(xml).toContain('<loc>https://kanywst.github.io/i-watched-movies/m/a/</loc><lastmod>2026-04-01</lastmod>');
    expect(xml).toContain('<loc>https://kanywst.github.io/i-watched-movies/m/b/</loc><lastmod>2026-09-01</lastmod>');
    expect(xml).toContain('<loc>https://kanywst.github.io/i-watched-movies/m/c/</loc></url>');
    expect(xml.match(/<url>/g)).toHaveLength(4);
  });
});
