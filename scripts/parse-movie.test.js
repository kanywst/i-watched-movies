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
      seen: false,
      tags: ['A', 'B'],
      national: 'Japan',
      cover_image: 'https://example.com/c.png',
      release_date: new Date('2025-06-01').toISOString(),
      watch_date: new Date('2026-01-15').toISOString(),
      point: 8.5,
      summary: 'A summary',
      impression: 'Loved it',
      streaming: [],
      checked: '',
      content: '\nBody text\n',
    });
  });

  it('parses streaming as an array and checked as a month', () => {
    const movie = parseMovie(
      md(`title: 'WL'
published: false
streaming:
  - 'Netflix'
  - 'Disney+'
checked: '2026-07'`),
      'wl',
    );
    expect(movie.streaming).toEqual(['Netflix', 'Disney+']);
    expect(movie.checked).toBe('2026-07');
  });

  it('coerces a single streaming string to an array', () => {
    expect(parseMovie(md(`streaming: 'Netflix'`), 'p').streaming).toEqual(['Netflix']);
  });

  it('defaults streaming to [] and checked to empty when omitted', () => {
    const movie = parseMovie(md(`title: 'T'`), 'p');
    expect(movie.streaming).toEqual([]);
    expect(movie.checked).toBe('');
  });

  it('coerces an unquoted YAML date in checked back to YYYY-MM', () => {
    expect(parseMovie(md(`checked: 2026-07-15`), 'p').checked).toBe('2026-07');
  });

  it('drops a malformed checked value', () => {
    expect(parseMovie(md(`checked: 'July 2026'`), 'p').checked).toBe('');
  });

  it('rejects an impossible month in checked', () => {
    expect(parseMovie(md(`checked: '2026-13'`), 'p').checked).toBe('');
    expect(parseMovie(md(`checked: '2026-00'`), 'p').checked).toBe('');
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

  it('defaults seen to false when omitted', () => {
    expect(parseMovie(md(`title: 'T'`), 'p').seen).toBe(false);
  });

  it('parses seen: true for a seen-but-unrated entry', () => {
    const movie = parseMovie(md(`title: 'Seen It'\npublished: false\nseen: true`), 's');
    expect(movie.seen).toBe(true);
    expect(movie.published).toBe(false);
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
