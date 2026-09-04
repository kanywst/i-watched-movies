// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { countGenres, countLogged, partitionMovies } from './partition';
import type { Movie } from './types';

const make = (overrides: Partial<Movie>): Movie => ({
  id: 'x',
  title: 'X',
  published: true,
  tags: [],
  cover_image: '',
  release_date: '2025-01-01',
  watch_date: '2025-01-01',
  point: 7,
  content: '',
  ...overrides,
});

const rated = make({ id: 'rated', published: true, seen: false });
const queued = make({ id: 'queued', published: false, seen: false, watch_date: '' });
const unrated = make({ id: 'unrated', published: false, seen: true });
// A `seen` entry that also carries published: true has been watched either way; the seen
// flag is what decides which section it lands in.
const seenPublished = make({ id: 'seen-published', published: true, seen: true });
const inProgress = make({ id: 'in-progress', published: false, seen: false, watching: true, watch_date: '' });

const all = [rated, queued, unrated, seenPublished, inProgress];

describe('partitionMovies', () => {
  it('splits the diary into its four states', () => {
    const p = partitionMovies(all);
    expect(p.watched.map(m => m.id)).toEqual(['rated']);
    expect(p.watching.map(m => m.id)).toEqual(['in-progress']);
    expect(p.watchlist.map(m => m.id)).toEqual(['queued']);
    expect(p.seen.map(m => m.id)).toEqual(['unrated', 'seen-published']);
  });

  it('keeps the four states mutually exclusive and exhaustive', () => {
    const p = partitionMovies(all);
    const ids = [...p.watched, ...p.watching, ...p.watchlist, ...p.seen].map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(all.map(m => m.id).sort());
  });

  // `watching` wins over the other flags, so a stale published/seen left on an entry that
  // is being rewatched cannot pull it back into two tabs at once.
  it('files a watching entry under In Progress whatever else it carries', () => {
    const p = partitionMovies([
      make({ id: 'rewatch', published: true, seen: true, watching: true }),
    ]);
    expect(p.watching.map(m => m.id)).toEqual(['rewatch']);
    expect(p.watched).toEqual([]);
    expect(p.seen).toEqual([]);
    expect(p.history).toEqual([]);
  });

  it('history spans everything watched through, excluding the watchlist and in-progress', () => {
    const p = partitionMovies(all);
    expect(p.history.map(m => m.id).sort()).toEqual(['rated', 'seen-published', 'unrated']);
    expect(p.history).not.toContain(queued);
    expect(p.history).not.toContain(inProgress);
  });

  it('returns empty lists for an empty diary', () => {
    expect(partitionMovies([])).toEqual({
      watched: [],
      watching: [],
      watchlist: [],
      seen: [],
      history: [],
    });
  });
});

describe('countLogged', () => {
  it('counts only entries with a usable watch_date', () => {
    expect(
      countLogged([
        make({ watch_date: '2025-01-01' }),
        make({ watch_date: '' }),
        make({ watch_date: 'not-a-date' }),
      ]),
    ).toBe(1);
  });
});

describe('countGenres', () => {
  it('counts distinct tags across the list', () => {
    expect(
      countGenres([make({ tags: ['Horror', 'Mystery'] }), make({ tags: ['Mystery', 'Crime'] })]),
    ).toBe(3);
  });

  it('is zero for untagged entries', () => {
    expect(countGenres([make({ tags: [] })])).toBe(0);
  });
});
