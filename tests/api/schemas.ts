// JSON Schemas describing the API contract. Tests fail if a response drifts from them.
export const noteSchema = {
  type: 'object',
  required: ['id', 'title', 'body', 'tags', 'createdAt', 'updatedAt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string', minLength: 1, maxLength: 100 },
    body: { type: 'string', maxLength: 2000 },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const noteListSchema = {
  type: 'object',
  required: ['data', 'total', 'limit', 'offset'],
  additionalProperties: false,
  properties: {
    data: { type: 'array', items: noteSchema },
    total: { type: 'integer', minimum: 0 },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
    offset: { type: 'integer', minimum: 0 },
  },
} as const;

export const errorSchema = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: { type: 'string' },
    details: { type: 'array', items: { type: 'string' } },
  },
} as const;
