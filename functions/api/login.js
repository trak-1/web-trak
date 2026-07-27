import { json, error } from '../_lib/http.js';
import { signSession } from '../_lib/session.js';
import { sessionCookie, TTL } from '../_lib/auth.js';

const encoder = new TextEncoder();

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const eq = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

// Password is stored as an HMAC (keyed by SESSION_SECRET) in KV under `admin_auth`.
// The FIRST successful login sets it; afterwards the password must match.
// This avoids the unreliable ADMIN_PASSWORD dashboard secret — it relies only on
// SESSION_SECRET + the KV binding, both verified working.
export async function onRequestPost({ request, env }) {
  if (!env.SESSION_SECRET || !env.TRACK_CONTENT) return error(500, 'not_configured', 'Server not configured');
  let body;
  try { body = await request.json(); } catch { return error(400, 'bad_request', 'Invalid body'); }
  const pw = String(body?.password ?? '');
  if (pw.length < 4) return error(401, 'bad_password', 'Wrong password');

  const hash = await hmacHex(env.SESSION_SECRET, pw);
  const stored = await env.TRACK_CONTENT.get('admin_auth');

  let ok;
  if (!stored) {
    await env.TRACK_CONTENT.put('admin_auth', hash); // first login claims the password
    ok = true;
  } else {
    ok = eq(hash, stored);
  }
  if (!ok) return error(401, 'bad_password', 'Wrong password');

  const token = await signSession(env.SESSION_SECRET, TTL);
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token) } });
}
