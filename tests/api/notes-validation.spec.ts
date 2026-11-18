import { test, expect, expectSchema } from './fixtures';

const invalidPayloads = [
  { name: 'missing title', data: { body: 'x' }, detail: 'title is required' },
  { name: 'blank title', data: { title: '   ' }, detail: 'title is required' },
  { name: 'title not a string', data: { title: 42 }, detail: 'title is required' },
  { name: 'title 101 chars', data: { title: 'a'.repeat(101) }, detail: 'title must be at most 100 characters' },
  { name: 'body not a string', data: { title: 'ok', body: ['x'] }, detail: 'body must be a string' },
  { name: 'body 2001 chars', data: { title: 'ok', body: 'b'.repeat(2001) }, detail: 'body must be at most 2000 characters' },
  { name: 'tags not an array', data: { title: 'ok', tags: 'work' }, detail: 'tags must be an array of strings' },
  { name: 'six tags', data: { title: 'ok', tags: ['a', 'b', 'c', 'd', 'e', 'f'] }, detail: 'tags must have at most 5 items' },
  { name: 'uppercase tag', data: { title: 'ok', tags: ['Work'] }, detail: 'each tag must be 1-20 lowercase letters, numbers or hyphens' },
  { name: 'unknown field', data: { title: 'ok', priority: 'high' }, detail: 'Unknown field: priority' },
  { name: 'array body', data: [{ title: 'ok' }], detail: 'Body must be a JSON object' },
];

test.describe('POST /notes validation (400)', () => {
  for (const { name, data, detail } of invalidPayloads) {
    test(`rejects ${name}`, async ({ api }) => {
      const res = await api.post('/notes', { data });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expectSchema('error', body);
      expect(body.error).toBe('Validation failed');
      expect(body.details).toContain(detail);
    });
  }

  test('reports every problem at once, not just the first', async ({ api }) => {
    const res = await api.post('/notes', { data: { title: '', body: 1, tags: 'x' } });
    const { details } = await res.json();
    expect(details).toEqual(
      expect.arrayContaining(['title is required', 'body must be a string', 'tags must be an array of strings']),
    );
  });

  test('boundary values are accepted (100-char title, 2000-char body, 5 tags)', async ({ api }) => {
    const res = await api.post('/notes', {
      data: { title: 'a'.repeat(100), body: 'b'.repeat(2000), tags: ['a', 'b', 'c', 'd', 'e'] },
    });
    expect(res.status()).toBe(201);
    expectSchema('note', await res.json());
  });

  test('malformed JSON returns 400', async ({ api }) => {
    const res = await api.post('/notes', {
      headers: { 'Content-Type': 'application/json' },
      data: Buffer.from('{"title": "oops"'),
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON body');
  });

  test('PATCH with an empty object returns 400', async ({ api }) => {
    const { id } = await (await api.post('/notes', { data: { title: 'x' } })).json();
    const res = await api.patch(`/notes/${id}`, { data: {} });
    expect(res.status()).toBe(400);
    expect((await res.json()).details).toContain('Provide at least one field to update');
  });
});
