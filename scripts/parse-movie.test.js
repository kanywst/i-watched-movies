// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseMovie, compareByWatchDateDesc } from './parse-movie.js';

const md = (frontmatter, body = 'Body text') =>
  `---\n${frontmatter}\n---\n\n${body}\n`;

describe('parseMovie', () => {
  it('parses all fields from frontmatter', () => {
    const movie = parseMovie(
      md(
        `title: 'Test'
tags:
  - 'A'
  - 'B'
national: 'Japan'
cover_image: 'https://example.com/c.png'
release_date: '2025-06-01'
watch_date: '2026-01-15'
point: 8.5
summary: 'A summary'
impression: 'Loved it'`,
      ),
      'test-movie',
    );

    expect(movie).toEqual({
      id: 'test-movie',
      title: 'Test',
      published: true,
      tags: ['A', 'B'],
      national: 'Japan',
      cover_image: 'https://example.com/c.png',
      release_date: new Date('2025-06-01').toISOString(),
      watch_date: new Date('2026-01-15').toISOString(),
      point: 8.5,
      summary: 'A summary',
      impression: 'Loved it',
      content: '\nBody text\n',
    });
  });

  it('preserves published: false for watchlist items', () => {
    const movie = parseMovie(md(`title: 'On Watchlist'\npublished: false`), 'wl');
    expect(movie).not.toBeNull();
    expect(movie.published).toBe(false);
    expect(movie.title).toBe('On Watchlist');
  });

  it('defaults published to true when omitted', () => {
    expect(parseMovie(md(`title: 'T'`), 'p').published).toBe(true);
  });

  it('defaults missing scalar fields', () => {
    const movie = parseMovie(md(`title: 'Only Title'`), 'only');
    expect(movie).toMatchObject({
      title: 'Only Title',
      published: true,
      tags: [],
      national: null,
      cover_image: '',
      release_date: null,
      watch_date: null,
      point: 0,
      summary: '',
      impression: '',
    });
  });

  it('uses Untitled when title missing', () => {
    expect(parseMovie(md(``), 'x').title).toBe('Untitled');
  });

  it('coerces point string to number', () => {
    expect(parseMovie(md(`point: '7.5'`), 'p').point).toBe(7.5);
  });

  it('falls back to 0 for non-numeric point', () => {
    expect(parseMovie(md(`point: 'N/A'`), 'p').point).toBe(0);
  });

  it('falls back to 0 when point missing', () => {
    expect(parseMovie(md(`title: 'T'`), 'p').point).toBe(0);
  });

  it('uses id from argument, not frontmatter', () => {
    expect(parseMovie(md(`title: 'T'`), 'my-id').id).toBe('my-id');
  });

  it('returns content body separately from frontmatter', () => {
    const m = parseMovie(md(`title: 'T'`, 'Hello world'), 'i');
    expect(m.content).toContain('Hello world');
  });
});

describe('compareByWatchDateDesc', () => {
  it('sorts newer watch_date first', () => {
    const a = { watch_date: '2026-01-01' };
    const b = { watch_date: '2026-03-01' };
    expect([a, b].sort(compareByWatchDateDesc)).toEqual([b, a]);
  });

  it('treats null watch_date as oldest', () => {
    const a = { watch_date: null };
    const b = { watch_date: '2025-01-01' };
    expect([a, b].sort(compareByWatchDateDesc)).toEqual([b, a]);
  });
});
