import { test, expect, expectSchema } from './fixtures';

test.describe('Notes CRUD', () => {
  test('full lifecycle: create → read → update → delete @smoke', async ({ api, tag }) => {
    // Create
    const created = await api.post('/notes', { data: { title: 'Buy sunscreen', body: 'SPF 50', tags: [tag] } });
    expect(created.status()).toBe(201);
    const note = await created.json();
    expectSchema('note', note);
    expect(created.headers()['location']).toBe(`/notes/${note.id}`);
    expect(note).toMatchObject({ title: 'Buy sunscreen', body: 'SPF 50', tags: [tag] });
    expect(note.createdAt).toBe(note.updatedAt);

    // Read
    const read = await api.get(`/notes/${note.id}`);
    expect(read.status()).toBe(200);
    expect(await read.json()).toEqual(note);

    // Update (PATCH)
    const patched = await api.patch(`/notes/${note.id}`, { data: { body: 'SPF 50, mineral' } });
    expect(patched.status()).toBe(200);
    const patchedNote = await patched.json();
    expect(patchedNote).toMatchObject({ title: 'Buy sunscreen', body: 'SPF 50, mineral' });
    expect(Date.parse(patchedNote.updatedAt)).toBeGreaterThanOrEqual(Date.parse(note.updatedAt));

    // Delete
    const deleted = await api.delete(`/notes/${note.id}`);
    expect(deleted.status()).toBe(204);
    expect(await deleted.text()).toBe('');

    // Gone
    const gone = await api.get(`/notes/${note.id}`);
    expect(gone.status()).toBe(404);
  });

  test('title is trimmed and optional fields get defaults', async ({ api }) => {
    const res = await api.post('/notes', { data: { title: '   Padded title   ' } });
    expect(res.status()).toBe(201);
    expect(await res.json()).toMatchObject({ title: 'Padded title', body: '', tags: [] });
  });

  test('PUT replaces the whole note (omitted fields reset)', async ({ api, tag }) => {
    const { id } = await (await api.post('/notes', { data: { title: 'Old', body: 'Old body', tags: [tag] } })).json();
    const res = await api.put(`/notes/${id}`, { data: { title: 'New' } });
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ id, title: 'New', body: '', tags: [] });
  });

  test('PATCH changes only the fields sent', async ({ api, tag }) => {
    const { id } = await (await api.post('/notes', { data: { title: 'Keep me', body: 'Old', tags: [tag] } })).json();
    const res = await api.patch(`/notes/${id}`, { data: { tags: [tag, 'extra'] } });
    expect(await res.json()).toMatchObject({ title: 'Keep me', body: 'Old', tags: [tag, 'extra'] });
  });

  test('unknown ids return 404 for every verb', async ({ api }) => {
    const id = '00000000-0000-4000-8000-000000000000';
    for (const res of [
      await api.get(`/notes/${id}`),
      await api.patch(`/notes/${id}`, { data: { title: 'x' } }),
      await api.put(`/notes/${id}`, { data: { title: 'x' } }),
      await api.delete(`/notes/${id}`),
    ]) {
      expect(res.status()).toBe(404);
      expect((await res.json()).error).toBe('Note not found');
    }
  });

  test('deleting twice returns 404 the second time', async ({ api }) => {
    const { id } = await (await api.post('/notes', { data: { title: 'Temp' } })).json();
    expect((await api.delete(`/notes/${id}`)).status()).toBe(204);
    expect((await api.delete(`/notes/${id}`)).status()).toBe(404);
  });

  test('users cannot see or change each other\'s notes', async ({ api, otherUserApi, tag }) => {
    const { id } = await (await api.post('/notes', { data: { title: 'Private', tags: [tag] } })).json();

    expect((await otherUserApi.get(`/notes/${id}`)).status()).toBe(404);
    expect((await otherUserApi.delete(`/notes/${id}`)).status()).toBe(404);
    const list = await (await otherUserApi.get(`/notes?tag=${tag}`)).json();
    expect(list.total).toBe(0);

    // Still there for the owner
    expect((await api.get(`/notes/${id}`)).status()).toBe(200);
  });

  test('unsupported methods return 405', async ({ api }) => {
    expect((await api.delete('/notes')).status()).toBe(405);
  });

  test('unknown routes return 404', async ({ api }) => {
    const res = await api.get('/does-not-exist');
    expect(res.status()).toBe(404);
    expectSchema('error', await res.json());
  });

  test('responds in under 500 ms', async ({ api }) => {
    const start = Date.now();
    const res = await api.get('/notes');
    expect(res.ok()).toBe(true);
    expect(Date.now() - start).toBeLessThan(500);
  });
});
