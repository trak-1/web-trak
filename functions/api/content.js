import { json, error } from '../_lib/http.js';
import { requireSession } from '../_lib/auth.js';
import { validateContent } from '../_lib/validate.js';
import { DEFAULT_CONTENT } from '../_lib/defaults.js';

export async function onRequestGet({ env }) {
  let doc = null;
  if (env.TRACK_CONTENT) doc = await env.TRACK_CONTENT.get('content', 'json');
  return json(doc || DEFAULT_CONTENT);
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
