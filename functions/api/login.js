import { json, error } from '../_lib/http.js';
import { signSession } from '../_lib/session.js';
import { sessionCookie, TTL } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return error(500, 'not_configured', 'Server not configured');
  let body;
  try { body = await request.json(); } catch { return error(400, 'bad_request', 'Invalid body'); }
  const pw = String(body?.password ?? '');

  // length-independent compare
  const a = new TextEncoder().encode(pw);
  const b = new TextEncoder().encode(env.ADMIN_PASSWORD);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) return error(401, 'bad_password', 'Wrong password');

  const token = await signSession(env.SESSION_SECRET, TTL);
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token) } });
}
