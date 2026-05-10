// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseIssueBody, slugify, buildMovie, formatFile } from './build-movie-from-issue.js';

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
