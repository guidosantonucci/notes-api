// Unit tests for the pure validation helpers, using Node's built-in test runner (no extra deps).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateNote, parsePaging } = require('../../src/validate');

test('a minimal valid note has no errors', () => {
  assert.deepEqual(validateNote({ title: 'Hello' }), []);
});

test('title is required on create but not on partial updates', () => {
  assert.ok(validateNote({ body: 'x' }).includes('title is required'));
  assert.deepEqual(validateNote({ body: 'x' }, { partial: true }), []);
});

test('non-object bodies are rejected', () => {
  for (const input of [null, [], 'text', 42]) {
    assert.deepEqual(validateNote(input), ['Body must be a JSON object']);
  }
});

test('tag rules', () => {
  assert.deepEqual(validateNote({ title: 't', tags: ['ok-1', 'two'] }), []);
  assert.ok(validateNote({ title: 't', tags: ['Bad'] }).length === 1);
  assert.ok(validateNote({ title: 't', tags: ['x'.repeat(21)] }).length === 1);
});

test('empty partial update is rejected', () => {
  assert.deepEqual(validateNote({}, { partial: true }), ['Provide at least one field to update']);
});

test('paging defaults and bounds', () => {
  assert.deepEqual(parsePaging(new URLSearchParams('')), { limit: 20, offset: 0 });
  assert.deepEqual(parsePaging(new URLSearchParams('limit=100&offset=5')), { limit: 100, offset: 5 });
  assert.ok(parsePaging(new URLSearchParams('limit=101')).error);
  assert.ok(parsePaging(new URLSearchParams('offset=-1')).error);
});
