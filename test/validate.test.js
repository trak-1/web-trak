import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContent } from '../functions/_lib/validate.js';

test('accepts a minimal valid document', () => {
  const doc = { version: 1, site: { heroTitle1: { ar: 'أ', en: 'A' } }, stats: [], services: [], works: [], testimonials: [] };
  assert.equal(validateContent(doc).ok, true);
});

test('rejects a non-object', () => {
  assert.equal(validateContent(null).ok, false);
  assert.equal(validateContent('x').ok, false);
});

test('rejects when list fields are not arrays', () => {
  const doc = { version: 1, site: {}, stats: {}, services: [], works: [], testimonials: [] };
  assert.equal(validateContent(doc).ok, false);
});

test('rejects an oversized document', () => {
  const big = { version: 1, site: { x: { ar: 'ء'.repeat(600000), en: '' } }, stats: [], services: [], works: [], testimonials: [] };
  assert.equal(validateContent(big).ok, false);
});
