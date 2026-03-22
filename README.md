<div align="center">

<img src="src/app/icon.svg" width="96" height="96" alt="RankIt icon" />

<img src="public/readme-title.svg" width="240" alt="RankIt" />

**Rank together. Watch better.**

*A collaborative ranking app for movies, series, books — anything worth debating.*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![Built with Claude](https://img.shields.io/badge/Built_with-Claude_AI-D97757?style=flat-square&logo=anthropic&logoColor=white)](https://claude.ai)

<br/>

> Built 100% with AI — every line of code written by [Claude](https://claude.ai) via [Claude Code](https://claude.ai/claude-code).
> Conceived, designed and directed entirely from a phone. No laptop involved.

</div>

---

## Features

- **Collaborative lists** — share any list with other users and manage items together
- **Daily voting** — one vote per user per list per day, resets at midnight
- **Real-time updates** — changes from collaborators appear instantly via Supabase Realtime
- **Completed items** — mark items as done and keep a history of what you've watched
- **External service autocomplete** — link a list to TMDB (or other services) to autocomplete items with poster, year, and metadata
- **Mobile-first** — designed as a PWA-ready experience with safe-area support

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Backend | Supabase (Postgres + Auth + Realtime + RLS) |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Drag & drop | dnd-kit |
| Deployment | Vercel |

---

## Project structure

```
src/
├── app/
│   ├── (auth)/login/        # Login page (Supabase Auth)
│   ├── (app)/               # Protected routes with bottom navigation
│   │   ├── home/            # List overview
│   │   ├── profile/         # User profile and stats
│   │   └── list/[id]/       # List detail (Server Component)
│   └── page.tsx             # Redirects to /home
├── components/
│   ├── ListDetailClient.tsx # List detail with real-time updates
│   ├── ShareModal.tsx       # Collaborator management
│   ├── AddItemModal.tsx     # Add items to a list
│   ├── CreateListModal.tsx  # Create new lists
│   ├── RankItem.tsx         # Single ranked item with vote action
│   ├── ListCard.tsx         # List summary card
│   └── BottomNav.tsx        # Bottom navigation bar
├── lib/supabase/
│   ├── client.ts            # Browser client (Client Components)
│   ├── server.ts            # Server client (Server Components + middleware)
│   └── types.ts             # Generated Supabase types
└── lib/services/
    └── index.ts             # External service registry (TMDB, etc.)
```

---

## Database schema

```
profiles       ← mirrors auth.users (auto-created via trigger)
lists          ← owned by a profile; list_type links to an external service
list_members   ← N:M join between lists and collaborator profiles
items          ← belong to a list; external_id + external_data store service metadata
votes          ← one per (user, list, date)
```

All tables use Row Level Security. See [`supabase/schema.sql`](supabase/schema.sql) for the full schema and [`supabase/migrations/`](supabase/migrations/) for incremental changes.

---

## External services

Lists can be linked to an external service to enable autocomplete when adding items. The service is set at list creation time via the **Content type** selector.

| `list_type` | Service | API | What it fills in |
|---|---|---|---|
| `movies` | Movies | [TMDB](https://www.themoviedb.org/documentation/api) | Title, year, genre, poster |
| `tv` | TV series | [TMDB](https://www.themoviedb.org/documentation/api) | Title, year, genre, poster |
| `books` | Books | [Google Books](https://developers.google.com/books/docs/v1/using) | Title, author, year, cover |
| `games` | Video games | [RAWG](https://rawg.io/apidocs) | Title, year, genre, cover art |

API keys are server-side only (never sent to the client). Searches are proxied through `/api/search/[service]`.

### Adding a new service

1. **Register it** in `src/lib/services/index.ts` — extend `ServiceId`, add an entry to `SERVICES`, and add an option to `LIST_TYPE_OPTIONS`.
2. **Implement the handler** in `src/app/api/search/[service]/route.ts` — add a branch for the new service ID and return `ExternalResult[]`.
3. **Add the API key** to `.env.local`.

`AddItemModal` picks it up automatically — no further changes needed.

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone https://github.com/javierugarte/rankit.git
cd rankit
npm install
```

### 2. Set up environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
TMDB_API_KEY=your-tmdb-api-key       # https://www.themoviedb.org/settings/api
RAWG_API_KEY=your-rawg-api-key       # https://rawg.io/apidocs (free, register required)
# Google Books works without a key
```

### 3. Set up the database

Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL editor to create all tables, RLS policies, and triggers.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

The app is deployed on Vercel. Every pull request gets an automatic preview URL via the Vercel GitHub integration.

```bash
npm run build   # type-check + build
npm run start   # start production server
```
