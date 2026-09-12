// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildJsonLd, buildRssFeed } from './build-feeds.js';

const movie = (overrides = {}) => ({
  id: 'a',
  title: 'A',
  published: true,
  tags: ['Drama'],
  national: 'Japan',
  cover_image: 'https://example.com/a.png',
  release_date: '2025-06-01T00:00:00.000Z',
  watch_date: '2026-04-01T00:00:00.000Z',
  point: 8.5,
  summary: '',
  impression: 'Loved it',
  content: '',
  ...overrides,
});

describe('buildJsonLd', () => {
  it('produces a CollectionPage with watched movies only', () => {
    const movies = [movie({ id: 'a' }), movie({ id: 'b', published: false })];
    const ld = buildJsonLd(movies);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.mainEntity['@type']).toBe('ItemList');
    expect(ld.mainEntity.numberOfItems).toBe(1);
    expect(ld.mainEntity.itemListElement[0].item['@type']).toBe('Movie');
    expect(ld.mainEntity.itemListElement[0].item.name).toBe('A');
  });

  it('omits aggregateRating when point is 0', () => {
    const ld = buildJsonLd([movie({ point: 0 })]);
    expect(ld.mainEntity.itemListElement[0].item.aggregateRating).toBeUndefined();
  });

  it('includes aggregateRating with value when point > 0', () => {
    const ld = buildJsonLd([movie({ point: 7.2 })]);
    expect(ld.mainEntity.itemListElement[0].item.aggregateRating).toMatchObject({
      '@type': 'AggregateRating',
      ratingValue: 7.2,
      bestRating: 10,
    });
  });
});

describe('buildRssFeed', () => {
  it('emits valid-looking RSS XML with watched items only', () => {
    const movies = [movie({ id: 'a' }), movie({ id: 'b', published: false })];
    const xml = buildRssFeed(movies, new Date('2026-05-02'));
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain('<title>A</title>');
    expect(xml).not.toContain('<title>B</title>');
  });

  it('skips items without watch_date', () => {
    const xml = buildRssFeed([movie({ watch_date: null })]);
    expect(xml).not.toContain('<item>');
  });

  it('escapes special characters in title and description', () => {
    const xml = buildRssFeed([
      movie({ title: 'A & B <c>', impression: '"quoted"' }),
    ]);
    expect(xml).toContain('A &amp; B &lt;c&gt;');
    expect(xml).toContain('&quot;quoted&quot;');
  });
});

/**
 * src/partition.ts makes `watching` beat `published`, and a test there pins that an entry
 * carrying both is filed under In Progress rather than Watched. The feeds are the fourth
 * reader of that shape, so they have to agree: an unfinished series must not be announced
 * as watched, with whatever score it happens to be carrying, while the site shows it as in
 * progress.
 */
describe('an in-progress entry is in neither feed', () => {
  const inProgress = movie({ id: 'series', title: 'Series', published: false, watching: true });

  it('is left out of the JSON-LD', () => {
    const ld = buildJsonLd([movie({ id: 'a' }), inProgress]);
    expect(ld.mainEntity.numberOfItems).toBe(1);
    expect(ld.mainEntity.itemListElement.map(e => e.item.name)).toEqual(['A']);
  });

  it('is left out of the RSS feed', () => {
    const xml = buildRssFeed([movie({ id: 'a' }), inProgress]);
    expect(xml).toContain('<title>A</title>');
    expect(xml).not.toContain('<title>Series</title>');
  });

  it('stays out even when a stale published: true is left on it', () => {
    const stale = movie({ id: 'rewatch', title: 'Rewatch', published: true, watching: true });
    expect(buildJsonLd([stale]).mainEntity.numberOfItems).toBe(0);
    expect(buildRssFeed([stale])).not.toContain('<title>Rewatch</title>');
  });
});

/**
 * The same agreement for `seen`, which src/partition.ts files under Seen with no score
 * shown. A stale `published: true` left beside it would otherwise have the JSON-LD attach
 * an aggregateRating to a film the site deliberately rates nowhere.
 */
describe('a seen entry is in neither feed', () => {
  const unrated = movie({ id: 'unrated', title: 'Unrated', published: true, seen: true });

  it('is left out of the JSON-LD, aggregateRating and all', () => {
    const ld = buildJsonLd([movie({ id: 'a' }), unrated]);
    expect(ld.mainEntity.numberOfItems).toBe(1);
    expect(ld.mainEntity.itemListElement.map(e => e.item.name)).toEqual(['A']);
  });

  it('is left out of the RSS feed', () => {
    const xml = buildRssFeed([movie({ id: 'a' }), unrated]);
    expect(xml).toContain('<title>A</title>');
    expect(xml).not.toContain('<title>Unrated</title>');
  });
});

/**
 * Same agreement for `dropped`, which beats every other flag in src/partition.ts: a film
 * abandoned partway was never watched through, so it has nothing to announce.
 */
describe('a dropped entry is in neither feed', () => {
  const abandoned = movie({ id: 'gave-up', title: 'Gave Up', published: false, dropped: true });

  it('is left out of the JSON-LD', () => {
    const ld = buildJsonLd([movie({ id: 'a' }), abandoned]);
    expect(ld.mainEntity.numberOfItems).toBe(1);
    expect(ld.mainEntity.itemListElement.map(e => e.item.name)).toEqual(['A']);
  });

  it('is left out of the RSS feed', () => {
    const xml = buildRssFeed([movie({ id: 'a' }), abandoned]);
    expect(xml).toContain('<title>A</title>');
    expect(xml).not.toContain('<title>Gave Up</title>');
  });

  it('stays out even when a stale published: true is left on it', () => {
    const stale = movie({ id: 'quit', title: 'Quit', published: true, dropped: true });
    expect(buildJsonLd([stale]).mainEntity.numberOfItems).toBe(0);
    expect(buildRssFeed([stale])).not.toContain('<title>Quit</title>');
  });
});
