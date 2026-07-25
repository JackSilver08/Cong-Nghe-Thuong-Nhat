import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPostHtml } from '../src/lib/markdown.ts';

test('renders the supported article Markdown features', () => {
  const html = renderPostHtml(
    '# Tiêu đề\n\n[Liên kết](https://example.com)\n\n| A | B |\n| - | - |\n| 1 | 2 |',
  );

  assert.match(html, /<h1>Tiêu đề<\/h1>/);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /<div class="table-scroll"><table>/);
});

test('removes executable HTML and unsafe URLs', () => {
  const html = renderPostHtml(
    '<script>alert(1)</script><img src="x" onerror="alert(2)">' +
      '[x](javascript:alert(3))<iframe src="https://evil.example"></iframe>',
  );

  assert.doesNotMatch(html, /<script|<img|<iframe|href="javascript:|src="javascript:/i);
  assert.match(html, /&lt;script&gt;/);
});

test('renders raw HTML as inert text', () => {
  const html = renderPostHtml('<a href="https://example.com" target="_blank">x</a>');
  assert.doesNotMatch(html, /<a /);
  assert.match(html, /&lt;a href=/);
});
