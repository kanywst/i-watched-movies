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
summary_ja: '日本語の概要'
impression: 'Loved it'`,
      ),
      'test-movie',
    );

    expect(movie).toEqual({
      id: 'test-movie',
      title: 'Test',
      published: true,
      seen: false,
      watching: false,
      dropped: false,
      tags: ['A', 'B'],
      national: 'Japan',
      cover_image: 'https://example.com/c.png',
      release_date: new Date('2025-06-01').toISOString(),
      watch_date: new Date('2026-01-15').toISOString(),
      point: 8.5,
      seasons: [],
      summary: 'A summary',
      summary_ja: '日本語の概要',
      impression: 'Loved it',
      streaming: [],
      checked: '',
      content: '\nBody text\n',
    });
  });

  it('defaults summary_ja to an empty string when the frontmatter omits it', () => {
    const movie = parseMovie(md(`title: 'T'\nsummary: 'Only English'`), 't');
    expect(movie.summary_ja).toBe('');
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

  it('defaults watching to false when omitted', () => {
    expect(parseMovie(md(`title: 'T'`), 'p').watching).toBe(false);
  });

  it('parses watching: true for a series still being watched', () => {
    const movie = parseMovie(md(`title: 'VIVANT'\npublished: false\nwatching: true`), 'v');
    expect(movie.watching).toBe(true);
    expect(movie.published).toBe(false);
    expect(movie.seen).toBe(false);
  });

  it('defaults dropped to false when omitted', () => {
    expect(parseMovie(md(`title: 'T'`), 'p').dropped).toBe(false);
  });

  it('parses dropped: true for an entry given up on partway', () => {
    const movie = parseMovie(md(`title: 'Gave Up'\npublished: false\ndropped: true`), 'g');
    expect(movie.dropped).toBe(true);
    expect(movie.published).toBe(false);
    expect(movie.watching).toBe(false);
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

  it('parses seasons and sorts them by season number', () => {
    const m = parseMovie(
      md(`title: 'Series'
published: false
dropped: true
seasons:
  - season: 2
    status: 'dropped'
  - season: 1
    point: 7.3
    status: 'watched'
    watch_date: '2026-08-20'`),
      's',
    );
    expect(m.seasons).toEqual([
      {
        season: 1,
        point: 7.3,
        status: 'watched',
        watch_date: new Date('2026-08-20').toISOString(),
      },
      { season: 2, point: null, status: 'dropped', watch_date: null },
    ]);
  });

  it('leaves an unrated season null rather than 0, which is a real score', () => {
    const m = parseMovie(md(`title: 'S'\nseasons:\n  - season: 1`), 's');
    expect(m.seasons[0].point).toBeNull();
    expect(parseMovie(md(`title: 'S'\nseasons:\n  - season: 1\n    point: 0`), 's').seasons[0].point).toBe(0);
  });

  it('drops a season with no usable number instead of renumbering it', () => {
    const m = parseMovie(
      md(`title: 'S'
seasons:
  - status: 'watched'
  - season: 'two'
  - season: 3`),
      's',
    );
    expect(m.seasons.map(s => s.season)).toEqual([3]);
  });

  it('falls back to watched for an unknown season status', () => {
    const m = parseMovie(md(`title: 'S'\nseasons:\n  - season: 1\n    status: 'abandoned'`), 's');
    expect(m.seasons[0].status).toBe('watched');
  });

  it('nulls an unparseable season watch_date rather than throwing', () => {
    const m = parseMovie(md(`title: 'S'\nseasons:\n  - season: 1\n    watch_date: 'someday'`), 's');
    expect(m.seasons[0].watch_date).toBeNull();
  });

  it('defaults seasons to an empty array for an entry without them', () => {
    expect(parseMovie(md(`title: 'T'`), 'p').seasons).toEqual([]);
  });

  it('keeps season scores out of the entry point', () => {
    const m = parseMovie(md(`title: 'S'\ndropped: true\nseasons:\n  - season: 1\n    point: 7.3`), 's');
    expect(m.point).toBe(0);
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
