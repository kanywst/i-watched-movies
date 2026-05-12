import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const NO_RESPONSE = '_No response_';

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

export function buildMovie(sections, { issueNumber } = {}) {
  const list = (sections['List'] || 'Watched').trim();
  const published = list.toLowerCase() !== 'watchlist';

  const movie = {
    title: (sections['Title'] || '').trim(),
    published,
    tags: parseTags(sections['Tags']),
    national: (sections['National'] || '').trim(),
    cover_image: (sections['Cover image URL'] || '').trim(),
    release_date: parseDate(sections['Release date']),
    watch_date: parseDate(sections['Watch date']),
    point: parsePoint(sections['Point']),
    summary: (sections['Summary'] || '').trim(),
    impression: (sections['Impression'] || '').trim(),
    body: (sections['Body'] || '').trim(),
  };

  if (!movie.title) {
    throw new Error('Title is required.');
  }

  const slug = slugify(movie.title, issueNumber ? `movie-${issueNumber}` : 'movie');
  return { movie, slug };
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
    tags: Array.isArray(data.tags) ? data.tags.filter(Boolean).map(String) : parseTags(data.tags),
    national: (data.national ?? '').toString().trim(),
    cover_image: (data.cover_image ?? '').toString().trim(),
    release_date: existingDate(data.release_date),
    watch_date: existingDate(data.watch_date),
    point,
    summary: (data.summary ?? '').toString().trim(),
    impression: (data.impression ?? '').toString().trim(),
    body: (content ?? '').trim(),
  };
}

export function mergeMovie(existing, incoming) {
  return {
    title: incoming.title,
    published: incoming.published,
    tags: incoming.tags.length ? incoming.tags : existing.tags,
    national: incoming.national || existing.national,
    cover_image: incoming.cover_image || existing.cover_image,
    release_date: incoming.release_date || existing.release_date,
    watch_date: incoming.watch_date || existing.watch_date,
    point: incoming.point !== null ? incoming.point : existing.point,
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
  if (movie.tags.length) {
    lines.push('tags:');
    for (const t of movie.tags) lines.push(`  - ${quote(t)}`);
  }
  if (movie.national) lines.push(`national: ${quote(movie.national)}`);
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
  const outPath = path.join('movies', `${slug}.md`);

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
  emit('list', finalMovie.published ? 'Watched' : 'Watchlist');
  emit('watchlist', finalMovie.published ? 'false' : 'true');
  emit('action', action);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
