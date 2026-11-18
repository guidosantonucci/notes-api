import { test, expect, expectSchema, CREDENTIALS } from './fixtures';

test.describe('Authentication', () => {
  test('health check is public @smoke', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ status: 'ok' });
  });

  test('valid credentials return a bearer token @smoke', async ({ request }) => {
    const res = await request.post('/auth/token', { data: CREDENTIALS.main });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
    expect(body.token).toMatch(/^[a-f0-9]{48}$/);
  });

  const badLogins = [
    { name: 'wrong password', data: { username: 'qa', password: 'nope' }, status: 401, error: 'Invalid credentials' },
    { name: 'unknown user', data: { username: 'ghost', password: 'secret123' }, status: 401, error: 'Invalid credentials' },
    { name: 'missing password', data: { username: 'qa' }, status: 400, error: 'username and password are required' },
    { name: 'empty body', data: {}, status: 400, error: 'username and password are required' },
  ];
  for (const { name, data, status, error } of badLogins) {
    test(`login fails with ${name} (${status})`, async ({ request }) => {
      const res = await request.post('/auth/token', { data });
      expect(res.status()).toBe(status);
      const body = await res.json();
      expectSchema('error', body);
      expect(body.error).toBe(error);
    });
  }

  test('GET /auth/token is not allowed (405)', async ({ request }) => {
    const res = await request.get('/auth/token');
    expect(res.status()).toBe(405);
  });

  const unauthenticated = [
    { name: 'no header', headers: {} },
    { name: 'wrong scheme', headers: { Authorization: 'Basic abc' } },
    { name: 'made-up token', headers: { Authorization: 'Bearer deadbeef' } },
  ];
  for (const { name, headers } of unauthenticated) {
    test(`/notes rejects requests with ${name} (401)`, async ({ request }) => {
      const res = await request.get('/notes', { headers });
      expect(res.status()).toBe(401);
      expect((await res.json()).error).toBe('Missing or invalid token');
    });
  }
});
