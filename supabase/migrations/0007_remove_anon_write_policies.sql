-- ============================================================
-- NewsHub — Gỡ bỏ quyền ghi của anon trên posts và ảnh bài viết
-- Chạy MỘT LẦN trong Supabase SQL Editor (sau 0006).
-- ============================================================
--
-- VÌ SAO: schema.sql từng tạo policy tạm cho vai trò `anon` với điều kiện
-- `using (true) with check (true)` để màn admin tĩnh chạy được bằng anon key.
-- Nhưng anon key nằm công khai trong public/admin/supabase-config.js, tức là
-- mọi khách truy cập đều tải về được. RLS cộng dồn các policy theo kiểu OR,
-- nên chỉ cần policy này tồn tại là bộ policy admin/moderator ở 0002 và 0006
-- trở nên vô nghĩa: bất kỳ ai cũng thêm, sửa, xoá được bài viết.
--
-- SAU MIGRATION NÀY: ghi bài và quản lý ảnh chỉ còn dành cho người đã đăng
-- nhập và có role 'admin' hoặc 'moderator' trong bảng profiles. Khách vãng lai
-- vẫn đọc được bài đã xuất bản và xem được ảnh như cũ.

-- 1. Gỡ ba policy tạm thời -------------------------------------
drop policy if exists "Anon admin can manage posts during development" on public.posts;
drop policy if exists "Anon admin can upload post images during development" on storage.objects;
drop policy if exists "Anon admin can update post images during development" on storage.objects;

-- 2. Khẳng định lại bộ policy đúng cho posts -------------------
-- (đã có từ 0002; lặp lại để file này tự đủ khi dựng database mới)
alter table public.posts enable row level security;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select using (
    status = 'published' or public.current_user_role() in ('admin', 'moderator')
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

-- 3. Khẳng định lại bộ policy đúng cho ảnh bài viết ------------
-- (đã có từ 0006). Ảnh vẫn công khai để trang bài viết hiển thị được.
drop policy if exists "Post images are public" on storage.objects;
create policy "Post images are public"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists post_images_insert_staff on storage.objects;
create policy post_images_insert_staff on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'moderator')
  );

drop policy if exists post_images_update_staff on storage.objects;
create policy post_images_update_staff on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'moderator')
  )
  with check (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'moderator')
  );

drop policy if exists post_images_delete_staff on storage.objects;
create policy post_images_delete_staff on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'post-images'
    and public.current_user_role() in ('admin', 'moderator')
  );
