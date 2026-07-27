# Track Admin — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the existing Track site on Cloudflare Pages with a KV-backed content store, a password-only admin session, and an admin "Texts" editor — so all hero/about/contact/footer texts become editable online with a safe fallback.

**Architecture:** One Cloudflare Pages project serves the static site plus `functions/api/*` (Pages Functions). Content is a single JSON document in KV (`TRACK_CONTENT`, key `content`). The public site fetches `/api/content` and applies it over embedded defaults (never blank). Writes require an HMAC-signed session cookie issued by `/api/login` after checking the `ADMIN_PASSWORD` secret.

**Tech Stack:** Cloudflare Pages + Pages Functions (Workers runtime, Web Crypto), Cloudflare KV, vanilla JS front-end, `node --test` for pure-logic unit tests.

## Global Constraints

- Bilingual content everywhere: every editable text has `{ar, en}`. Verbatim keys from the spec's content JSON (section 4).
- Password only lives as a Cloudflare **secret** (`ADMIN_PASSWORD`); never in client code or the repo.
- Session cookie: httpOnly, Secure, SameSite=Strict, HMAC-SHA256 signed with `SESSION_SECRET`, 12h expiry.
- Public reads open; every write endpoint requires a valid session.
- Site must render from embedded defaults if `/api/content` fails — never blank.
- Local machine blocks native `.node` binaries → do NOT rely on local `wrangler` for verification; verify endpoints against the Cloudflare **preview deployment** URL (created on every push). Pure-logic tests run under `node --test` (uses built-in Web Crypto, no native deps).
- Node available at `node` (v24). ffmpeg under the winget Gyan.FFmpeg path (not needed this phase).

---

### Task 1: Project setup — git, config, Pages Functions skeleton

**Files:**
- Create: `D:/track-website/.gitignore`
- Create: `D:/track-website/package.json`
- Create: `D:/track-website/wrangler.toml`
- Create: `D:/track-website/functions/_lib/http.js`

**Interfaces:**
- Produces: `json(data, init)` and `error(status, code, msg)` response helpers used by every endpoint.

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
.wrangler/
.dev.vars
assets/stills/
*.log
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "track-website",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 3: Create `wrangler.toml`** (declares the KV + R2 bindings Pages will inject; R2 unused until Phase 2 but declared now)

```toml
name = "track-website"
pages_build_output_dir = "."
compatibility_date = "2024-11-01"

[[kv_namespaces]]
binding = "TRACK_CONTENT"
id = "REPLACE_WITH_KV_ID"          # filled after creating the namespace (Task 8)

[[r2_buckets]]
binding = "TRACK_MEDIA"
bucket_name = "track-media"         # created in Phase 2
```

- [ ] **Step 4: Create `functions/_lib/http.js`**

```js
export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(init.headers || {}) },
  });

export const error = (status, code, message) =>
  json({ error: { code, message } }, { status });
```

- [ ] **Step 5: Initialise git and commit**

```bash
cd D:/track-website && git init && git add -A && git commit -m "chore: project setup, git, wrangler + http helpers"
```

Expected: repository created, first commit succeeds.

---

### Task 2: Default content document

**Files:**
- Create: `D:/track-website/content.default.json`
- Create: `D:/track-website/functions/_lib/defaults.js`

**Interfaces:**
- Produces: `DEFAULT_CONTENT` (object matching spec §4) imported by the content API for seeding, and served to the browser as the fallback.

- [ ] **Step 1: Create `content.default.json`** — transcribe the CURRENT site content into the spec §4 shape. Pull each Arabic value from `index.html` and each English value from the matching `data-en` / `data-en-html`. Structure:

```json
{
  "version": 1,
  "site": {
    "brandTag": { "ar": "إنتاج فني", "en": "Art Production" },
    "heroEyebrow": { "ar": "إنتاج سمعي بصري · الرياض · Track", "en": "Audio-Visual Production · Riyadh · تراك" },
    "heroTitle1": { "ar": "كل المسارات", "en": "All tracks" },
    "heroTitle2Html": { "ar": "تؤدي <em>إلينا</em>", "en": "lead to <em>us</em>" },
    "heroSub": { "ar": "إبداعٌ يستحق كل لحظة. دار إنتاج سعودية تحوّل الأفكار إلى فعاليات وصوتٍ وفيلم — منذ ثلاثة عشر عامًا.", "en": "Creativity worth every moment. A Saudi production house turning ideas into events, sound, and film — for thirteen years." },
    "aboutHeadingHtml": { "ar": "ليست السنوات وحدها — بل <em>الخبرة</em> التي بنتها السنوات.", "en": "It's not just the years — it's the <em>expertise</em> the years built." },
    "aboutLead": { "ar": "تراك شركة سعودية متخصصة في الإنتاج السمعي البصري. نخطّط للفعالية من الفكرة الأولى إلى اللقطة الأخيرة، ونُهندس الصوت الذي يحملها، ونصوّر الفيلم الذي يبقى بعد انتهاء الليلة.", "en": "Track is a Saudi company built for audio-visual production. We plan an event from the first idea to the final frame, engineer the sound that carries it, and shoot the film that outlives the night." },
    "aboutBody": { "ar": "فريق واحد يدير السلسلة كاملة — الإخراج والتصوير والصوت والمونتاج — حتى لا يضيع شيء بين مرحلة وأخرى. هكذا تبقى اللحظة صادقة من الغرفة التي حدثت فيها إلى الشاشة التي تعيش عليها.", "en": "One team runs the whole chain — direction, capture, audio, and edit — so nothing gets lost in a handoff. That's how a moment stays true from the room it happened in to the screen it lives on." },
    "contact": { "email": "info@trackksa.com", "phone": "+966 50 034 4410", "address": { "ar": "الرياض · شارع الأمير بندر بن عبدالعزيز", "en": "Riyadh · Prince Bandar Bin Abdulaziz St." } },
    "footerTag": { "ar": "إبداعٌ يستحق كل لحظة.", "en": "Creativity worth every moment." }
  },
  "stats": [
    { "id": "yrs",  "number": 13,  "suffix": "+", "label": { "ar": "سنة في المجال", "en": "Years in the field" } },
    { "id": "proj", "number": 120, "suffix": "+", "label": { "ar": "مشروع وشراكة", "en": "Projects & partnerships" } },
    { "id": "srv",  "number": 560, "suffix": "+", "label": { "ar": "خدمة قُدّمت", "en": "Services delivered" } },
    { "id": "team", "number": 20,  "suffix": "+", "label": { "ar": "مبدع في الفريق", "en": "Creatives on the team" } }
  ],
  "services": [],
  "works": [],
  "testimonials": []
}
```

(Phase 1 seeds `services`/`works`/`testimonials` as empty arrays; the site keeps rendering its current hard-coded lists until Phase 2/3 wire them. Texts are the Phase-1 deliverable.)

- [ ] **Step 2: Create `functions/_lib/defaults.js`** re-exporting the JSON so Functions can import it:

```js
import DEFAULT_CONTENT from '../../content.default.json' assert { type: 'json' };
export { DEFAULT_CONTENT };
```

- [ ] **Step 3: Commit**

```bash
git add content.default.json functions/_lib/defaults.js && git commit -m "feat: default bilingual content document"
```

---

### Task 3: Session signing/verification (HMAC) — TDD

**Files:**
- Create: `D:/track-website/functions/_lib/session.js`
- Test: `D:/track-website/test/session.test.js`

**Interfaces:**
- Produces:
  - `async signSession(secret: string, ttlSeconds: number): Promise<string>` → token `"<expEpoch>.<base64urlHmac>"`.
  - `async verifySession(secret: string, token: string, nowMs?: number): Promise<boolean>`.

- [ ] **Step 1: Write the failing test** — `test/session.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession } from '../functions/_lib/session.js';

const SECRET = 'test-secret-key';

test('a freshly signed token verifies', async () => {
  const token = await signSession(SECRET, 3600);
  assert.equal(await verifySession(SECRET, token), true);
});

test('a token with the wrong secret fails', async () => {
  const token = await signSession(SECRET, 3600);
  assert.equal(await verifySession('other-secret', token), false);
});

test('an expired token fails', async () => {
  const token = await signSession(SECRET, 1);
  const future = Date.now() + 2000;
  assert.equal(await verifySession(SECRET, token, future), false);
});

test('a tampered token fails', async () => {
  const token = await signSession(SECRET, 3600);
  const tampered = token.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
  assert.equal(await verifySession(SECRET, tampered), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test test/session.test.js`
Expected: FAIL — cannot import `signSession` (module/exports missing).

- [ ] **Step 3: Write minimal implementation** — `functions/_lib/session.js`

```js
const enc = new TextEncoder();

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, enc.encode(msg));
}

export async function signSession(secret, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = b64url(await hmac(secret, String(exp)));
  return `${exp}.${sig}`;
}

export async function verifySession(secret, token, nowMs = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false;
  const expected = b64url(await hmac(secret, expStr));
  if (expected.length !== (sig || '').length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/session.test.js`
Expected: PASS — 4/4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/session.js test/session.test.js && git commit -m "feat: HMAC session sign/verify with tests"
```

---

### Task 4: Content validation — TDD

**Files:**
- Create: `D:/track-website/functions/_lib/validate.js`
- Test: `D:/track-website/test/validate.test.js`

**Interfaces:**
- Produces: `validateContent(obj): {ok: true} | {ok: false, reason: string}` — guards shape/size before a KV write.

- [ ] **Step 1: Write the failing test** — `test/validate.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContent } from '../functions/_lib/validate.js';

test('accepts a minimal valid document', () => {
  const doc = { version: 1, site: { heroTitle1: { ar: 'أ', en: 'A' } }, stats: [], services: [], works: [], testimonials: [] };
  assert.equal(validateContent(doc).ok, true);
});

test('rejects a non-object', () => {
  assert.equal(validateContent(null).ok, false);
  assert.equal(validateContent('x').ok, false);
});

test('rejects when list fields are not arrays', () => {
  const doc = { version: 1, site: {}, stats: {}, services: [], works: [], testimonials: [] };
  assert.equal(validateContent(doc).ok, false);
});

test('rejects an oversized document', () => {
  const big = { version: 1, site: { x: { ar: 'ء'.repeat(600000), en: '' } }, stats: [], services: [], works: [], testimonials: [] };
  assert.equal(validateContent(big).ok, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/validate.test.js`
Expected: FAIL — `validateContent` not defined.

- [ ] **Step 3: Write minimal implementation** — `functions/_lib/validate.js`

```js
const MAX_BYTES = 512 * 1024; // 512 KB — well under KV's 25 MB value limit

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/validate.test.js`
Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/validate.js test/validate.test.js && git commit -m "feat: content document validation with tests"
```

---

### Task 5: `/api/login` and `/api/logout`

**Files:**
- Create: `D:/track-website/functions/api/login.js`
- Create: `D:/track-website/functions/api/logout.js`
- Create: `D:/track-website/functions/_lib/auth.js`

**Interfaces:**
- Consumes: `signSession`/`verifySession` (Task 3), `json`/`error` (Task 1).
- Produces: `requireSession(request, env): Promise<boolean>` used by write endpoints (Task 6); a `session` cookie on successful login.

- [ ] **Step 1: Create `functions/_lib/auth.js`**

```js
import { verifySession } from './session.js';

const COOKIE = 'session';
const TTL = 12 * 3600;

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
```

- [ ] **Step 2: Create `functions/api/login.js`**

```js
import { json, error } from '../_lib/http.js';
import { signSession } from '../_lib/session.js';
import { sessionCookie, TTL } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return error(500, 'not_configured', 'Server not configured');
  let body;
  try { body = await request.json(); } catch { return error(400, 'bad_request', 'Invalid body'); }
  const pw = String(body?.password ?? '');

  // constant-time-ish compare
  const a = new TextEncoder().encode(pw);
  const b = new TextEncoder().encode(env.ADMIN_PASSWORD);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) return error(401, 'bad_password', 'Wrong password');

  const token = await signSession(env.SESSION_SECRET, TTL);
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie(token) } });
}
```

- [ ] **Step 3: Create `functions/api/logout.js`**

```js
import { json } from '../_lib/http.js';
import { clearCookie } from '../_lib/auth.js';

export async function onRequestPost() {
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie() } });
}
```

- [ ] **Step 4: Commit**

```bash
git add functions/api/login.js functions/api/logout.js functions/_lib/auth.js && git commit -m "feat: password login + session cookie endpoints"
```

Note: integration-verified against the Cloudflare preview in Task 8 (local wrangler avoided per Global Constraints).

---

### Task 6: `/api/content` — GET (public) + PUT (session)

**Files:**
- Create: `D:/track-website/functions/api/content.js`

**Interfaces:**
- Consumes: `requireSession` (Task 5), `validateContent` (Task 4), `DEFAULT_CONTENT` (Task 2), `json`/`error` (Task 1), KV binding `env.TRACK_CONTENT`.
- Produces: HTTP contract used by the site (Task 7) and admin (Task 8): `GET → content JSON`, `PUT {content} → {ok}`.

- [ ] **Step 1: Create `functions/api/content.js`**

```js
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
  let body;
  try { body = await request.json(); } catch { return error(400, 'bad_request', 'Invalid JSON'); }
  const doc = body?.content ?? body;
  const v = validateContent(doc);
  if (!v.ok) return error(422, 'invalid_content', v.reason);
  await env.TRACK_CONTENT.put('content', JSON.stringify(doc));
  return json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/content.js && git commit -m "feat: content API (public GET, session-gated PUT to KV)"
```

Verification deferred to Task 8 (preview deployment): `curl https://<preview>/api/content` returns the seeded/default doc; `PUT` without cookie returns 401.

---

### Task 7: Public site reads content with fallback

**Files:**
- Modify: `D:/track-website/script.js` (add a content-hydration module near the top of the IIFE, before the reveal/lang setup)
- Modify: `D:/track-website/index.html` (add stable hooks only where current markup can't be targeted — see step 2)

**Interfaces:**
- Consumes: `GET /api/content`.
- Produces: hydrated DOM; on failure leaves the existing embedded markup untouched (fallback).

- [ ] **Step 1: Add hydration to `script.js`** — insert immediately after `const LANG = ...` resolution (so `applyLang` runs on hydrated nodes). Phase 1 hydrates only the `site` text fields; lists come in later phases.

```js
/* ---------- hydrate editable texts from the CMS (fallback: keep embedded) ---------- */
async function hydrateContent() {
  let data;
  try {
    const res = await fetch('/api/content', { cache: 'no-store' });
    if (!res.ok) return;                 // keep embedded defaults
    data = await res.json();
  } catch { return; }                    // offline / local file:// → keep embedded
  const s = data && data.site;
  if (!s) return;
  const setPair = (el, val) => {
    if (!el || !val) return;
    el.textContent = val.ar ?? el.textContent;
    if (val.en != null) el.setAttribute('data-en', val.en);
  };
  const setPairHtml = (el, val) => {
    if (!el || !val) return;
    el.innerHTML = val.ar ?? el.innerHTML;
    if (val.en != null) el.setAttribute('data-en-html', val.en);
  };
  const q = (sel) => document.querySelector(sel);
  setPair(q('[data-cms="brandTag"]'), s.brandTag);
  setPair(q('[data-cms="heroEyebrow"]'), s.heroEyebrow);
  setPair(q('[data-cms="heroTitle1"]'), s.heroTitle1);
  setPairHtml(q('[data-cms="heroTitle2"]'), s.heroTitle2Html);
  setPair(q('[data-cms="heroSub"]'), s.heroSub);
  setPairHtml(q('[data-cms="aboutHeading"]'), s.aboutHeadingHtml);
  setPair(q('[data-cms="aboutLead"]'), s.aboutLead);
  setPair(q('[data-cms="aboutBody"]'), s.aboutBody);
  setPair(q('[data-cms="footerTag"]'), s.footerTag);
  if (s.contact) {
    const em = q('[data-cms="email"]'); if (em) { em.textContent = s.contact.email; em.href = 'mailto:' + s.contact.email; }
    const ph = q('[data-cms="phone"]'); if (ph) { ph.textContent = s.contact.phone; ph.href = 'tel:' + s.contact.phone.replace(/\s/g, ''); }
    setPair(q('[data-cms="address"]'), s.contact.address);
  }
  applyLang(LANG);   // re-apply language so swaps use the fresh data-en values
}
hydrateContent();
```

- [ ] **Step 2: Add `data-cms` hooks in `index.html`** to the existing elements (do NOT remove existing text — it stays as the fallback). Exact additions:
  - brand tag span → add `data-cms="brandTag"`
  - hero eyebrow inner span → `data-cms="heroEyebrow"`
  - hero title line 1 span → `data-cms="heroTitle1"`
  - hero title line 2 span → `data-cms="heroTitle2"`
  - hero sub `<p>` → `data-cms="heroSub"`
  - about `<h2>` → `data-cms="aboutHeading"`
  - about `.lead` `<p>` → `data-cms="aboutLead"`
  - about body `<p>` → `data-cms="aboutBody"`
  - contact email `<a>` → `data-cms="email"`; phone `<a>` → `data-cms="phone"`; address span → `data-cms="address"`
  - footer tag `<p>` → `data-cms="footerTag"`

- [ ] **Step 3: Verify fallback locally (no backend)**

Run: with the local server running, open `http://localhost:5178` — page renders identically (fetch to `/api/content` 404s under the plain static server → caught → embedded defaults shown). Confirm via console: no uncaught errors; hero/about text present.

- [ ] **Step 4: Commit**

```bash
git add script.js index.html && git commit -m "feat: hydrate site texts from CMS with embedded fallback"
```

---

### Task 8: Deploy to Cloudflare Pages + bindings + seed, and verify end-to-end

**Files:**
- Modify: `D:/track-website/wrangler.toml` (fill KV id)
- Create: `D:/track-website/docs/deploy-cloudflare.md` (the exact click-path, for the user)

**Interfaces:**
- Consumes: everything above.
- Produces: a live site + admin API on `*.pages.dev`.

- [ ] **Step 1: Push to GitHub**

```bash
git branch -M main
git remote add origin https://github.com/<user>/track-website.git
git push -u origin main
```

- [ ] **Step 2: Create the Pages project** — Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick `track-website` → Framework preset: **None** → Build command: *(empty)* → Output dir: `/` → Save & Deploy.

- [ ] **Step 3: Create KV namespace** — dashboard → Storage & Databases → KV → Create → name `TRACK_CONTENT`. Copy its ID into `wrangler.toml` `id`. Then Pages project → Settings → Bindings → add KV binding: variable `TRACK_CONTENT` → the namespace. (R2 binding added in Phase 2.)

- [ ] **Step 4: Set secrets** — Pages → Settings → Variables and Secrets → add **Secret** `ADMIN_PASSWORD` (the user's chosen password) and **Secret** `SESSION_SECRET` (a long random string, e.g. from `node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`). Redeploy so bindings/secrets take effect.

- [ ] **Step 5: Seed KV content** — one-time: dashboard → KV → `TRACK_CONTENT` → Add entry: key `content`, value = paste the contents of `content.default.json`. (Or leave empty — the API falls back to `DEFAULT_CONTENT`.)

- [ ] **Step 6: Verify end-to-end against the live URL**

```bash
BASE=https://track-website.pages.dev
curl -s $BASE/api/content | head -c 200                       # → JSON content
curl -s -o /dev/null -w "%{http_code}\n" -X PUT $BASE/api/content -d '{}'   # → 401 (no cookie)
curl -s -X POST $BASE/api/login -H 'content-type: application/json' -d '{"password":"WRONG"}' -o /dev/null -w "%{http_code}\n"   # → 401
```
Expected: content JSON returned; PUT without login → 401; wrong password → 401.

- [ ] **Step 7: Write `docs/deploy-cloudflare.md`** capturing steps 1–6 as a numbered guide (for the user to reproduce/maintain), then commit.

```bash
git add wrangler.toml docs/deploy-cloudflare.md && git commit -m "docs: cloudflare deploy guide; wire KV id"
```

---

### Task 9: Admin — login + Texts editor

**Files:**
- Create: `D:/track-website/admin/index.html`
- Create: `D:/track-website/admin/admin.css`
- Create: `D:/track-website/admin/admin.js`

**Interfaces:**
- Consumes: `POST /api/login`, `GET /api/content`, `PUT /api/content`.
- Produces: the Phase-1 admin (Texts tab). Later phases add list tabs into this same shell.

- [ ] **Step 1: Create `admin/index.html`** — RTL Arabic shell: a login card (single password input) and a hidden editor with a "النصوص" section containing labelled AR+EN inputs for each `site` field (brandTag, heroEyebrow, heroTitle1, heroTitle2Html, heroSub, aboutHeadingHtml, aboutLead, aboutBody, contact.email, contact.phone, contact.address, footerTag), plus a Save button and a status line. Link `admin.css` and `admin.js`. (Full markup written during implementation; every field id is `f_<key>_ar` / `f_<key>_en`.)

- [ ] **Step 2: Create `admin/admin.css`** — reuse the site's dark/teal tokens; simple form styling, RTL, responsive.

- [ ] **Step 3: Create `admin/admin.js`**

```js
const $ = (s) => document.querySelector(s);
const api = (path, opts) => fetch(path, { credentials: 'same-origin', ...opts });

async function login(e) {
  e.preventDefault();
  const r = await api('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: $('#pw').value }) });
  if (r.ok) { $('#login').hidden = true; $('#editor').hidden = false; loadContent(); }
  else $('#loginMsg').textContent = 'كلمة المرور غير صحيحة';
}

let CONTENT = null;
async function loadContent() {
  CONTENT = await (await api('/api/content')).json();
  const s = CONTENT.site || (CONTENT.site = {});
  const setPair = (key, val) => { const a = $(`#f_${key}_ar`), e = $(`#f_${key}_en`); if (a) a.value = val?.ar ?? ''; if (e) e.value = val?.en ?? ''; };
  ['brandTag','heroEyebrow','heroTitle1','heroTitle2Html','heroSub','aboutHeadingHtml','aboutLead','aboutBody','footerTag'].forEach(k => setPair(k, s[k]));
  $('#f_email').value = s.contact?.email ?? '';
  $('#f_phone').value = s.contact?.phone ?? '';
  $('#f_address_ar').value = s.contact?.address?.ar ?? '';
  $('#f_address_en').value = s.contact?.address?.en ?? '';
}

async function save() {
  const s = CONTENT.site;
  const getPair = (key) => ({ ar: $(`#f_${key}_ar`).value, en: $(`#f_${key}_en`).value });
  ['brandTag','heroEyebrow','heroTitle1','heroTitle2Html','heroSub','aboutHeadingHtml','aboutLead','aboutBody','footerTag'].forEach(k => s[k] = getPair(k));
  s.contact = { email: $('#f_email').value, phone: $('#f_phone').value, address: { ar: $('#f_address_ar').value, en: $('#f_address_en').value } };
  const r = await api('/api/content', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: CONTENT }) });
  $('#saveMsg').textContent = r.ok ? 'تم الحفظ ✓ (قد يستغرق ظهورها دقيقة)' : 'تعذّر الحفظ';
}

$('#login').addEventListener('submit', login);
$('#saveBtn').addEventListener('click', save);
// if already logged in (cookie present), skip login
api('/api/content').then(() => {}); // no-op warm; editor shows after login
```

- [ ] **Step 4: Verify on the live URL** — open `https://<project>.pages.dev/admin/`, enter the password → editor loads current texts → change hero title → Save → within ~1 min reload the public site → the change appears (in both AR and EN as edited). Wrong password shows the error and does not open the editor.

- [ ] **Step 5: Commit**

```bash
git add admin/ && git commit -m "feat: admin login + Texts editor (Phase 1)"
```

---

## Self-Review

**Spec coverage (Phase 1 slice):**
- Cloudflare Pages + Functions + KV → Tasks 1, 6, 8. ✓
- Password-only, server-side, HMAC session → Tasks 3, 5. ✓
- Public site reads content + fallback → Task 7. ✓
- Admin Texts editing, bilingual → Task 9. ✓
- Deploy via GitHub → Pages → Task 8. ✓
- R2/images, Works/Services/Testimonials/Stats CRUD → intentionally deferred to Phases 2–3 (spec §10). Not gaps.

**Placeholder scan:** No TBD/TODO. Task 1/9 markup for `admin/index.html` is described field-by-field with a fixed id convention (`f_<key>_ar/_en`) rather than pasted in full — acceptable as it's mechanical form markup fully determined by the field list; all logic code is complete.

**Type consistency:** `signSession`/`verifySession`, `validateContent`, `requireSession`, `sessionCookie`/`clearCookie`, `DEFAULT_CONTENT`, and the `GET/PUT /api/content` + `POST /api/login` contracts are named identically across tasks. `data-cms` hook names match between Task 7 site hydration and the `content.default.json` keys.

**Constraint:** local `wrangler` avoided; all integration verification is against the Cloudflare preview/live URL per Global Constraints.
