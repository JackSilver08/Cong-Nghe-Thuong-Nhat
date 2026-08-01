/**
 * Ngôn ngữ hiển thị "tín hiệu" của Đài quan sát công nghệ.
 *
 * Toàn bộ file là hàm thuần, chỉ nhận vào dữ liệu đã có sẵn của bài viết
 * (slug, chuyên mục, ngày đăng, điểm phổ biến) và trả về chuỗi để hiển thị.
 * Không gọi API, không đọc database, không sinh dữ liệu mới.
 */

const DIACRITICS = /[̀-ͯ]/g;

function asciiFold(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

/**
 * Tiền tố chuyên mục: chuyên mục nhiều từ lấy chữ cái đầu mỗi từ
 * (`an-ninh-mang` → `ANM`), chuyên mục một từ lấy tối đa ba chữ cái
 * (`cloud` → `CLO`). Suy ra từ slug nên chuyên mục do quản trị viên thêm sau
 * cũng tự có mã, không cần khai báo thêm ở đâu.
 */
export function categoryPrefix(categorySlug: string): string {
  const parts = asciiFold(categorySlug)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (parts.length === 0) return 'OBS';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

/** Hash FNV-1a 32-bit: cùng một slug luôn cho cùng một số, ở server lẫn client. */
function hash32(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Mã quan sát của một bài viết, ví dụ `AI-026`. Ổn định theo slug nên mã không
 * đổi giữa các lần dựng trang và có thể dùng để đối chiếu.
 */
export function signalCode(categorySlug: string, slug: string): string {
  const serial = (hash32(slug) % 999) + 1;
  return `${categoryPrefix(categorySlug)}-${String(serial).padStart(3, '0')}`;
}

/**
 * Cường độ tín hiệu (%) quy từ điểm phổ biến thật của bài so với bài cao nhất
 * đang hiển thị. Sàn 12% để thanh chỉ báo không bao giờ biến mất hoàn toàn.
 */
export function signalStrength(score: number, max: number): number {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return 12;
  const ratio = Math.max(0, Math.min(1, score / max));
  return Math.max(12, Math.round(ratio * 100));
}

/** Ngày theo kiểu bảng quan sát: `01.08.2026`. */
export function observationDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}.${m}.${date.getFullYear()}`;
}

/** Giờ 24h: `21:47`. */
export function observationClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Thời gian đọc dạng hai chữ số: `08 phút`. */
export function readingLabel(minutes?: number): string {
  const value = Math.max(1, Math.round(minutes || 1));
  return `${String(value).padStart(2, '0')} phút`;
}

/**
 * Khoảng cách thời gian bằng tiếng Việt. Quá 7 ngày thì trả về ngày cụ thể —
 * "cập nhật 43 ngày trước" không nói lên điều gì hữu ích.
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.valueOf() - date.valueOf()) / 1000);
  if (seconds < 0) return observationDate(date);
  if (seconds < 60) return 'vừa xong';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days} ngày trước`;

  return observationDate(date);
}
