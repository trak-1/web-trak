import { json, error } from '../_lib/http.js';
import { requireSession } from '../_lib/auth.js';

const MAX = 80 * 1024 * 1024; // 80 MB
const OK_TYPES = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/;

// Authenticated upload → Cloudflare R2. Returns a public URL under /media/.
export async function onRequestPost({ request, env }) {
  if (!(await requireSession(request, env))) return error(401, 'unauthorized', 'Login required');
  if (!env.TRACK_MEDIA) return error(500, 'not_configured', 'Media storage (R2) not configured');

  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) return error(400, 'bad_request', 'Expected multipart/form-data');

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return error(400, 'bad_request', 'No file provided');

  const type = file.type || 'application/octet-stream';
  if (!OK_TYPES.test(type)) return error(415, 'bad_type', 'Unsupported type (images or mp4/webm only)');
  if ((file.size || 0) > MAX) return error(413, 'too_large', 'File too large (max 80MB)');

  const ext = (file.name || 'bin').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const key = `${crypto.randomUUID()}.${ext}`;
  await env.TRACK_MEDIA.put(key, file.stream(), { httpMetadata: { contentType: type } });

  return json({ url: `/media/${key}`, type });
}
