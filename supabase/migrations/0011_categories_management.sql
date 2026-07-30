-- Dynamic category management for the public site and admin dashboard.

create table if not exists public.categories (
  slug text primary key
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null check (char_length(trim(label)) between 1 and 80),
  description text not null default '',
  display_order integer not null default 0,
  show_in_header boolean not null default true,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories
  (slug, label, description, display_order, show_in_header, is_active, is_system)
values
  ('ai', 'AI', 'Trí tuệ nhân tạo, mô hình ngôn ngữ, ứng dụng AI', 10, true, true, true),
  ('thiet-bi', 'Thiết bị', 'Máy tính xách tay, điện thoại, phần cứng và thiết bị thông minh', 20, true, true, true),
  ('startup', 'Khởi nghiệp', 'Khởi nghiệp công nghệ, gọi vốn, mô hình mới', 30, true, true, true),
  ('an-ninh-mang', 'An ninh mạng', 'Bảo mật, mã độc, quyền riêng tư dữ liệu', 40, true, true, true),
  ('lap-trinh', 'Lập trình', 'Ngôn ngữ, framework, công cụ cho developer', 50, true, true, true),
  ('cloud', 'Điện toán đám mây', 'Điện toán đám mây, hạ tầng và vận hành phát triển', 60, true, true, true),
  ('danh-gia', 'Đánh giá', 'Trải nghiệm và đánh giá sản phẩm công nghệ', 70, true, true, true)
on conflict (slug) do nothing;

create index if not exists categories_display_order_idx
  on public.categories (is_active desc, display_order, label);

drop trigger if exists categories_touch_updated_at on public.categories;
create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;

drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select using (
    is_active
    or public.current_user_role() in ('admin', 'editor', 'author')
  );

drop policy if exists categories_insert_admin on public.categories;
create policy categories_insert_admin on public.categories
  for insert to authenticated
  with check (public.current_user_role() = 'admin');

drop policy if exists categories_update_admin on public.categories;
create policy categories_update_admin on public.categories
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists categories_delete_admin on public.categories;
create policy categories_delete_admin on public.categories
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- Keep post/category references valid. Renaming a slug updates Supabase posts;
-- deleting a category with posts is rejected by the database.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_category_fkey'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_category_fkey
      foreign key (category)
      references public.categories (slug)
      on update cascade
      on delete restrict;
  end if;
end
$$;

create or replace function public.guard_category_deactivation()
returns trigger
language plpgsql
as $$
begin
  if old.is_active and not new.is_active
    and exists (select 1 from public.posts where category = old.slug)
  then
    raise exception 'Không thể ngừng hoạt động chuyên mục đang có bài viết';
  end if;
  return new;
end;
$$;

drop trigger if exists categories_guard_deactivation on public.categories;
create trigger categories_guard_deactivation
before update on public.categories
for each row execute function public.guard_category_deactivation();
