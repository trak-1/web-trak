import { json, error } from '../_lib/http.js';
import { requireSession } from '../_lib/auth.js';
import { validateContent } from '../_lib/validate.js';
import { DEFAULT_CONTENT } from '../_lib/defaults.js';

// Merge stored content over defaults: saved text/site fields win; empty or
// missing lists fall back to the built-in defaults so the site/admin are never
// bare while the owner hasn't customised a section yet.
function merged(stored) {
  if (!stored || typeof stored !== 'object') return DEFAULT_CONTENT;
  const pick = (k) => (Array.isArray(stored[k]) && stored[k].length) ? stored[k] : DEFAULT_CONTENT[k];
  return {
    version: DEFAULT_CONTENT.version,
    site: { ...DEFAULT_CONTENT.site, ...(stored.site || {}) },
    stats: pick('stats'),
    services: pick('services'),
    works: pick('works'),
    testimonials: pick('testimonials'),
  };
}

export async function onRequestGet({ env }) {
  let doc = null;
  if (env.TRACK_CONTENT) doc = await env.TRACK_CONTENT.get('content', 'json');
  return json(merged(doc));
}

export async function onRequestPut({ request, env }) {
  if (!(await requireSession(request, env))) return error(401, 'unauthorized', 'Login required');
  if (!env.TRACK_CONTENT) return error(500, 'not_configured', 'Storage not configured');
  let body;
  try { body = await request.json(); } catch { return error(400, 'bad_request', 'Invalid JSON'); }
  const doc = body?.content ?? body;
  const v = validateContent(doc);
  if (!v.ok) return error(422, 'invalid_content', v.reason);
  await env.TRACK_CONTENT.put('content', JSON.stringify(doc));
  return json({ ok: true });
}
