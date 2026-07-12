// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import {
  buildMovie,
  formatFile,
  mergeMovie,
  parseIssueBody,
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

  it('sets published=false when List is Watchlist', () => {
    const body = sample.replace('### List\n\nWatched', '### List\n\nWatchlist');
    const { movie } = buildMovie(parseIssueBody(body));
    expect(movie.published).toBe(false);
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

  it('still falls back to the issue number when a Japanese title has no Slug', () => {
    const { slug } = buildMovie({ Title: '死刑にいたる病' }, { issueNumber: '7' });
    expect(slug).toBe('movie-7');
  });

  it('ignores a Slug that slugifies to nothing', () => {
    const { slug } = buildMovie({ Title: '28 Years Later', Slug: '???' });
    expect(slug).toBe('28-years-later');
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
    summary: 'old summary',
    impression: '',
    body: 'old body',
  };

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
    expect(merged.body).toBe('old body');
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
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.point).toBe(7);
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
      summary: '',
      impression: '',
      body: '',
    });
    expect(merged.point).toBe(0);
  });
});
