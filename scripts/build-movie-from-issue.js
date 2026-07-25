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

// `checked` is a month stamp (YYYY-MM). Accept a full date and keep the month part.
function parseMonth(raw) {
  if (!raw) return '';
  const m = String(raw).trim().match(/^\d{4}-\d{2}/);
  return m ? m[0] : '';
}

function existingMonth(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 7);
  }
  return parseMonth(value);
}

export function buildMovie(sections, { issueNumber } = {}) {
  const list = (sections['List'] || 'Watched').trim().toLowerCase();
  // "Seen" is watched-but-unrated: not published (no score, kept out of the Watched grid)
  // and flagged so it lands in its own Seen section rather than the Watchlist.
  const seen = list === 'seen';
  const published = list === 'watched';

  const movie = {
    title: (sections['Title'] || '').trim(),
    published,
    seen,
    tags: parseTags(sections['Tags']),
    national: (sections['National'] || '').trim(),
    cover_image: (sections['Cover image URL'] || '').trim(),
    release_date: parseDate(sections['Release date']),
    watch_date: parseDate(sections['Watch date']),
    point: parsePoint(sections['Point']),
    streaming: parseTags(sections['Streaming']),
    checked: parseMonth(sections['Availability checked']),
    summary: (sections['Summary'] || '').trim(),
    impression: (sections['Impression'] || '').trim(),
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
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).map(String) : parseTags(data.tags),
    national: (data.national ?? '').toString().trim(),
    cover_image: (data.cover_image ?? '').toString().trim(),
    release_date: existingDate(data.release_date),
    watch_date: existingDate(data.watch_date),
    point,
    streaming: Array.isArray(data.streaming)
      ? data.streaming.filter(Boolean).map(String)
      : parseTags(data.streaming),
    checked: existingMonth(data.checked),
    summary: (data.summary ?? '').toString().trim(),
    impression: (data.impression ?? '').toString().trim(),
    body: (content ?? '').trim(),
  };
}

export function mergeMovie(existing, incoming) {
  return {
    title: incoming.title,
    published: incoming.published,
    seen: incoming.seen,
    tags: incoming.tags.length ? incoming.tags : existing.tags,
    national: incoming.national || existing.national,
    cover_image: incoming.cover_image || existing.cover_image,
    release_date: incoming.release_date || existing.release_date,
    watch_date: incoming.watch_date || existing.watch_date,
    point: incoming.point !== null ? incoming.point : existing.point,
    streaming: incoming.streaming.length ? incoming.streaming : existing.streaming,
    checked: incoming.checked || existing.checked,
    summary: incoming.summary || existing.summary,
    impression: incoming.impression || existing.impression,
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
  if (movie.summary) lines.push(`summary: ${quote(movie.summary)}`);
  if (movie.impression) lines.push(`impression: ${quote(movie.impression)}`);
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
  emit('list', finalMovie.seen ? 'Seen' : finalMovie.published ? 'Watched' : 'Watchlist');
  emit('watchlist', finalMovie.published ? 'false' : 'true');
  emit('action', action);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
