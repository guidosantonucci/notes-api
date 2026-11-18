// Notes API: a small zero-dependency REST API with token auth and an in-memory store.
const http = require('http');
const crypto = require('crypto');
const { validateNote, parsePaging } = require('./validate');

const USERS = { qa: 'secret123', 'qa-other': 'secret456' }; // demo credentials

function createApp() {
  const notes = new Map(); // id -> note
  const tokens = new Map(); // token -> username
  let seq = 0; // insertion order, used to break createdAt ties

  const send = (res, status, payload, headers = {}) => {
    const body = payload === undefined ? '' : JSON.stringify(payload);
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(body);
  };
  const fail = (res, status, error, details) => send(res, status, details ? { error, details } : { error });

  const readJson = (req) =>
    new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 1e6) reject(Object.assign(new Error('Payload too large'), { status: 413 }));
      });
      req.on('end', () => {
        if (!raw) return resolve({});
        try { resolve(JSON.parse(raw)); }
        catch { reject(Object.assign(new Error('Invalid JSON body'), { status: 400 })); }
      });
    });

  const currentUser = (req) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    return scheme === 'Bearer' ? tokens.get(token) : undefined;
  };

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean); // e.g. ['notes', '<id>']
    const method = req.method;

    if (url.pathname === '/health' && method === 'GET') {
      return send(res, 200, { status: 'ok', uptime: Math.round(process.uptime()) });
    }

    if (url.pathname === '/auth/token') {
      if (method !== 'POST') return fail(res, 405, 'Method not allowed');
      const { username, password } = await readJson(req);
      if (!username || !password) return fail(res, 400, 'username and password are required');
      if (USERS[username] !== password) return fail(res, 401, 'Invalid credentials');
      const token = crypto.randomBytes(24).toString('hex');
      tokens.set(token, username);
      return send(res, 201, { token, tokenType: 'Bearer', expiresIn: 3600 });
    }

    if (parts[0] !== 'notes' || parts.length > 2) return fail(res, 404, 'Route not found');

    const user = currentUser(req);
    if (!user) return fail(res, 401, 'Missing or invalid token', undefined);

    // Collection: /notes
    if (parts.length === 1) {
      if (method === 'GET') {
        const paging = parsePaging(url.searchParams);
        if (paging.error) return fail(res, 400, paging.error);
        const tag = url.searchParams.get('tag');
        const q = url.searchParams.get('q')?.toLowerCase();
        let list = [...notes.values()].filter((n) => n.owner === user);
        if (tag) list = list.filter((n) => n.tags.includes(tag));
        if (q) list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.seq - a.seq);
        const data = list.slice(paging.offset, paging.offset + paging.limit).map(publicNote);
        return send(res, 200, { data, total: list.length, limit: paging.limit, offset: paging.offset });
      }
      if (method === 'POST') {
        const input = await readJson(req);
        const errors = validateNote(input);
        if (errors.length) return fail(res, 400, 'Validation failed', errors);
        const now = new Date().toISOString();
        const note = {
          id: crypto.randomUUID(),
          title: input.title.trim(),
          body: input.body ?? '',
          tags: input.tags ?? [],
          createdAt: now,
          updatedAt: now,
          owner: user,
          seq: seq++,
        };
        notes.set(note.id, note);
        return send(res, 201, publicNote(note), { Location: `/notes/${note.id}` });
      }
      return fail(res, 405, 'Method not allowed');
    }

    // Item: /notes/:id
    const note = notes.get(parts[1]);
    if (!note || note.owner !== user) return fail(res, 404, 'Note not found');

    if (method === 'GET') return send(res, 200, publicNote(note));
    if (method === 'PUT' || method === 'PATCH') {
      const input = await readJson(req);
      const errors = validateNote(input, { partial: method === 'PATCH' });
      if (errors.length) return fail(res, 400, 'Validation failed', errors);
      if (method === 'PUT') {
        Object.assign(note, { title: input.title.trim(), body: input.body ?? '', tags: input.tags ?? [] });
      } else {
        if ('title' in input) note.title = input.title.trim();
        if ('body' in input) note.body = input.body;
        if ('tags' in input) note.tags = input.tags;
      }
      note.updatedAt = new Date().toISOString();
      return send(res, 200, publicNote(note));
    }
    if (method === 'DELETE') {
      notes.delete(note.id);
      res.writeHead(204).end();
      return;
    }
    return fail(res, 405, 'Method not allowed');
  }

  return http.createServer((req, res) => {
    handle(req, res).catch((err) => fail(res, err.status || 500, err.status ? err.message : 'Internal server error'));
  });
}

function publicNote({ owner, seq, ...rest }) {
  return rest;
}

module.exports = { createApp };
