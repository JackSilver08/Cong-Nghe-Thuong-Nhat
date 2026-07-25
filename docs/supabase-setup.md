# NewsHub Supabase setup

NewsHub keeps the public site static, while the admin screen can write posts and upload images to Supabase.

## 1. Create Supabase project

Create a project in Supabase, then copy:

- Project URL
- anon public key

## 2. Run database schema

Open Supabase SQL Editor and run:

```sql
-- paste the contents of supabase/schema.sql
```

This creates:

- `public.posts`
- public storage bucket `post-images`
- development RLS policies for the current hard-coded admin screen

## 3. Configure local admin

Edit `public/admin/supabase-config.js` or reuse the values from `docs/supabase-project.md`:

```js
window.NEWSHUB_SUPABASE = {
  url: 'https://YOUR_PROJECT.supabase.co',
  anonKey: 'YOUR_PUBLIC_ANON_KEY',
  imageBucket: 'post-images',
};
```

For Astro code that fetches Supabase data during build/runtime, copy `.env.example` to `.env` and fill:

```txt
PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

## 4. Admin fields

Admin posts save these homepage placement fields:

- `home-hero`: hero chính
- `home-side`: cột tin cạnh hero
- `breaking-news`: tin nóng
- `latest-news`: cập nhật mới nhất
- `popular-sidebar`: đọc nhiều
- `ai-daily-brief`: AI Daily Brief
- `tech-trends`: xu hướng công nghệ

Use `section_priority` to order posts inside each area.

## Write permissions

Writes to `posts` and to the `post-images` bucket require a signed-in account whose `profiles.role` is `admin` or `moderator`. Anonymous visitors can only read published posts and fetch images.

Never add a write policy for the `anon` role to these objects. The anon key ships publicly in `public/admin/supabase-config.js`, and Postgres combines RLS policies with OR — a single `anon using (true)` policy silently disables every role check. The project shipped with exactly that bug; it was removed in `migrations/0007_remove_anon_write_policies.sql`. See `docs/runbook.md` for the one-line curl check that verifies the hole stays closed.

Apply `migrations/0008_privacy_and_upload_limits.sql` after `0007`. It makes profile
email rows private to their owner/staff and enforces the article-image MIME and
10 MiB limits in Storage itself.
