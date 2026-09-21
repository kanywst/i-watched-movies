// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  buildMovie,
  findSlugByTitle,
  formatFile,
  mergeMovie,
  parseIssueBody,
  parseSeasons,
  readExisting,
  slugify,
} from './build-movie-from-issue.js';

const sample = `### Title

28 Years Later

### List

Watched

### Watch date

2026-05-10

### Point

8.5

### Release date

2025-06-20

### National

UK

### Tags

Horror, Drama

### Cover image URL

https://example.com/p.jpg

### Summary

_No response_

### Impression

Loved it.

### Body

In 2002, during the initial outbreak...
`;

describe('parseIssueBody', () => {
  it('splits sections by ### headings', () => {
    const s = parseIssueBody(sample);
    expect(s['Title']).toBe('28 Years Later');
    expect(s['Point']).toBe('8.5');
    expect(s['Body']).toMatch(/^In 2002/);
  });

  it('treats _No response_ as empty', () => {
    const s = parseIssueBody(sample);
    expect(s['Summary']).toBe('');
  });

  it('handles CRLF line endings', () => {
    const s = parseIssueBody(sample.replace(/\n/g, '\r\n'));
    expect(s['Title']).toBe('28 Years Later');
  });
});

describe('slugify', () => {
  it('lowercases and dasherizes', () => {
    expect(slugify('28 Years Later')).toBe('28-years-later');
  });

  it('drops apostrophes cleanly', () => {
    expect(slugify("Schindler's List")).toBe('schindlers-list');
  });

  it('falls back when input has no ASCII', () => {
    expect(slugify('七人の侍', 'movie-42')).toBe('movie-42');
  });
});

describe('buildMovie', () => {
  it('maps sections to a Movie', () => {
    const { movie, slug } = buildMovie(parseIssueBody(sample), { issueNumber: '1' });
    expect(slug).toBe('28-years-later');
    expect(movie.published).toBe(true);
    expect(movie.tags).toEqual(['Horror', 'Drama']);
    expect(movie.point).toBe(8.5);
    expect(movie.watch_date).toBe('2026-05-10');
    expect(movie.release_date).toBe('2025-06-20');
    expect(movie.national).toBe('UK');
    expect(movie.summary).toBe('');
    expect(movie.impression).toBe('Loved it.');
  });

  // The issue form has no field for it: added records when the entry landed, which is the
  // clock's to say, not the filer's. `now` is injectable only so a test can pin it.
  it('stamps added from the clock, not from any section', () => {
    const { movie } = buildMovie(parseIssueBody(sample), {
      now: new Date('2026-09-21T13:02:16Z'),
    });
    expect(movie.added).toBe('2026-09-21T13:02:16.000Z');
  });

  it('keeps the time of day, so a batch filed in one sitting stays ordered', () => {
    const at = iso => buildMovie(parseIssueBody(sample), { now: new Date(iso) }).movie.added;
    const first = at('2026-09-12T14:16:06Z');
    const second = at('2026-09-12T15:14:25Z');
    expect(new Date(second).getTime()).toBeGreaterThan(new Date(first).getTime());
  });

  it('reads the Japanese summary from its own section', () => {
    const body = sample.replace(
      '### Impression',
      '### Summary (JA)\n\n感染から28年、島に隔離された共同体の話。\n\n### Impression',
    );
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.summary_ja).toBe('感染から28年、島に隔離された共同体の話。');
  });

  it('leaves summary_ja empty when the section is absent', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    expect(movie.summary_ja).toBe('');
  });

  it('sets published=false when List is Watchlist', () => {
    const body = sample.replace('### List\n\nWatched', '### List\n\nWatchlist');
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.published).toBe(false);
    expect(movie.seen).toBe(false);
  });

  it('sets seen=true and published=false when List is Seen', () => {
    const body = sample.replace('### List\n\nWatched', '### List\n\nSeen');
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.seen).toBe(true);
    expect(movie.published).toBe(false);
  });

  it('marks a Watched entry as not seen', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    expect(movie.seen).toBe(false);
    expect(movie.published).toBe(true);
    expect(movie.watching).toBe(false);
  });

  it('sets watching=true and published=false when List is In Progress', () => {
    const body = sample.replace('### List\n\nWatched', '### List\n\nIn Progress');
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.watching).toBe(true);
    expect(movie.published).toBe(false);
    expect(movie.seen).toBe(false);
    expect(movie.dropped).toBe(false);
  });

  it('sets dropped=true and published=false when List is Dropped', () => {
    const body = sample.replace('### List\n\nWatched', '### List\n\nDropped');
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.dropped).toBe(true);
    expect(movie.published).toBe(false);
    expect(movie.seen).toBe(false);
    expect(movie.watching).toBe(false);
  });

  it('parses Streaming into an array and Availability checked into a month', () => {
    const body = `### Title

Night in Paradise

### List

Watchlist

### Streaming

Netflix, Disney+

### Availability checked

2026-07
`;
    const { movie } = buildMovie(parseIssueBody(body), { issueNumber: '9' });
    expect(movie.streaming).toEqual(['Netflix', 'Disney+']);
    expect(movie.checked).toBe('2026-07');
  });

  it('defaults streaming to [] and checked to empty when the sections are absent', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    expect(movie.streaming).toEqual([]);
    expect(movie.checked).toBe('');
  });

  it('rejects an impossible Availability checked month', () => {
    const body = `### Title

X

### Availability checked

2026-13
`;
    expect(buildMovie(parseIssueBody(body)).movie.checked).toBe('');
  });

  it('parses the checkboxes form of Streaming, keeping only ticked services', () => {
    const body = `### Title

X

### List

Watchlist

### Streaming

- [x] Netflix
- [ ] Disney+
- [x] Prime Video
- [ ] U-NEXT
- [ ] Hulu
`;
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.streaming).toEqual(['Netflix', 'Prime Video']);
  });

  it('throws when title is missing', () => {
    expect(() => buildMovie({})).toThrow(/Title is required/);
  });

  it('prefers an explicit Slug over the title', () => {
    const { slug } = buildMovie(
      { Title: '死刑にいたる病', Slug: 'Shikei ni Itaru Yamai' },
      { issueNumber: '7' }
    );
    expect(slug).toBe('shikei-ni-itaru-yamai');
  });

  it('still falls back to the issue number for a new Japanese title with no Slug', () => {
    const { slug } = buildMovie({ Title: 'まだ存在しない邦題' }, { issueNumber: '7' });
    expect(slug).toBe('movie-7');
  });

  it('ignores a Slug that slugifies to nothing', () => {
    const { slug } = buildMovie({ Title: '28 Years Later', Slug: '???' });
    expect(slug).toBe('28-years-later');
  });

  it('reuses the slug of an existing entry with the same title', () => {
    // A Japanese-titled film already on the watchlist, re-logged as watched without a
    // Slug, must land on the same file instead of forking a movie-<issue>.md duplicate.
    const { slug } = buildMovie({ Title: '死刑にいたる病', List: 'Watched' }, { issueNumber: '150' });
    expect(slug).toBe('shikei-ni-itaru-yamai');
  });
});

describe('findSlugByTitle', () => {
  it('finds the file holding a title', () => {
    expect(findSlugByTitle('死刑にいたる病')).toBe('shikei-ni-itaru-yamai');
  });

  it('returns empty for a title no entry holds', () => {
    expect(findSlugByTitle('A Film That Does Not Exist')).toBe('');
  });
});

describe('formatFile', () => {
  it('matches the existing frontmatter style', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    const out = formatFile(movie);
    expect(out).toContain("title: '28 Years Later'");
    expect(out).toContain('published: true');
    expect(out).toContain("  - 'Horror'");
    expect(out).toContain('point: 8.5');
    expect(out).toMatch(/---\n\nIn 2002/);
  });

  it('omits empty optional fields', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    const out = formatFile(movie);
    expect(out).not.toContain('summary:');
    expect(out).not.toContain('streaming:');
    expect(out).not.toContain('checked:');
  });

  it('emits added as the last key in the frontmatter', () => {
    const { movie } = buildMovie(parseIssueBody(sample), {
      now: new Date('2026-09-21T13:02:16Z'),
    });
    expect(formatFile(movie)).toMatch(/added: '2026-09-21T13:02:16\.000Z'\n---\n/);
  });

  it('omits added when there is no stamp', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    expect(formatFile({ ...movie, added: '' })).not.toContain('added:');
  });

  it('emits summary_ja under summary', () => {
    const { movie } = buildMovie(parseIssueBody(sample));
    const out = formatFile({ ...movie, summary: 'English one.', summary_ja: '日本語のほう。' });
    expect(out).toMatch(/summary: 'English one\.'\nsummary_ja: '日本語のほう。'/);
  });

  it('emits streaming as a list and checked as a quoted month', () => {
    const body = `### Title

Night in Paradise

### List

Watchlist

### Streaming

Netflix, Disney+

### Availability checked

2026-07
`;
    const out = formatFile(buildMovie(parseIssueBody(body)).movie);
    expect(out).toContain('streaming:');
    expect(out).toContain("  - 'Netflix'");
    expect(out).toContain("  - 'Disney+'");
    expect(out).toContain("checked: '2026-07'");
  });

  it('omits seen for a normal entry but emits it for a Seen entry', () => {
    const watched = formatFile(buildMovie(parseIssueBody(sample)).movie);
    expect(watched).not.toContain('seen:');

    const seenBody = sample.replace('### List\n\nWatched', '### List\n\nSeen');
    const seenOut = formatFile(buildMovie(parseIssueBody(seenBody)).movie);
    expect(seenOut).toContain('published: false');
    expect(seenOut).toContain('seen: true');
  });

  it('omits watching for a normal entry but emits it for an In Progress entry', () => {
    const watched = formatFile(buildMovie(parseIssueBody(sample)).movie);
    expect(watched).not.toContain('watching:');

    const body = sample.replace('### List\n\nWatched', '### List\n\nIn Progress');
    const out = formatFile(buildMovie(parseIssueBody(body)).movie);
    expect(out).toContain('published: false');
    expect(out).toContain('watching: true');
    expect(out).not.toContain('seen:');
  });

  it('omits dropped for a normal entry but emits it for a Dropped entry', () => {
    const watched = formatFile(buildMovie(parseIssueBody(sample)).movie);
    expect(watched).not.toContain('dropped:');

    const body = sample.replace('### List\n\nWatched', '### List\n\nDropped');
    const out = formatFile(buildMovie(parseIssueBody(body)).movie);
    expect(out).toContain('published: false');
    expect(out).toContain('dropped: true');
    expect(out).not.toContain('watching:');
    expect(out).not.toContain('seen:');
  });
});

describe('readExisting', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movies-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses a watchlist file', () => {
    const file = path.join(tmpDir, 'mov.md');
    fs.writeFileSync(
      file,
      [
        '---',
        "title: 'Mov'",
        'published: false',
        'tags:',
        "  - 'Sci-fi'",
        "national: 'USA'",
        "release_date: '2026-06-01'",
        '---',
        '',
        'Body text.',
        '',
      ].join('\n'),
    );
    const m = readExisting(file);
    expect(m.title).toBe('Mov');
    expect(m.published).toBe(false);
    expect(m.tags).toEqual(['Sci-fi']);
    expect(m.national).toBe('USA');
    expect(m.release_date).toBe('2026-06-01');
    expect(m.watch_date).toBe('');
    expect(m.point).toBeNull();
    expect(m.body).toBe('Body text.');
    expect(m.added).toBe('');
  });

  it('reads added as a full instant', () => {
    const file = path.join(tmpDir, 'stamped.md');
    fs.writeFileSync(file, ['---', "title: 'Mov'", "added: '2026-09-12T15:14:25Z'", '---', ''].join('\n'));
    expect(readExisting(file).added).toBe('2026-09-12T15:14:25.000Z');
  });

  it('coerces an unquoted YAML timestamp in added', () => {
    const file = path.join(tmpDir, 'unquoted.md');
    fs.writeFileSync(file, ['---', "title: 'Mov'", 'added: 2026-09-12T15:14:25Z', '---', ''].join('\n'));
    expect(readExisting(file).added).toBe('2026-09-12T15:14:25.000Z');
  });

  it('reads a malformed added as absent rather than storing a broken stamp', () => {
    const file = path.join(tmpDir, 'broken.md');
    fs.writeFileSync(file, ['---', "title: 'Mov'", "added: 'last Tuesday'", '---', ''].join('\n'));
    expect(readExisting(file).added).toBe('');
  });

  it('reads streaming as an array and checked as a month', () => {
    const file = path.join(tmpDir, 'wl-streaming.md');
    fs.writeFileSync(
      file,
      [
        '---',
        "title: 'WL'",
        'published: false',
        'streaming:',
        "  - 'Netflix'",
        "  - 'Disney+'",
        "checked: '2026-07'",
        '---',
        '',
      ].join('\n'),
    );
    const m = readExisting(file);
    expect(m.streaming).toEqual(['Netflix', 'Disney+']);
    expect(m.checked).toBe('2026-07');
  });

  it('defaults streaming to [] and checked to empty when absent', () => {
    const file = path.join(tmpDir, 'no-streaming.md');
    fs.writeFileSync(file, ['---', "title: 'T'", 'published: false', '---', ''].join('\n'));
    const m = readExisting(file);
    expect(m.streaming).toEqual([]);
    expect(m.checked).toBe('');
  });

  it('falls back to comma-split when tags is a string', () => {
    const file = path.join(tmpDir, 'string-tags.md');
    fs.writeFileSync(
      file,
      ['---', "title: 'T'", 'published: true', "tags: 'Horror, Drama'", '---', ''].join('\n'),
    );
    const m = readExisting(file);
    expect(m.tags).toEqual(['Horror', 'Drama']);
  });

  it('coerces unquoted YAML dates back to ISO strings', () => {
    const file = path.join(tmpDir, 'legacy.md');
    fs.writeFileSync(
      file,
      ['---', "title: 'Legacy'", 'published: true', 'release_date: 2024-01-15', '---', ''].join('\n'),
    );
    const m = readExisting(file);
    expect(m.release_date).toBe('2024-01-15');
  });

  it('reads seasons back off an existing file', () => {
    const file = path.join(tmpDir, 'series.md');
    fs.writeFileSync(
      file,
      "---\ntitle: 'S'\npublished: false\ndropped: true\nseasons:\n  - season: 1\n    point: 7.3\n    status: 'watched'\n  - season: 2\n    status: 'dropped'\n---\n\nBody\n",
    );
    expect(readExisting(file).seasons).toEqual([
      { season: 1, point: 7.3, status: 'watched', watch_date: '' },
      { season: 2, point: null, status: 'dropped', watch_date: '' },
    ]);
  });
});

describe('parseSeasons', () => {
  it('reads number, score, status and date in any order off one line', () => {
    expect(parseSeasons('1, 7.3, watched, 2026-08-20')).toEqual([
      { season: 1, point: 7.3, status: 'watched', watch_date: '2026-08-20' },
    ]);
    expect(parseSeasons('2 2026-01-05 dropped 6')).toEqual([
      { season: 2, point: 6, status: 'dropped', watch_date: '2026-01-05' },
    ]);
  });

  it('accepts S and Season prefixes and sorts by number', () => {
    expect(parseSeasons('Season 3 8\nS1 7.5\n2 7').map(s => s.season)).toEqual([1, 2, 3]);
  });

  it('defaults a bare season line to watched with no score', () => {
    expect(parseSeasons('4')).toEqual([
      { season: 4, point: null, status: 'watched', watch_date: '' },
    ]);
  });

  it('skips a line that is only a score rather than reading it as a season number', () => {
    expect(parseSeasons('7.3')).toEqual([]);
  });

  it('skips a line with no leading season number', () => {
    expect(parseSeasons('watched 8.0\n\nnotes about the show')).toEqual([]);
  });

  it('returns nothing for a blank field', () => {
    expect(parseSeasons('')).toEqual([]);
    expect(parseSeasons(undefined)).toEqual([]);
  });

  it('lands on the movie built from an issue body', () => {
    const body = `### Title\n\nSeries\n\n### List\n\nDropped\n\n### Seasons\n\n1, 7.3, watched\n2, dropped\n`;
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.seasons).toEqual([
      { season: 1, point: 7.3, status: 'watched', watch_date: '' },
      { season: 2, point: null, status: 'dropped', watch_date: '' },
    ]);
  });

  it('writes seasons as a nested frontmatter list, omitting the fields it lacks', () => {
    const out = formatFile({
      title: 'S',
      published: false,
      dropped: true,
      tags: [],
      point: null,
      seasons: [
        { season: 1, point: 7.3, status: 'watched', watch_date: '2026-08-20' },
        { season: 2, point: null, status: 'dropped', watch_date: '' },
      ],
    });
    expect(out).toContain(
      "seasons:\n  - season: 1\n    point: 7.3\n    status: 'watched'\n    watch_date: '2026-08-20'\n  - season: 2\n    status: 'dropped'\n",
    );
  });
});

describe('mergeMovie', () => {
  const existing = {
    title: 'Mov',
    published: false,
    tags: ['Sci-fi'],
    national: 'USA',
    cover_image: 'https://example.com/c.jpg',
    release_date: '2026-06-01',
    watch_date: '',
    point: null,
    streaming: ['Netflix'],
    checked: '2026-06',
    summary: 'old summary',
    summary_ja: '前の日本語概要',
    impression: '',
    added: '2026-06-01T10:00:00.000Z',
    body: 'old body',
  };
  const noStreaming = { streaming: [], checked: '' };

  it('promotes watchlist to watched and adds new fields without losing existing', () => {
    const incoming = {
      title: 'Mov',
      published: true,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '2026-05-12',
      point: 8.5,
      ...noStreaming,
      summary: '',
      impression: 'Wild ride.',
      body: '',
    };
    const merged = mergeMovie(existing, incoming);
    expect(merged.published).toBe(true);
    expect(merged.watch_date).toBe('2026-05-12');
    expect(merged.point).toBe(8.5);
    expect(merged.impression).toBe('Wild ride.');
    expect(merged.tags).toEqual(['Sci-fi']);
    expect(merged.national).toBe('USA');
    expect(merged.cover_image).toBe('https://example.com/c.jpg');
    expect(merged.release_date).toBe('2026-06-01');
    expect(merged.summary).toBe('old summary');
    // The Japanese text is optional and rarely re-typed, so a blank one keeps the old.
    expect(merged.summary_ja).toBe('前の日本語概要');
    expect(merged.body).toBe('old body');
    // A blank streaming/checked from the issue keeps the last known availability.
    expect(merged.streaming).toEqual(['Netflix']);
    expect(merged.checked).toBe('2026-06');
  });

  // The one field here where existing wins. Every other value is overwritten or filled in
  // from the incoming issue; restamping added on a re-file would jump a film the reader
  // queued months ago to the top of the added order the moment they logged it as watched.
  it('keeps the original added stamp when the entry is re-filed', () => {
    const incoming = {
      title: 'Mov',
      published: true,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '2026-09-21',
      point: 8.5,
      ...noStreaming,
      summary: '',
      impression: '',
      added: '2026-09-21T13:02:16.000Z',
      body: '',
    };
    expect(mergeMovie(existing, incoming).added).toBe('2026-06-01T10:00:00.000Z');
  });

  it('takes the incoming stamp when the existing entry predates the field', () => {
    const incoming = {
      title: 'Mov',
      published: true,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '',
      point: null,
      ...noStreaming,
      summary: '',
      impression: '',
      added: '2026-09-21T13:02:16.000Z',
      body: '',
    };
    expect(mergeMovie({ ...existing, added: '' }, incoming).added).toBe('2026-09-21T13:02:16.000Z');
  });

  it('clears watching when an in-progress series is re-filed as watched', () => {
    const inProgress = { ...existing, watching: true };
    const merged = mergeMovie(inProgress, {
      title: 'Mov',
      published: true,
      seen: false,
      watching: false,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '2026-05-12',
      point: 8.5,
      ...noStreaming,
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.watching).toBe(false);
    expect(merged.published).toBe(true);
    expect(formatFile(merged)).not.toContain('watching:');
  });

  it('clears dropped when an abandoned film is picked back up and finished', () => {
    const abandoned = { ...existing, dropped: true };
    const merged = mergeMovie(abandoned, {
      title: 'Mov',
      published: true,
      seen: false,
      watching: false,
      dropped: false,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '2026-05-12',
      point: 8.5,
      ...noStreaming,
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.dropped).toBe(false);
    expect(merged.published).toBe(true);
    expect(formatFile(merged)).not.toContain('dropped:');
  });

  it('lets the issue overwrite non-empty fields when re-submitted with new values', () => {
    const incoming = {
      title: 'Mov',
      published: true,
      tags: ['Drama'],
      national: 'Japan',
      cover_image: '',
      release_date: '2026-07-10',
      watch_date: '2026-05-12',
      point: 9,
      streaming: ['Disney+'],
      checked: '2026-08',
      summary: 'new summary',
      impression: '',
      body: 'new body',
    };
    const merged = mergeMovie(existing, incoming);
    expect(merged.tags).toEqual(['Drama']);
    expect(merged.national).toBe('Japan');
    expect(merged.release_date).toBe('2026-07-10');
    expect(merged.summary).toBe('new summary');
    expect(merged.body).toBe('new body');
    // A fresh streaming/checked from the issue overwrites the old availability.
    expect(merged.streaming).toEqual(['Disney+']);
    expect(merged.checked).toBe('2026-08');
  });

  it('preserves existing point when issue point is blank', () => {
    const merged = mergeMovie({ ...existing, point: 7 }, {
      title: 'Mov',
      published: true,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '',
      point: null,
      ...noStreaming,
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.point).toBe(7);
  });

  it('merges seasons by number instead of replacing the recorded list', () => {
    const series = {
      ...existing,
      seasons: [
        { season: 1, point: 7.3, status: 'watched', watch_date: '2026-08-20' },
        { season: 2, point: null, status: 'watching', watch_date: '' },
      ],
    };
    const merged = mergeMovie(series, {
      title: 'Mov',
      published: false,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '',
      point: null,
      seasons: [
        { season: 2, point: 8, status: 'watched', watch_date: '2026-09-01' },
        { season: 3, point: null, status: 'dropped', watch_date: '' },
      ],
      ...noStreaming,
      summary: '',
      impression: '',
      body: '',
    });
    // Season 1 was never re-typed and survives; season 2 takes the newer record.
    expect(merged.seasons).toEqual([
      { season: 1, point: 7.3, status: 'watched', watch_date: '2026-08-20' },
      { season: 2, point: 8, status: 'watched', watch_date: '2026-09-01' },
      { season: 3, point: null, status: 'dropped', watch_date: '' },
    ]);
  });

  it('leaves seasons alone for an entry and an issue that have none', () => {
    const merged = mergeMovie(existing, {
      title: 'Mov',
      published: true,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '',
      point: null,
      ...noStreaming,
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.seasons).toEqual([]);
    expect(formatFile(merged)).not.toContain('seasons:');
  });

  it('accepts a 0 point from the issue', () => {
    const merged = mergeMovie({ ...existing, point: 7 }, {
      title: 'Mov',
      published: true,
      tags: [],
      national: '',
      cover_image: '',
      release_date: '',
      watch_date: '',
      point: 0,
      ...noStreaming,
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.point).toBe(0);
  });
});
