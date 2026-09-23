// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { computeRankHistory } from './rankHistory';
import type { Movie } from './types';

const film = (id: string, point: number, day: string, added?: string): Movie => ({
  id,
  title: id,
  published: true,
  tags: [],
  national: '',
  cover_image: '',
  release_date: '',
  watch_date: `${day}T00:00:00.000Z`,
  point,
  content: '',
  ...(added ? { added } : {}),
});

const NOW = new Date('2026-09-23T12:00:00Z');
const ids = (movies: Movie[]) => movies.map(m => m.id);

describe('computeRankHistory', () => {
  it('replays in watch order, not input order', () => {
    const { events } = computeRankHistory(
      [film('c', 9, '2026-03-01'), film('a', 7, '2026-01-01'), film('b', 8, '2026-02-01')],
      3,
      NOW,
    );
    expect(events.map(e => [e.entrant.id, e.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 1],
    ]);
    expect(ids(events[2].top)).toEqual(['c', 'b', 'a']);
  });

  it('keeps an incumbent ahead of a later film on the same score', () => {
    const { events, reigns } = computeRankHistory(
      [film('first', 8, '2026-01-01'), film('tie', 8, '2026-02-01')],
      3,
      NOW,
    );
    expect(events[1]).toMatchObject({ rank: 2 });
    expect(ids(events[1].top)).toEqual(['first', 'tie']);
    expect(reigns.map(r => r.holder.id)).toEqual(['first']);
  });

  it('records nothing for a film that misses the top, and names who a new entrant pushes out', () => {
    const { events } = computeRankHistory(
      [
        film('a', 9, '2026-01-01'),
        film('b', 8, '2026-01-02'),
        film('c', 7, '2026-01-03'),
        film('miss', 7, '2026-01-04'),
        film('in', 7.5, '2026-01-05'),
      ],
      3,
      NOW,
    );
    expect(events.map(e => e.entrant.id)).toEqual(['a', 'b', 'c', 'in']);
    expect(events[2].displaced).toBeNull();
    expect(events[3]).toMatchObject({ rank: 3 });
    expect(events[3].displaced?.id).toBe('c');
    expect(ids(events[3].top)).toEqual(['a', 'b', 'in']);
  });

  it('never holds more than the limit', () => {
    const { events } = computeRankHistory(
      [film('a', 1, '2026-01-01'), film('b', 2, '2026-01-02'), film('c', 3, '2026-01-03')],
      2,
      NOW,
    );
    expect(events.map(e => e.top.length)).toEqual([1, 2, 2]);
  });

  it('snapshots the top rather than sharing one array across events', () => {
    const { events } = computeRankHistory(
      [film('a', 7, '2026-01-01'), film('b', 8, '2026-01-02')],
      3,
      NOW,
    );
    expect(ids(events[0].top)).toEqual(['a']);
  });

  it('orders a same-day pair by when each was added, then puts entries without `added` last', () => {
    // Ids run against the added order, so the id fallback cannot pass this by accident.
    const sameDay = [
      film('a-late', 8, '2026-01-01', '2026-01-01T20:00:00.000Z'),
      film('a-bare', 8, '2026-01-01'),
      film('z-early', 8, '2026-01-01', '2026-01-01T09:00:00.000Z'),
    ];
    const { reigns, events } = computeRankHistory(sameDay, 3, NOW);
    expect(reigns.map(r => r.holder.id)).toEqual(['z-early']);
    expect(ids(events[2].top)).toEqual(['z-early', 'a-late', 'a-bare']);
  });

  it('falls back to id so file order never decides a same-day tie', () => {
    const a = film('a', 8, '2026-01-01');
    const b = film('b', 8, '2026-01-01');
    expect(computeRankHistory([b, a], 3, NOW).reigns[0].holder.id).toBe('a');
    expect(computeRankHistory([a, b], 3, NOW).reigns[0].holder.id).toBe('a');
  });

  it('closes each reign on the day it was taken and counts the current one up to now', () => {
    const { reigns } = computeRankHistory(
      [film('a', 7, '2026-01-01'), film('b', 8, '2026-03-01'), film('c', 9, '2026-09-01')],
      3,
      NOW,
    );
    expect(reigns).toMatchObject([
      { from: '2026-01-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z', days: 59 },
      { from: '2026-03-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z', days: 184 },
      { from: '2026-09-01T00:00:00.000Z', to: null, days: 22 },
    ]);
  });

  it('does not open a reign for a film landing below #1', () => {
    const { reigns } = computeRankHistory(
      [film('a', 9, '2026-01-01'), film('b', 8, '2026-02-01')],
      3,
      NOW,
    );
    expect(reigns).toHaveLength(1);
    expect(reigns[0]).toMatchObject({ to: null, days: 265 });
  });

  it('skips entries with no usable watch_date', () => {
    const undated = { ...film('undated', 10, '2026-01-01'), watch_date: '' };
    const { events, reigns } = computeRankHistory([undated, film('a', 7, '2026-01-01')], 3, NOW);
    expect(events.map(e => e.entrant.id)).toEqual(['a']);
    expect(reigns.map(r => r.holder.id)).toEqual(['a']);
  });

  it('is empty for an empty diary', () => {
    expect(computeRankHistory([], 3, NOW)).toEqual({ events: [], reigns: [] });
  });
});
