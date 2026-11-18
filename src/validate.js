// Pure validation helpers (unit-tested in tests/unit).
const LIMITS = { title: 100, body: 2000, tags: 5, tag: 20 };

/**
 * Validates a note payload.
 * @param {object} input request body
 * @param {{ partial?: boolean }} options partial=true for PATCH (only validate fields present)
 * @returns {string[]} list of error messages (empty = valid)
 */
function validateNote(input, { partial = false } = {}) {
  const errors = [];
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return ['Body must be a JSON object'];
  }

  const allowed = ['title', 'body', 'tags'];
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) errors.push(`Unknown field: ${key}`);
  }

  if (!partial || 'title' in input) {
    if (typeof input.title !== 'string' || input.title.trim() === '') errors.push('title is required');
    else if (input.title.length > LIMITS.title) errors.push(`title must be at most ${LIMITS.title} characters`);
  }

  if ('body' in input) {
    if (typeof input.body !== 'string') errors.push('body must be a string');
    else if (input.body.length > LIMITS.body) errors.push(`body must be at most ${LIMITS.body} characters`);
  }

  if ('tags' in input) {
    if (!Array.isArray(input.tags)) errors.push('tags must be an array of strings');
    else {
      if (input.tags.length > LIMITS.tags) errors.push(`tags must have at most ${LIMITS.tags} items`);
      if (input.tags.some((t) => typeof t !== 'string' || !/^[a-z0-9-]{1,20}$/.test(t))) {
        errors.push('each tag must be 1-20 lowercase letters, numbers or hyphens');
      }
    }
  }

  if (partial && Object.keys(input).length === 0) errors.push('Provide at least one field to update');
  return errors;
}

/** Parses ?limit=&offset= with defaults and bounds. Returns { limit, offset } or { error }. */
function parsePaging(params) {
  const limit = params.has('limit') ? Number(params.get('limit')) : 20;
  const offset = params.has('offset') ? Number(params.get('offset')) : 0;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { error: 'limit must be an integer between 1 and 100' };
  if (!Number.isInteger(offset) || offset < 0) return { error: 'offset must be a non-negative integer' };
  return { limit, offset };
}

module.exports = { validateNote, parsePaging, LIMITS };
