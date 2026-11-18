# Notes API 🗒️

A small REST API (token auth, CRUD, filtering, pagination) built on plain Node.js, with **API tests in Playwright + TypeScript**, **JSON-schema contract checks** and **Node unit tests**.

![CI](https://github.com/guidosantonucci/notes-api/actions/workflows/tests.yml/badge.svg)

## What the suite demonstrates

| Skill | Where |
|---|---|
| API testing without a browser | Playwright `request` / `APIRequestContext` in `tests/api/` |
| Auth handling in fixtures | `tests/api/fixtures.ts` logs in once per test and injects an authenticated client |
| Contract testing | `tests/api/schemas.ts` + Ajv: every response is checked against a JSON Schema |
| Negative & boundary testing | 400 / 401 / 404 / 405, malformed JSON, 100 vs 101 characters, 5 vs 6 tags |
| Data isolation | each test uses its own tag so parallel runs never interfere; cross-user access returns 404 |
| Test pyramid | `node:test` unit tests run first, API tests only if they pass (two CI jobs) |
| Environment switch | set `API_URL` to run the same suite against a deployed API |
| Flakiness check | the suite passes `--repeat-each=5` |

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | public |
| POST | `/auth/token` | `{ "username": "qa", "password": "secret123" }` → bearer token |
| GET | `/notes` | `?tag=` `?q=` `?limit=1-100` `?offset=` — newest first |
| POST | `/notes` | `{ title (1-100), body? (≤2000), tags? (≤5, lowercase) }` → 201 + `Location` |
| GET / PUT / PATCH / DELETE | `/notes/:id` | PUT replaces, PATCH updates sent fields, DELETE → 204 |

A second demo user (`qa-other` / `secret456`) is used to prove users can't reach each other's notes.

## Run it

```bash
npm ci
npm test                 # unit tests, then API tests (the API starts automatically)
npm run test:smoke
API_URL=https://my-deployed-api.example.com npm run test:api
npm start                # just run the API at http://localhost:3000
```

```bash
# Try it by hand
TOKEN=$(curl -s -X POST localhost:3000/auth/token -H 'Content-Type: application/json' \
  -d '{"username":"qa","password":"secret123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -X POST localhost:3000/notes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Buy sunscreen","tags":["errands"]}'
```
