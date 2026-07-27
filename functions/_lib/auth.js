import { verifySession } from './session.js';

const COOKIE = 'session';
const TTL = 12 * 3600; // 12 hours

export function sessionCookie(token, maxAge = TTL) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

export function readCookie(request) {
  const raw = request.headers.get('cookie') || '';
  const m = raw.match(/(?:^|;\s*)session=([^;]+)/);
  return m ? m[1] : null;
}

export async function requireSession(request, env) {
  const token = readCookie(request);
  if (!token || !env.SESSION_SECRET) return false;
  return verifySession(env.SESSION_SECRET, token);
}

export { TTL };
