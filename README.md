# i-watched-movies

My personal log of movies I've watched. Each entry is a markdown file in `movies/`. The site reads them at build time and is deployed to Cloudflare Workers.

Live: <https://i-watched-movies.kanywst12.workers.dev/> · [RSS](https://i-watched-movies.kanywst12.workers.dev/feed.xml)

## Add a movie

Two paths.

**Issue form.** Open a new issue with the "Add a movie" template, fill in the fields, submit. The `movie-from-issue` workflow parses the form, writes `movies/<slug>.md`, runs lint + test + build, opens a PR and auto-merges it. The issue carries the state in labels: `status: queued` → `processing` → `pr-opened` → `merged`. If anything fails the issue flips to `status: failed` and gets a comment linking the run; edit the issue to retry.

**Direct edit.** Drop a file in `movies/`:

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

Push to `main` and Cloudflare redeploys.

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
4. `scripts/build-feeds.js`: update `SITE_URL`, `SITE_NAME`, `SITE_DESC`
5. `wrangler.jsonc`: rename `name` to your project
6. Replace the contents of `movies/` with your own
7. Connect the repo to Cloudflare Workers, build command `npm run build`, output `dist`

## Stack

React 19, Vite 8, Tailwind 4, TypeScript 6, Vitest 4. Animation is browser-native (View Transitions API), no JS animation library.

## CI / Deploy

- `ci.yml`: lint + test + audit + build on every PR
- Cloudflare Workers auto-deploys on push to `main` (via the GitHub integration). Build command `npm run build`, output `dist`
- `movie-from-issue.yml`: turns "Add a movie" issues into PRs and auto-merges them. Mirrors progress into `status:*` labels
- `sync-labels.yml`: pushes `.github/labels.yml` to the repo's actual labels. Runs on changes to that file or via manual dispatch
- `dependabot-auto-merge.yml`: auto-merges npm Dependabot PRs after CI. GitHub Actions PRs need manual merge (token can't grant `workflows` scope)
- `scorecard.yml`: OpenSSF Scorecard, weekly
