// Serve uploaded media from R2 at /media/<key>.
export async function onRequestGet({ params, env }) {
  if (!env.TRACK_MEDIA) return new Response('Media storage not configured', { status: 500 });
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  const obj = await env.TRACK_MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('accept-ranges', 'bytes');
  return new Response(obj.body, { headers });
}
