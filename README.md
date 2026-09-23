# i-watched-movies

My personal log of movies I've watched. Each entry is a markdown file in `movies/`. The site reads them at build time and is deployed to GitHub Pages.

Live: <https://kanywst.github.io/i-watched-movies/> · [RSS](https://kanywst.github.io/i-watched-movies/feed.xml)

## Views

Seven tabs, each linkable through `?view=`. Filters, search, sort and the open film are mirrored to the query string too.

- **Watched** (`?view=watched`): the rated grid, opened by a podium for the top 3 by score (gold, silver and bronze plinths, with a crown, rays and confetti for first). Ties share a step. The grid repeats the place as a crown / medal / award badge, and NEW marks the 2 most recent. The podium hides under a search or genre filter, since the places are global
- **In Progress** (`?view=watching`): `watching: true`, started but not finished, mostly long series. No score yet, and kept out of the History heatmap and the watchlist ranking
- **Watchlist** (`?view=watchlist`): `published: false`, films not seen yet. `watch_date` is legitimately empty here
- **Seen** (`?view=seen`): `seen: true`, watched through but deliberately left unrated, so it never skews the average
- **Dropped** (`?view=dropped`): `dropped: true`, started and given up on partway. Wins over every other flag, carries no score, and is kept out of the History heatmap and both feeds
- **History** (`?view=history`): a contribution-graph heatmap of the last 53 weeks, plus streaks and films per month
- **Stats** (`?view=stats`): taste analysis over the rated films. Genre, country and era affinities as deltas against the personal average, how the 0-10 scale actually gets used, a watchlist ranking by the score the profile predicts, and "Top of the diary": every #1 with how long it held the spot, plus each change to the top 3. The history replays today's scores in watch order, so a film re-scored later counts at its new score from the day it was watched

Summaries render in English with a JA switch (in the masthead and inside the detail view), kept in `localStorage` rather than the URL. `summary_ja` falls back to `summary` per film.

## Add a movie

Two paths.

**Issue form** (the normal path). Open a new issue with the "Add a movie" template, fill in the fields, submit. The List dropdown picks the state: Watched, In Progress, Watchlist, Seen or Dropped. Filing an issue for a slug that already exists updates that entry instead of duplicating it, which is also how a film moves between tabs. The form can add or change fields but not blank them (an empty field keeps the old value), and it cannot delete an entry; deletions are a plain PR. The `movie-from-issue` workflow parses the form, writes `movies/<slug>.md`, runs lint + test + build, opens a PR and auto-merges it. The issue carries the state in labels: `status: queued` → `processing` → `pr-opened` → `merged`. If anything fails the issue flips to `status: failed` and gets a comment linking the run; edit the issue to retry. A batch of issues runs in parallel, and a merge that loses the race to `main` retries with backoff.

**Direct edit.** Drop a file in `movies/`:

```markdown
---
title: 'Title'
published: true              # false = lives on the Watchlist tab instead
seen: true                   # optional, watched through but unrated: own tab, no score
watching: true               # optional, started but not finished: own tab, wins over the two above
dropped: true                # optional, started and given up on partway: own tab, wins over all three above
tags: ['Sci-fi', 'Action']
national: 'Japan'            # optional, shows a flag emoji
streaming: ['Netflix']       # optional: Netflix, Disney+, Prime Video, U-NEXT, Hulu
checked: '2026-09'           # optional, when streaming availability was last checked
cover_image: 'https://...'
release_date: '2025-01-01'
watch_date: '2026-01-12'     # leave empty for watchlist, in-progress and dropped entries
point: 9.5                   # 0..10
seasons:                     # optional, per-season records for a series
  - season: 1
    point: 7.3
    status: 'watched'          # watched | watching | dropped
    watch_date: '2026-09-06'
summary: 'Plot summary.'
summary_ja: 'あらすじ。'       # optional, shown under the JA switch
impression: 'One-liner you want pulled out as a quote.'
added: '2026-09-23T13:07:35.977Z'  # when the entry first landed; the issue form stamps it
---

Free-form notes here.
```

Push to `main` and `pages.yml` redeploys.

## Run it locally

```bash
npm install
npm run dev      # starts Vite, regenerates movies.json
npm run check    # lint + audit + test
npm run build
```

Node `>= 22.22.2` (jsdom 30 and its undici dependency set the floor; on Node 20 every test worker fails to start). CI pins Node 24.

## What's where

- `scripts/generate-movies.js`: walks `movies/`, writes `src/data/movies.json`, also writes `public/feed.xml` and `public/collection.jsonld`
- `scripts/parse-movie.js`: frontmatter to `Movie` object (point coerced to number, dates to ISO)
- `scripts/build-feeds.js`: RSS + JSON-LD builders (covered by tests)
- `src/App.tsx`: view toggle, filter/sort/tag state mirrored to the URL
- `src/components/MovieCard.tsx`, `MovieDetailModal.tsx`: the grid card and the detail view. Modal hand-off uses the View Transitions API (no framer-motion)
- `src/activity.ts` + `src/components/ActivityHeatmap.tsx`: the History heatmap, streaks and monthly bars
- `src/taste.ts` + `src/components/TastePanel.tsx`: the Stats view. Affinities, scoring habits and the watchlist ranking, all pure functions over the rated films
- `src/podium.ts` + `src/components/Podium.tsx`: the Watched podium and its tie handling
- `src/rankHistory.ts` + `src/components/RankHistory.tsx`: the "Top of the diary" history in Stats
- `src/partition.ts`: splits entries into the five mutually exclusive states (dropped beats watching beats seen beats published)
- `src/scoreBand.ts`: score bands by percentile of the rated films, which drive the card chip and the modal's score colour
- `src/seasons.ts`: per-season records and the one season score a card shows for an unrated series
- `src/sortMovies.ts`, `src/stats.ts`, `src/views.ts`, `src/useUrlState.ts`, `src/useLanguage.ts`, `src/useTheme.ts`, `src/useDocumentMetadata.ts`: small utilities and hooks, each tested
- `src/constants.ts`: the tunables (rank/NEW limits, score band cuts, country flags, sort options, streaming services, the taste-analysis thresholds). Nothing is inlined at the call site

Tests cover pure logic only, one file per module (`src/*.test.ts`, `scripts/*.test.js`). No component or E2E tests.

## Forking this for your own log

1. Use as template / fork
2. `src/config.ts`: set `USER_NAME` to your GitHub handle
3. `index.html`: replace the `og:*` / `twitter:*` / canonical URLs
4. `scripts/build-feeds.js`: update `SITE_URL`, `SITE_NAME`, `SITE_DESC`
5. Replace the contents of `movies/` with your own
6. Settings > Pages > Source: GitHub Actions. `pages.yml` deploys from there

## Stack

React 19, Vite 8, Tailwind 4, TypeScript 6, Vitest 5. Animation is browser-native (View Transitions API), no JS animation library.

## CI / Deploy

- `ci.yml`: lint + test + audit + build on every PR. The audit runs `--audit-level=high --omit=dev`, so a vulnerability that ships in the bundle fails the build while a build-time-only one does not
- `claude-code-review.yml`: Claude reviews every non-bot PR. Advisory, never a merge gate. Authenticates with `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`, so it runs on the subscription rather than on API credit) and no-ops while that secret is unset. The action refuses to run when the PR changes this workflow file, so a PR that edits it cannot test it
- `pages.yml`: builds and deploys to GitHub Pages on every push to `main`, one push one deploy. Also dispatched by `movie-from-issue.yml` after each merge, because a merge made with `GITHUB_TOKEN` starts no push run
- `movie-from-issue.yml`: turns "Add a movie" issues into PRs and squash-merges them in the same job, then dispatches `pages.yml`. Mirrors progress into `status:*` labels
- `sync-labels.yml`: pushes `.github/labels.yml` to the repo's actual labels. Runs on changes to that file or via manual dispatch
- `dependabot-auto-merge.yml`: auto-merges npm Dependabot PRs after CI. GitHub Actions PRs need manual merge (token can't grant `workflows` scope)
- `scorecard.yml`: OpenSSF Scorecard, weekly
