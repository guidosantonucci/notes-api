import { test as base, expect, request, type APIRequestContext } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { noteSchema, noteListSchema, errorSchema } from './schemas';

export const CREDENTIALS = {
  main: { username: 'qa', password: 'secret123' },
  other: { username: 'qa-other', password: 'secret456' },
};

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validators = {
  note: ajv.compile(noteSchema),
  noteList: ajv.compile(noteListSchema),
  error: ajv.compile(errorSchema),
};

/** Asserts a JSON body matches one of the contract schemas, with a readable failure message. */
export function expectSchema(name: keyof typeof validators, body: unknown) {
  const validate = validators[name];
  const ok = validate(body);
  expect(ok, `${name} schema errors: ${ajv.errorsText(validate.errors)}`).toBe(true);
}

export async function getToken(baseURL: string, creds = CREDENTIALS.main): Promise<string> {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post('/auth/token', { data: creds });
  expect(res.status()).toBe(201);
  const { token } = await res.json();
  await ctx.dispose();
  return token;
}

/** A tag unique to each test, so parallel tests never see each other's notes. */
export const uniqueTag = (info: { testId: string; retry: number }) =>
  `t-${info.testId.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-12)}-r${info.retry}`;

type Fixtures = { api: APIRequestContext; otherUserApi: APIRequestContext; tag: string };

export const test = base.extend<Fixtures>({
  /** Authenticated client for the main user. */
  api: async ({ baseURL }, use) => {
    const token = await getToken(baseURL!);
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    await use(ctx);
    await ctx.dispose();
  },
  /** Authenticated client for a second user (data isolation checks). */
  otherUserApi: async ({ baseURL }, use) => {
    const token = await getToken(baseURL!, CREDENTIALS.other);
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
    await use(ctx);
    await ctx.dispose();
  },
  tag: async ({}, use, testInfo) => use(uniqueTag(testInfo)),
});

export { expect };
