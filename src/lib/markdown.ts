import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Bài soạn trong admin (Toast UI Editor) được lưu dưới dạng Markdown GFM.
// `breaks: true` để xuống dòng đơn thành <br>, hợp với thói quen gõ tin tức.
marked.setOptions({ gfm: true, breaks: true });

/** Render Markdown của bài Supabase thành HTML cho trang bài viết.
 *
 *  Bảng được bọc thêm một lớp cuộn ngang: bảng nhiều cột không vừa màn hình
 *  điện thoại, và nếu để trần nó sẽ đẩy tràn ngang cả trang thay vì tự cuộn. */
export function renderPostHtml(markdown: string): string {
  const parsed = marked.parse(markdown || '') as string;
  const html = sanitizeHtml(parsed, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img',
      'del',
      's',
      'input',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      input: ['type', 'checked', 'disabled'],
      th: ['align'],
      td: ['align'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
      img: (_tagName, attribs) => ({
        tagName: 'img',
        attribs: { ...attribs, loading: attribs.loading || 'lazy' },
      }),
      input: (_tagName, attribs) => ({
        tagName: 'input',
        attribs:
          attribs.type === 'checkbox'
            ? { type: 'checkbox', ...(attribs.checked ? { checked: '' } : {}), disabled: '' }
            : {},
      }),
    },
    disallowedTagsMode: 'discard',
  });

  return html
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, '</table></div>');
}
