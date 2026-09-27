import { describe, expect, it } from 'vitest';
import { justWatchSearchUrl, moviePageUrl, STREAMING_SERVICES } from './constants';

describe('justWatchSearchUrl', () => {
  it('builds a JustWatch JP search URL with the title percent-encoded', () => {
    expect(justWatchSearchUrl('Gone Girl')).toBe(
      'https://www.justwatch.com/jp/検索?q=Gone%20Girl',
    );
  });

  it('encodes reserved characters so the query cannot break out of the URL', () => {
    expect(justWatchSearchUrl('A & B? #1')).toBe(
      'https://www.justwatch.com/jp/検索?q=A%20%26%20B%3F%20%231',
    );
  });
});

describe('STREAMING_SERVICES search URLs', () => {
  it("encodes the title in Netflix's search URL", () => {
    expect(STREAMING_SERVICES.Netflix.search?.('Gone Girl')).toBe(
      'https://www.netflix.com/search?q=Gone%20Girl',
    );
  });

  it('leaves services without a verified search URL to the JustWatch fallback', () => {
    // Disney+ search is an auth-gated SPA route with no crawlable URL, so it has no
    // `search` fn and the component falls back to justWatchSearchUrl.
    expect(STREAMING_SERVICES['Disney+'].search).toBeUndefined();
  });
});

describe('moviePageUrl', () => {
  it('resolves under the site path, dropping the query and hash the app is on', () => {
    expect(
      moviePageUrl('a-film', 'https://kanywst.github.io/i-watched-movies/?view=top&selected=a-film#x'),
    ).toBe('https://kanywst.github.io/i-watched-movies/m/a-film/');
  });

  it('works at a host root, as on the dev server', () => {
    expect(moviePageUrl('a', 'http://localhost:5173/')).toBe('http://localhost:5173/m/a/');
  });

  it('encodes the id so it stays one path segment', () => {
    expect(moviePageUrl('a/b?c', 'https://example.com/')).toBe('https://example.com/m/a%2Fb%3Fc/');
  });
});
