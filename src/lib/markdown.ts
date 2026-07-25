import { marked } from 'marked';

// Bài soạn trong admin (Toast UI Editor) được lưu dưới dạng Markdown GFM.
// `breaks: true` để xuống dòng đơn thành <br>, hợp với thói quen gõ tin tức.
const renderer = new marked.Renderer();

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Nội dung Supabase là dữ liệu người dùng. Không cho Markdown chuyển tiếp HTML
// thô vào `set:html`; các tính năng editor cần dùng cú pháp Markdown/GFM.
renderer.html = ({ text }) => escapeHtml(text);
marked.setOptions({ gfm: true, breaks: true, renderer });

/** Render Markdown của bài Supabase thành HTML cho trang bài viết.
 *
 *  Bảng được bọc thêm một lớp cuộn ngang: bảng nhiều cột không vừa màn hình
 *  điện thoại, và nếu để trần nó sẽ đẩy tràn ngang cả trang thay vì tự cuộn. */
export function renderPostHtml(markdown: string): string {
  const html = marked.parse(markdown || '') as string;
  return html
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, '</table></div>');
}
