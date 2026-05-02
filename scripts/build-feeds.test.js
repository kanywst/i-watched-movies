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
