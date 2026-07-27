const MAX_BYTES = 512 * 1024; // 512 KB — well under KV's per-value limit

export function validateContent(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, reason: 'not an object' };
  if (typeof obj.site !== 'object' || obj.site === null || Array.isArray(obj.site)) return { ok: false, reason: 'site missing' };
  for (const k of ['stats', 'services', 'works', 'testimonials']) {
    if (!Array.isArray(obj[k])) return { ok: false, reason: `${k} must be an array` };
  }
  const bytes = new TextEncoder().encode(JSON.stringify(obj)).length;
  if (bytes > MAX_BYTES) return { ok: false, reason: 'too large' };
  return { ok: true };
}
