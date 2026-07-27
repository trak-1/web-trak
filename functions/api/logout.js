import { json } from '../_lib/http.js';
import { clearCookie } from '../_lib/auth.js';

export async function onRequestPost() {
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie() } });
}
