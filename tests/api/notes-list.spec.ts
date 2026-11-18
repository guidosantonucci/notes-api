import { test, expect, expectSchema } from './fixtures';

test.describe('GET /notes (filtering & pagination)', () => {
  // Seed 7 notes with this test's unique tag so results are isolated from parallel tests.
  test.beforeEach(async ({ api, tag }) => {
    for (let i = 1; i <= 7; i++) {
      const res = await api.post('/notes', {
        data: { title: `Note ${i}`, body: i % 2 ? 'odd body' : 'even body', tags: [tag] },
      });
      expect(res.status()).toBe(201);
    }
  });

  test('filters by tag and matches the list schema @smoke', async ({ api, tag }) => {
    const res = await api.get('/notes', { params: { tag } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expectSchema('noteList', body);
    expect(body.total).toBe(7);
    expect(body.data.every((n: { tags: string[] }) => n.tags.includes(tag))).toBe(true);
  });

  test('returns newest first', async ({ api, tag }) => {
    const { data } = await (await api.get('/notes', { params: { tag } })).json();
    expect(data.map((n: { title: string }) => n.title)).toEqual([
      'Note 7', 'Note 6', 'Note 5', 'Note 4', 'Note 3', 'Note 2', 'Note 1',
    ]);
  });

  test('paginates with limit and offset', async ({ api, tag }) => {
    const page1 = await (await api.get('/notes', { params: { tag, limit: 3, offset: 0 } })).json();
    const page3 = await (await api.get('/notes', { params: { tag, limit: 3, offset: 6 } })).json();

    expect(page1).toMatchObject({ total: 7, limit: 3, offset: 0 });
    expect(page1.data).toHaveLength(3);
    expect(page3.data).toHaveLength(1);
    expect(page3.data[0].title).toBe('Note 1');
  });

  test('offset past the end returns an empty page', async ({ api, tag }) => {
    const body = await (await api.get('/notes', { params: { tag, offset: 50 } })).json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(7);
  });

  test('full-text search with q (case-insensitive)', async ({ api, tag }) => {
    const body = await (await api.get('/notes', { params: { tag, q: 'EVEN' } })).json();
    expect(body.total).toBe(3);
  });

  const badPaging = [
    { params: { limit: '0' }, error: 'limit must be an integer between 1 and 100' },
    { params: { limit: '101' }, error: 'limit must be an integer between 1 and 100' },
    { params: { limit: 'ten' }, error: 'limit must be an integer between 1 and 100' },
    { params: { offset: '-1' }, error: 'offset must be a non-negative integer' },
    { params: { offset: '1.5' }, error: 'offset must be a non-negative integer' },
  ];
  for (const { params, error } of badPaging) {
    test(`rejects ${JSON.stringify(params)} (400)`, async ({ api }) => {
      const res = await api.get('/notes', { params });
      expect(res.status()).toBe(400);
      expect((await res.json()).error).toBe(error);
    });
  }
});
