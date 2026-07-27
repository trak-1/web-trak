import { json } from '../_lib/http.js';

// Diagnostic: reports whether bindings/secrets reached the function.
// Booleans only — never exposes secret values.
export function onRequestGet({ env }) {
  return json({
    hasPassword: !!env.ADMIN_PASSWORD,
    hasSecret: !!env.SESSION_SECRET,
    hasKV: !!env.TRACK_CONTENT,
  });
}
