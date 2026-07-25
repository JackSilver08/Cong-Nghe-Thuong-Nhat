-- Tighten profile privacy and article-image resource limits.

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (
    auth.uid() = id
    or public.current_user_role() in ('admin', 'moderator')
  );

drop policy if exists posts_insert_staff on public.posts;
create policy posts_insert_staff on public.posts
  for insert to authenticated
  with check (public.current_user_role() in ('admin', 'moderator'));

drop policy if exists posts_update_staff on public.posts;
create policy posts_update_staff on public.posts
  for update to authenticated
  using (public.current_user_role() in ('admin', 'moderator'))
  with check (public.current_user_role() in ('admin', 'moderator'));

drop policy if exists posts_delete_staff on public.posts;
create policy posts_delete_staff on public.posts
  for delete to authenticated
  using (public.current_user_role() in ('admin', 'moderator'));

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif'
    ]
where id = 'post-images';
