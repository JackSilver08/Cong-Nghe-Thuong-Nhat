import { marked } from 'marked';

// Bài soạn trong admin (Toast UI Editor) được lưu dưới dạng Markdown GFM.
// `breaks: true` để xuống dòng đơn thành <br>, hợp với thói quen gõ tin tức.
marked.setOptions({ gfm: true, breaks: true });

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
