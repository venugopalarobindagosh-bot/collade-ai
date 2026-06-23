# Collade AI

AI-powered career guidance for students — explore degrees, careers, salaries, and future trends.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start the dev server:

```bash
npm run dev
```

## Supabase

This app uses Supabase for:

- **Auth** — Google OAuth and email magic links
- **Database** — user credits, skills, achievements, community posts
- **Edge Functions** — AI career search via `/functions/v1/career-search`

### Required tables

Create these tables in Supabase (with RLS enabled):

- `user_credit`
- `user_skill`
- `user_achievement`
- `mentor_post`
- `post_reply`

Each table should include `id` (uuid), `created_at`, `user_id`, and `created_by` (email) columns.

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run preview` — preview production build
