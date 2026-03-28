<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Project structure

Next.js App Router with Supabase as backend. Mobile-first app with dark design and golden accent (`#c8a96e`).

```
src/
├── app/
│   ├── (auth)/login/        → Login page (Supabase Auth)
│   ├── (app)/               → Protected routes (layout with BottomNav)
│   │   ├── home/            → User's list of lists
│   │   ├── profile/         → Profile and stats
│   │   └── list/[id]/       → List detail (Server Component)
│   └── page.tsx             → Redirects to /home
├── components/
│   ├── ConfirmDeleteModal.tsx → Shared bottom sheet for destructive confirmations (manages own loading state)
│   ├── ListDetailClient.tsx → List detail view (Client Component, Realtime)
│   ├── ShareModal.tsx       → Modal to share/manage collaborators
│   ├── AddItemModal.tsx     → Modal to add items
│   ├── CreateListModal.tsx  → Modal to create lists
│   ├── RankItem.tsx         → List item with votes
│   ├── ListCard.tsx         → List card in home
│   ├── BottomNav.tsx        → Bottom navigation (Home / Profile)
│   └── LogoutButton.tsx     → Logout button
├── lib/supabase/
│   ├── client.ts            → Browser client (client components)
│   ├── server.ts            → Server client (Server Components and middleware)
│   └── types.ts             → Supabase schema types (update when adding tables/functions)
└── lib/services/
    └── index.ts             → External services registry (TMDB, etc.)
```

## Key patterns

- **Server Components** fetch data directly with `createClient()` from `@/lib/supabase/server`.
- **Client Components** use `createClient()` from `@/lib/supabase/client` for mutations and Realtime.
- **Middleware** (`middleware.ts`) handles route protection: redirects to `/login` if unauthenticated.
- **Realtime** active on `items` and `list_members` via `supabase_realtime` publication.
- Detail Server Components (`list/[id]/page.tsx`) pass initial data as props to the Client Component.
- **Modal z-index layering**: base bottom sheets use `z-[60]`; confirmation modals that stack on top use `z-[70]`. Never close a parent modal before showing a child confirmation — keep both mounted so the child renders naturally on top.
- **Auth loading state**: after a successful `router.push()` in auth flows, use `return` immediately to avoid calling `setLoading(false)` before navigation completes (re-enables buttons visually).

## Authentication

Supabase Auth with email/password. On user creation, a trigger automatically creates a row in `profiles`. Middleware refreshes the session on every request.

Anonymous (demo) users are detected via `user.is_anonymous`. To send an anonymous user to signup, always call `supabase.auth.signOut()` first — navigating directly to `/login` while an anonymous session is active silently blocks registration.

# Database: architecture

Supabase with the following tables (see `supabase/schema.sql` for the full schema):

- `profiles` — users (1:1 with `auth.users`, created automatically via trigger)
- `lists` — item lists, each with an `owner_id`
- `list_members` — N:M relationship between lists and collaborator users
- `items` — list elements, with votes and completed state
- `votes` — one vote per user per list per day (`unique (user_id, list_id, voted_date)`)

All tables have RLS enabled. Available RPC functions: `get_profile_by_email`, `get_list_owner_id`.

# Database: migrations

- For database changes, create a new file in `supabase/migrations/` with incremental SQL.
- Never re-run the full `supabase/schema.sql` in production — it's only the initial state.
- Also update `supabase/schema.sql` to reflect the final state after the migration.

# External services (autocomplete)

Lists can be associated with an external service via the `list_type` field in the `lists` table. When an item is added to a list with a service, `AddItemModal` shows an autocomplete search that fills in `title`, `category`, `external_id` and `external_data` (JSONB).

Each service's API key lives in `.env.local` as a server-side environment variable (never exposed to the client). Searches are proxied through `/api/search/[service]`.

## Active services

| `list_type` | Service | API | API key env var |
|---|---|---|---|
| `movies` | Movies | TMDB | `TMDB_API_KEY` |
| `tv` | TV Shows | TMDB | `TMDB_API_KEY` |
| `books` | Books | Google Books | — (no key) |
| `games` | Video games | RAWG | `RAWG_API_KEY` |
| `albums` | Music albums | MusicBrainz + Cover Art Archive | — (no key) |

When `posterBase` in `ServiceConfig` is empty (`""`), the `poster_path` stored in `external_data` is an absolute URL. If not empty, the image src is `posterBase + poster_path`.

## How to add a new service

1. **Add the type** in `src/lib/services/index.ts`:
   - Extend `ServiceId` with the new value (e.g. `"wine"`)
   - Add an entry to `SERVICES` with `id`, `label`, `searchEndpoint`, `placeholder` and `posterBase`
   - Add an option to `LIST_TYPE_OPTIONS` so it appears in `CreateListModal`

2. **Implement the handler** in `src/app/api/search/[service]/route.ts`:
   - If the service does not need `TMDB_API_KEY`, add the dispatch **before** the `if (!apiKey)` block so it doesn't fail with an unrelated config error.
   - Add `if (service === "wine") return searchWine(q);`
   - Implement the function that calls the external API and returns an array of `ExternalResult`
   - `ExternalResult` has: `external_id`, `title`, `year`, `type`, `poster_path`, `overview`

3. **Add the image domain** in `next.config.ts` → `images.remotePatterns`:
   - **Required** whenever the service returns image URLs from a new domain.
   - Without this, Next.js silently blocks images and they won't load.
   - Example: `{ protocol: "https", hostname: "coverartarchive.org" }`

4. **Add the API key** in `.env.local` and document it in this section (if applicable).

No need to touch `AddItemModal`, `ListDetailClient` or the database: the system is plug-and-play once the service returns `ExternalResult[]`.

# Database: RLS without recursion

RLS policies must never create circular dependencies between tables. If a policy on table A references table B, table B cannot reference A in its own policy.

To break cycles, use `SECURITY DEFINER` functions that query the table bypassing RLS. See `supabase/migrations/fix_rls_recursion.sql` as an example.

# Before committing

Always run `npm run build` before committing. If the build fails, fix the errors before continuing. Do not commit code that doesn't compile.

# Available skills

Use the skill tool to invoke them by name.

| Skill | When to use |
|---|---|
| `commit-commands:commit` | Create a commit without opening a PR |
| `commit-commands:commit-push-pr` | Finish a task: commit + push + PR in one step |
| `commit-commands:clean_gone` | Clean up local branches already merged and deleted on remote |
| `simplify` | Polish newly written code: remove redundancies, improve quality |
| `claude-md-management:revise-claude-md` | Save session learnings to AGENTS.md |
| `claude-md-management:claude-md-improver` | Audit and improve all repo instructions |
| `update-config` | Configure permissions, hooks or environment variables in Claude Code |