import assert from 'node:assert/strict';
import test from 'node:test';
import {
  categoryPrefix,
  observationClock,
  observationDate,
  readingLabel,
  relativeTime,
  signalCode,
  signalStrength,
} from '../src/lib/signal.ts';

test('derives a category prefix from the slug shape', () => {
  assert.equal(categoryPrefix('ai'), 'AI');
  assert.equal(categoryPrefix('an-ninh-mang'), 'ANM');
  assert.equal(categoryPrefix('thiet-bi'), 'TB');
  assert.equal(categoryPrefix('cloud'), 'CLO');
  assert.equal(categoryPrefix('đánh-giá'), 'DG');
  assert.equal(categoryPrefix(''), 'OBS');
});

test('signal codes are stable and well formed', () => {
  const code = signalCode('ai', 'gpt-the-he-moi-suy-luan');
  assert.match(code, /^AI-\d{3}$/);
  assert.equal(code, signalCode('ai', 'gpt-the-he-moi-suy-luan'));
  assert.notEqual(code, signalCode('ai', 'chip-ai-cuoc-dua-phan-cung'));
});

test('signal strength stays inside the 12-100 band', () => {
  assert.equal(signalStrength(100, 100), 100);
  assert.equal(signalStrength(50, 100), 50);
  assert.equal(signalStrength(0, 100), 12);
  assert.equal(signalStrength(5, 0), 12);
  assert.equal(signalStrength(Number.NaN, 100), 12);
});

test('formats observation date, clock and reading time', () => {
  const date = new Date(2026, 7, 1, 21, 47);
  assert.equal(observationDate(date), '01.08.2026');
  assert.equal(observationClock(date), '21:47');
  assert.equal(readingLabel(8), '08 phút');
  assert.equal(readingLabel(undefined), '01 phút');
});

test('relative time falls back to a date beyond a week', () => {
  const now = new Date(2026, 7, 1, 12, 0);
  assert.equal(relativeTime(new Date(2026, 7, 1, 11, 54), now), '6 phút trước');
  assert.equal(relativeTime(new Date(2026, 7, 1, 9, 0), now), '3 giờ trước');
  assert.equal(relativeTime(new Date(2026, 6, 30, 12, 0), now), '2 ngày trước');
  assert.equal(relativeTime(new Date(2026, 6, 1, 12, 0), now), '01.07.2026');
});
