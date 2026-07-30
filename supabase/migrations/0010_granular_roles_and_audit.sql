-- Granular editorial/community roles and server-enforced ownership.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'author', 'editor', 'moderator', 'admin'));

alter table public.posts
  add column if not exists author_id uuid references auth.users (id) on delete set null;

create index if not exists posts_author_id_idx on public.posts (author_id);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  old_value jsonb not null default '{}'::jsonb,
  new_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;

drop policy if exists audit_select_admin on public.admin_audit_logs;
create policy audit_select_admin on public.admin_audit_logs
  for select to authenticated
  using (public.current_user_role() = 'admin');

-- Profile visibility: moderators do not need the account directory.
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or public.current_user_role() = 'admin'
  );

-- Only the account-management Edge Function (service role) changes roles.
drop policy if exists profiles_admin_update on public.profiles;

-- Replace the old broad post policies.
drop policy if exists posts_select on public.posts;
drop policy if exists posts_insert_staff on public.posts;
drop policy if exists posts_update_staff on public.posts;
drop policy if exists posts_delete_staff on public.posts;

create policy posts_select on public.posts
  for select using (
    status = 'published'
    or public.current_user_role() in ('admin', 'editor')
    or (
      public.current_user_role() = 'author'
      and author_id = auth.uid()
    )
  );

create policy posts_insert_editorial on public.posts
  for insert to authenticated
  with check (
    (
      public.current_user_role() = 'author'
      and author_id = auth.uid()
      and status = 'draft'
    )
    or public.current_user_role() in ('admin', 'editor')
  );

create policy posts_update_editorial on public.posts
  for update to authenticated
  using (
    public.current_user_role() in ('admin', 'editor')
    or (
      public.current_user_role() = 'author'
      and author_id = auth.uid()
    )
  )
  with check (
    public.current_user_role() in ('admin', 'editor')
    or (
      public.current_user_role() = 'author'
      and author_id = auth.uid()
      and status = 'draft'
    )
  );

create policy posts_delete_editorial on public.posts
  for delete to authenticated
  using (
    public.current_user_role() in ('admin', 'editor')
    or (
      public.current_user_role() = 'author'
      and author_id = auth.uid()
      and status = 'draft'
    )
  );

-- Authors may upload images for their own drafts; editors/admins manage the library.
drop policy if exists post_images_insert_staff on storage.objects;
drop policy if exists post_images_update_staff on storage.objects;
drop policy if exists post_images_delete_staff on storage.objects;

create policy post_images_insert_staff on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'editor', 'author')
  );

create policy post_images_update_staff on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'editor')
  )
  with check (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'editor')
  );

create policy post_images_delete_staff on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'editor')
  );

-- Keep comment moderation separated from editorial access.
drop policy if exists comments_delete_own_or_admin on public.comments;
create policy comments_delete_own_or_admin on public.comments
  for delete using (
    auth.uid() = user_id
    or public.current_user_role() in ('admin', 'moderator')
  );
