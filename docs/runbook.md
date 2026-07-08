# NewsHub runbook

Tài liệu này ghi lại cách chạy dự án, xử lý lỗi cổng, tài khoản admin demo, Supabase và các lưu ý quan trọng.

## Thông tin nhanh

- Framework: Astro
- Dev server mặc định: `http://127.0.0.1:4321/`
- Trang đăng nhập: `http://127.0.0.1:4321/login`
- Trang admin: `http://127.0.0.1:4321/admin/index.html`
- Supabase project: xem `docs/supabase-project.md`
- Schema Supabase: `supabase/schema.sql`

## Tài khoản admin demo

```txt
Email: admin@newshub.com
Password: admin@1234
```

Tài khoản này hiện được kiểm tra ở frontend bằng `localStorage`, phù hợp để demo/dev. Trước khi public production, nên thay bằng Supabase Auth hoặc API backend.

## Cài và chạy dự án

```bash
npm install
npm run dev
```

Mở:

```txt
http://127.0.0.1:4321/
```

Build production:

```bash
npm run build
```

Preview bản build:

```bash
npm run preview
```

## Khi cổng 4321 bị chiếm

Kiểm tra tiến trình đang chiếm cổng trên PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 4321 -State Listen
```

Dừng tiến trình đang chiếm cổng:

```powershell
$conn = Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue
if ($conn) {
  $processIds = $conn | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force
  }
}
```

Chạy bằng cổng khác nếu không muốn dừng tiến trình:

```bash
npm run dev -- --host 127.0.0.1 --port 4322
```

## Supabase

Thông tin public có thể push được lưu ở:

```txt
docs/supabase-project.md
public/admin/supabase-config.js
```

Thông tin private local-only nằm ở:

```txt
.env.local
```

`.env.local` đã được `.gitignore`, không push lên Git.

Không commit:

- database password
- service role key
- direct database connection string

## Setup Supabase từ đầu

1. Tạo Supabase project.
2. Mở SQL Editor.
3. Chạy toàn bộ `supabase/schema.sql`.
4. Kiểm tra bucket `post-images` đã được tạo.
5. Điền URL/key vào `public/admin/supabase-config.js`.
6. Nếu Astro cần đọc Supabase ở build/runtime, điền `.env.local`.

## Đăng bài trong admin

Vào:

```txt
http://127.0.0.1:4321/admin/index.html
```

Form admin hiện hỗ trợ:

- Tiêu đề
- Slug
- Tóm tắt
- Chuyên mục
- Trạng thái draft/published
- Tags
- Ảnh đại diện
- Alt ảnh
- Nội dung
- Vị trí hiển thị trang chủ
- Ưu tiên hiển thị

Các vị trí trang chủ:

- `home-hero`: Hero chính
- `home-side`: Cột tin bên phải hero
- `breaking-news`: Tin nóng
- `latest-news`: Cập nhật mới nhất
- `popular-sidebar`: Đọc nhiều
- `ai-daily-brief`: AI Daily Brief
- `tech-trends`: Xu hướng công nghệ

`section_priority` càng cao thì bài càng được ưu tiên trong khu vực đó.

## Lưu trữ ảnh

Ảnh bài viết được upload vào Supabase Storage bucket:

```txt
post-images
```

Database chỉ lưu URL ảnh trong `posts.image_url`, không lưu binary ảnh trực tiếp.

## Lưu ý hiện tại

- Trang chủ, search, category, RSS và article pages hiện đọc dữ liệu hợp nhất từ Markdown + Supabase.
- Admin đã ghi được bài lên Supabase khi config đúng.
- Khi deploy static production, bài Supabase mới cần một lần rebuild/redeploy để xuất hiện trong HTML tĩnh.
- SQL hiện có policy anon write để admin tĩnh demo ghi bài được. Trước production, cần siết lại bằng Supabase Auth hoặc serverless API.
- `public/admin/supabase-config.js` chứa publishable key, có thể public. Không đặt secret key ở đó.

## Các file quan trọng

- `src/pages/login.astro`: đăng nhập + đăng ký cùng một trang.
- `public/admin/index.html`: dashboard admin và form đăng bài.
- `public/admin/supabase-config.js`: public Supabase config cho admin.
- `supabase/schema.sql`: schema database/storage/policy.
- `.env.local`: secret/local config, không push.
- `docs/supabase-project.md`: thông tin Supabase public, có thể push.
