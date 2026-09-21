import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const NO_RESPONSE = '_No response_';
const MOVIES_DIR = 'movies';

export function parseIssueBody(body) {
  const sections = {};
  const text = String(body || '').replace(/\r\n/g, '\n');
  const parts = text.split(/\n###\s+/);
  for (let i = 0; i < parts.length; i++) {
    let chunk = parts[i];
    if (i === 0) {
      if (!chunk.startsWith('### ')) continue;
      chunk = chunk.slice(4);
    }
    const nl = chunk.indexOf('\n');
    if (nl === -1) continue;
    const label = chunk.slice(0, nl).trim();
    const value = chunk.slice(nl + 1).trim();
    sections[label] = value === NO_RESPONSE ? '' : value;
  }
  return sections;
}

export function slugify(input, fallback) {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['"`’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

function parseTags(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// The Streaming form field is a checkboxes list, so its section body is lines like
// "- [x] Netflix". Extract the ticked labels. Falls back to comma-splitting so a
// hand-written or legacy comma list still works.
function parseStreaming(raw) {
  const text = String(raw || '');
  if (/-\s*\[[ xX]\]/.test(text)) {
    return text
      .split('\n')
      .map(line => line.match(/^\s*-\s*\[[xX]\]\s*(.+?)\s*$/))
      .filter(Boolean)
      .map(m => m[1].trim());
  }
  return parseTags(text);
}

const SEASON_STATUSES = new Set(['watched', 'watching', 'dropped']);

// The Seasons form field is free text, one season per line: the season number first, then
// any of a score, a status word and a YYYY-MM-DD, in any order and separated by commas or
// spaces. "1, 7.3, watched, 2026-08-20", "S2 dropped" and "Season 3" all parse.
//
// The leading number must be a bare integer, so a line that is only a score ("7.3") is
// skipped rather than read as season 7. Anything with no leading season number is skipped
// too: a line the form cannot place is worth losing, a line placed wrongly is not.
export function parseSeasons(raw) {
  const out = [];
  for (const line of String(raw || '').split('\n')) {
    const head = line.match(/^\s*(?:seasons?\s*|s)?(\d+)(?![\d.])/i);
    if (!head) continue;
    const season = {
      season: Number(head[1]),
      point: null,
      status: 'watched',
      watch_date: '',
    };
    for (const token of line.slice(head[0].length).split(/[,\s]+/)) {
      const t = token.trim();
      if (!t) continue;
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) season.watch_date = t;
      else if (SEASON_STATUSES.has(t.toLowerCase())) season.status = t.toLowerCase();
      else if (season.point === null && Number.isFinite(Number(t))) season.point = Number(t);
    }
    out.push(season);
  }
  return sortSeasons(out);
}

function sortSeasons(seasons) {
  return [...seasons].sort((a, b) => a.season - b.season);
}

function existingSeasons(value) {
  if (!Array.isArray(value)) return [];
  return sortSeasons(
    value
      .map(raw => {
        if (!raw || typeof raw !== 'object') return null;
        const season = Number(raw.season);
        if (!Number.isFinite(season)) return null;
        let point = null;
        if (raw.point !== undefined && raw.point !== null && raw.point !== '') {
          const n = Number(raw.point);
          if (Number.isFinite(n)) point = n;
        }
        const status = String(raw.status ?? '').trim().toLowerCase();
        return {
          season,
          point,
          status: SEASON_STATUSES.has(status) ? status : 'watched',
          watch_date: existingDate(raw.watch_date),
        };
      })
      .filter(Boolean),
  );
}

// Merged per season number rather than replaced wholesale, unlike `tags` and `streaming`.
// A season is logged when it is finished, so the natural issue lists only the new one, and
// replacing would delete every season already recorded. The cost is that the form cannot
// remove a season; edit the file for that.
function mergeSeasons(existing, incoming) {
  const by = new Map(existing.map(s => [s.season, s]));
  for (const s of incoming) by.set(s.season, s);
  return sortSeasons([...by.values()]);
}

function parsePoint(raw) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw) {
  if (!raw) return '';
  const m = String(raw).trim().match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

// `checked` is a month stamp (YYYY-MM). Accept a full date and keep the month part;
// reject impossible months (00, 13-99) rather than storing them as a stamp.
function parseMonth(raw) {
  if (!raw) return '';
  const m = String(raw).trim().match(/^\d{4}-(?:0[1-9]|1[0-2])/);
  return m ? m[0] : '';
}

function existingMonth(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 7);
  }
  return parseMonth(value);
}

// The stamp behind the `added_desc` sort. It is machine-set rather than a form field
// because it answers "when did this land in the diary", which the filer cannot restate and
// should not be able to. Full precision, not YYYY-MM-DD: a batch of issues filed in one
// sitting shares a date, and a date-only stamp would put that batch back on the arbitrary
// tie order the sort exists to replace.
export function buildMovie(sections, { issueNumber, now = new Date() } = {}) {
  const list = (sections['List'] || 'Watched').trim().toLowerCase();
  // "Seen" is watched-but-unrated: not published (no score, kept out of the Watched grid)
  // and flagged so it lands in its own Seen section rather than the Watchlist.
  const seen = list === 'seen';
  // "In Progress" is started-but-not-finished, mostly a long series. Also unpublished, and
  // flagged so partitionMovies keeps it out of both the Watchlist and the History heatmap.
  const watching = list === 'in progress';
  // "Dropped" is started-and-given-up-on. Unpublished like the two above, and kept out of
  // the History heatmap as well: it was never watched through, so it has no watched date.
  const dropped = list === 'dropped';
  const published = list === 'watched';

  const movie = {
    title: (sections['Title'] || '').trim(),
    published,
    seen,
    watching,
    dropped,
    tags: parseTags(sections['Tags']),
    national: (sections['National'] || '').trim(),
    cover_image: (sections['Cover image URL'] || '').trim(),
    release_date: parseDate(sections['Release date']),
    watch_date: parseDate(sections['Watch date']),
    point: parsePoint(sections['Point']),
    seasons: parseSeasons(sections['Seasons']),
    streaming: parseStreaming(sections['Streaming']),
    checked: parseMonth(sections['Availability checked']),
    summary: (sections['Summary'] || '').trim(),
    summary_ja: (sections['Summary (JA)'] || '').trim(),
    impression: (sections['Impression'] || '').trim(),
    added: now.toISOString(),
    body: (sections['Body'] || '').trim(),
  };

  if (!movie.title) {
    throw new Error('Title is required.');
  }

  // slugify() strips everything outside [a-z0-9], so a Japanese title yields nothing and
  // would land on the movie-<issue> fallback. Prefer, in order: an entry that already
  // holds this title (so re-logging a watchlist film updates it instead of forking a
  // second file), then an explicit Slug section, then the title, then the fallback.
  const fallback = issueNumber ? `movie-${issueNumber}` : 'movie';
  const slug =
    findSlugByTitle(movie.title) ||
    slugify(sections['Slug'], '') ||
    slugify(movie.title, fallback);
  return { movie, slug };
}

// Scan movies/ for an entry whose title matches, and return its slug. Without this a
// Japanese-titled film already on the watchlist gets a fresh movie-<issue>.md when it is
// later logged as watched, because readExisting() only ever looks a file up by slug.
export function findSlugByTitle(title, dir = MOVIES_DIR) {
  if (!title || !fs.existsSync(dir)) return '';
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    try {
      const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (String(data.title || '').trim() === title) return file.replace(/\.md$/, '');
    } catch {
      // A malformed file should not block the entry being written.
    }
  }
  return '';
}

function existingDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  }
  return parseDate(value);
}

export function readExisting(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  let point = null;
  if (data.point !== undefined && data.point !== null && data.point !== '') {
    const n = Number(data.point);
    if (Number.isFinite(n)) point = n;
  }
  return {
    title: (data.title ?? '').toString().trim(),
    published: data.published ?? true,
    seen: data.seen ?? false,
    watching: data.watching ?? false,
    dropped: data.dropped ?? false,
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).map(String) : parseTags(data.tags),
    national: (data.national ?? '').toString().trim(),
    cover_image: (data.cover_image ?? '').toString().trim(),
    release_date: existingDate(data.release_date),
    watch_date: existingDate(data.watch_date),
    point,
    seasons: existingSeasons(data.seasons),
    streaming: Array.isArray(data.streaming)
      ? data.streaming.filter(Boolean).map(String)
      : parseTags(data.streaming),
    checked: existingMonth(data.checked),
    summary: (data.summary ?? '').toString().trim(),
    summary_ja: (data.summary_ja ?? '').toString().trim(),
    impression: (data.impression ?? '').toString().trim(),
    added: existingStamp(data.added),
    body: (content ?? '').trim(),
  };
}

// `added` is a full ISO instant. An unquoted one in YAML parses to a Date, so coerce that
// back; anything unparseable reads as absent rather than being stored as a broken stamp.
function existingStamp(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }
  if (!value) return '';
  const d = new Date(String(value).trim());
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function mergeMovie(existing, incoming) {
  return {
    title: incoming.title,
    published: incoming.published,
    seen: incoming.seen,
    // Cleared, not OR-ed: re-filing an in-progress series as Watched has to drop the flag,
    // otherwise it would stay pinned to the In Progress tab forever. Same for `dropped`,
    // which is how an abandoned film is picked back up and finished.
    watching: incoming.watching,
    dropped: incoming.dropped,
    tags: incoming.tags.length ? incoming.tags : existing.tags,
    national: incoming.national || existing.national,
    cover_image: incoming.cover_image || existing.cover_image,
    release_date: incoming.release_date || existing.release_date,
    watch_date: incoming.watch_date || existing.watch_date,
    point: incoming.point !== null ? incoming.point : existing.point,
    seasons: mergeSeasons(existing.seasons || [], incoming.seasons || []),
    streaming: incoming.streaming.length ? incoming.streaming : existing.streaming,
    checked: incoming.checked || existing.checked,
    summary: incoming.summary || existing.summary,
    summary_ja: incoming.summary_ja || existing.summary_ja,
    impression: incoming.impression || existing.impression,
    // Existing wins, unlike every other field here: `added` records when the entry first
    // landed, so re-filing an issue to move a film from the watchlist to watched must not
    // restamp it to today and jump it to the top of the added order.
    added: existing.added || incoming.added,
    body: incoming.body || existing.body,
  };
}

function quote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

export function formatFile(movie) {
  const lines = ['---'];
  lines.push(`title: ${quote(movie.title)}`);
  lines.push(`published: ${movie.published}`);
  if (movie.seen) lines.push('seen: true');
  if (movie.watching) lines.push('watching: true');
  if (movie.dropped) lines.push('dropped: true');
  if (movie.tags.length) {
    lines.push('tags:');
    for (const t of movie.tags) lines.push(`  - ${quote(t)}`);
  }
  if (movie.national) lines.push(`national: ${quote(movie.national)}`);
  if (movie.streaming && movie.streaming.length) {
    lines.push('streaming:');
    for (const s of movie.streaming) lines.push(`  - ${quote(s)}`);
  }
  if (movie.checked) lines.push(`checked: ${quote(movie.checked)}`);
  if (movie.cover_image) lines.push(`cover_image: ${quote(movie.cover_image)}`);
  if (movie.release_date) lines.push(`release_date: ${quote(movie.release_date)}`);
  if (movie.watch_date) lines.push(`watch_date: ${quote(movie.watch_date)}`);
  if (movie.point !== null) lines.push(`point: ${movie.point}`);
  if (movie.seasons && movie.seasons.length) {
    lines.push('seasons:');
    for (const s of movie.seasons) {
      lines.push(`  - season: ${s.season}`);
      if (s.point !== null) lines.push(`    point: ${s.point}`);
      lines.push(`    status: ${quote(s.status)}`);
      if (s.watch_date) lines.push(`    watch_date: ${quote(s.watch_date)}`);
    }
  }
  if (movie.summary) lines.push(`summary: ${quote(movie.summary)}`);
  if (movie.summary_ja) lines.push(`summary_ja: ${quote(movie.summary_ja)}`);
  if (movie.impression) lines.push(`impression: ${quote(movie.impression)}`);
  if (movie.added) lines.push(`added: ${quote(movie.added)}`);
  lines.push('---');
  lines.push('');
  if (movie.body) {
    lines.push(movie.body);
    lines.push('');
  }
  return lines.join('\n');
}

function emit(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `${name}=${value}\n`);
  console.log(`${name}=${value}`);
}

function main() {
  const body = process.env.ISSUE_BODY;
  const issueNumber = process.env.ISSUE_NUMBER;
  if (!body) throw new Error('ISSUE_BODY env is required.');

  const sections = parseIssueBody(body);
  const { movie: incoming, slug } = buildMovie(sections, { issueNumber });
  const outPath = path.join(MOVIES_DIR, `${slug}.md`);

  let finalMovie = incoming;
  let action = 'add';
  if (fs.existsSync(outPath)) {
    const existing = readExisting(outPath);
    finalMovie = mergeMovie(existing, incoming);
    action = 'update';
  }

  fs.writeFileSync(outPath, formatFile(finalMovie));

  emit('slug', slug);
  emit('path', outPath);
  emit('title', finalMovie.title);
  emit(
    'list',
    finalMovie.dropped
      ? 'Dropped'
      : finalMovie.watching
        ? 'In Progress'
        : finalMovie.seen
          ? 'Seen'
          : finalMovie.published
            ? 'Watched'
            : 'Watchlist',
  );
  emit('watchlist', finalMovie.published ? 'false' : 'true');
  emit('action', action);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
