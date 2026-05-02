# i-watched-movies

My personal log of movies I've watched. Each entry is a markdown file in `movies/`. The site reads them at build time and is deployed to Cloudflare Workers.

Live: <https://i-watched-movies.kanywst12.workers.dev/> · [RSS](https://i-watched-movies.kanywst12.workers.dev/feed.xml)

## Add a movie

Make a new file in `movies/`:

```markdown
---
title: 'Title'
published: true              # false = lives on the Watchlist tab instead
tags: ['Sci-Fi', 'Action']
national: 'Japan'            # optional, shows a flag emoji
cover_image: 'https://...'
release_date: '2025-01-01'
watch_date: '2026-01-12'     # leave empty for unwatched watchlist items
point: 9.5                   # 0..10
summary: 'Plot summary.'
impression: 'One-liner you want pulled out as a quote.'
---

Free-form notes here.
```

Push to `main`. CI runs lint + tests + build, and `gh-pages` is updated.

## Run it locally

```bash
npm install
npm run dev      # starts Vite, regenerates movies.json
npm run check    # lint + audit + test
npm run build
```

Node `>= 20.18`.

## What's where

- `scripts/generate-movies.js`: walks `movies/`, writes `src/data/movies.json`, also writes `public/feed.xml` and `public/collection.jsonld`
- `scripts/parse-movie.js`: frontmatter to `Movie` object (point coerced to number, dates to ISO)
- `scripts/build-feeds.js`: RSS + JSON-LD builders (covered by tests)
- `src/App.tsx`: view toggle, filter/sort/tag state mirrored to the URL
- `src/components/MovieCard.tsx`, `MovieDetailModal.tsx`: the grid card and the detail view. Modal hand-off uses the View Transitions API (no framer-motion)
- `src/sortMovies.ts`, `src/stats.ts`, `src/useUrlState.ts`, `src/useDocumentMetadata.ts`: small utilities, each tested

## Forking this for your own log

1. Use as template / fork
2. `src/config.ts`: set `USER_NAME` to your GitHub handle
3. `index.html`: replace the `og:*` / `twitter:*` / canonical URLs
4. `scripts/build-feeds.js`: update `SITE_URL`
5. `wrangler.jsonc`: rename `name` to your project
6. Connect the repo to Cloudflare Workers, build command `npm run build`, output `dist`

## Stack

React 19, Vite 8, Tailwind 4, TypeScript 6, Vitest 4. Animation is browser-native (View Transitions API), no JS animation library.

## CI / Deploy

- `ci.yml`: lint + test + audit + build on every PR
- Cloudflare Workers auto-deploys on push to `main` (via the GitHub integration). Build command `npm run build`, output `dist`
- `dependabot-auto-merge.yml`: auto-merges npm Dependabot PRs after CI. GitHub Actions PRs need manual merge (token can't grant `workflows` scope)
- `scorecard.yml`: OpenSSF Scorecard, weekly
