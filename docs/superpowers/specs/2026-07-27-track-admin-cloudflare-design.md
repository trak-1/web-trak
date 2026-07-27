# Track — Cloudflare Admin / CMS — Design Spec

**Date:** 2026-07-27
**Status:** Approved design → spec review
**Project:** `D:\track-website` (Track / تراك — audio-visual production one-page site)

---

## ملخّص (Arabic summary)

لوحة تحكّم (admin) لموقع Track، مستضافة بالكامل على **Cloudflare**، تتيح لمالك الموقع تعديل **كل المحتوى** (نصوص وصور، وإضافة/حذف/تعديل الأعمال والخدمات والآراء والأرقام) — عربي/إنجليزي — عبر **دخول بكلمة مرور فقط**. الموقع العام يقرأ المحتوى من قاعدة بيانات Cloudflare KV مع احتياطي مدمج. النشر عبر GitHub → Cloudflare Pages.

---

## 1. Goals

- Self-serve admin panel to edit **all** site content without touching code.
- Full CRUD on list entities: **works, services, testimonials, stats**.
- Editable free text: hero, about, contact, section headings, footer — **bilingual (AR/EN)**.
- Image upload from the admin (hero slides, work covers, service images).
- **Password-only** admin login, validated **server-side** (secure — no shared client-side secret).
- **Entirely on Cloudflare** free tiers.
- Public site reads live content, with a built-in fallback so it never renders empty.

## 2. Non-goals (YAGNI)

- Multiple users / roles (single admin only).
- Editing layout/design/CSS from the admin (content only).
- Analytics, comments, form-submission storage, i18n beyond the existing AR/EN.
- Live collaborative editing.

## 3. Architecture (all Cloudflare)

| Component | Role |
|---|---|
| **Cloudflare Pages** | Hosts the static public site + `admin/` page |
| **Pages Functions** (`functions/api/*`) | Serverless API; bound to KV, R2, and secrets. All writes gated server-side. |
| **KV namespace** `TRACK_CONTENT` | Stores the whole site content as one JSON document under key `content` |
| **R2 bucket** `track-media` | Stores uploaded images; served through a Function route (`/media/*`) |
| **Secrets** | `ADMIN_PASSWORD` (login), `SESSION_SECRET` (HMAC signing key) |

Single Pages project serves everything on one origin → no CORS complexity.

Rationale: a single JSON doc in KV (not D1/SQL) keeps the model trivial for this scale — the admin loads the whole content object, edits arrays in place, saves it back. No migrations.

Trade-off noted: KV is eventually consistent (writes can take up to ~60s to propagate globally). Acceptable for a single-admin small site.

## 4. Data model — content JSON (KV key `content`)

```jsonc
{
  "version": 1,
  "site": {
    "brandTag": {"ar": "إنتاج فني", "en": "Art Production"},
    "heroEyebrow": {"ar": "...", "en": "..."},
    "heroTitle1": {"ar": "كل المسارات", "en": "All tracks"},
    "heroTitle2Html": {"ar": "تؤدي <em>إلينا</em>", "en": "lead to <em>us</em>"},
    "heroSub": {"ar": "...", "en": "..."},
    "aboutHeadingHtml": {"ar": "...", "en": "..."},
    "aboutLead": {"ar": "...", "en": "..."},
    "aboutBody": {"ar": "...", "en": "..."},
    "contact": {"email": "...", "phone": "...", "address": {"ar": "...", "en": "..."}},
    "footerTag": {"ar": "...", "en": "..."},
    "heroSlides": ["/media/xxx.jpg", "..."]   // 2–4 image URLs
    // ...remaining section headings/notes as needed
  },
  "stats":        [{"id","number","suffix","label":{"ar","en"}}],
  "services":     [{"id","title":{"ar","en"},"desc":{"ar","en"},"tags":{"ar":[],"en":[]},"image"}],
  "works":        [{"id","cat","title":{"ar","en"},"catLabel":{"ar","en"},"image"}],
  "testimonials": [{"id","quote":{"ar","en"},"name":{"ar","en"},"role":{"ar","en"}}]
}
```

Ordering = array order (admin can reorder). `id` = stable short string.

## 5. API (Pages Functions)

| Method + path | Auth | Purpose |
|---|---|---|
| `GET /api/content` | public | Return the content JSON |
| `POST /api/login` | password | Validate `ADMIN_PASSWORD`; set HMAC-signed `session` cookie (httpOnly). Basic attempt throttle. |
| `POST /api/logout` | session | Clear cookie |
| `PUT /api/content` | session | Replace the content JSON (admin sends the full edited object; server validates shape + size) |
| `POST /api/upload` | session | Multipart image → resize/limit → R2 → return `/media/<key>` URL |
| `GET /media/*` | public | Stream image from R2 |

Session token: HMAC-SHA256 over `{exp}` signed with `SESSION_SECRET`, stored in an httpOnly, Secure, SameSite=Strict cookie. Write endpoints verify signature + expiry.

## 6. Public site changes

- Refactor `index.html` / `script.js` to **fetch `/api/content` on load** and populate the existing `data-en` / element structure (the site is already largely data-attribute driven).
- **Fallback:** keep the current hard-coded Arabic/English content embedded; if the fetch fails or returns nothing, render the embedded defaults. Site never blank.
- Hero slides, work cards, services, testimonials, stats rendered from the JSON arrays.

## 7. Admin UI (`/admin`)

- **Login screen:** single password field → `POST /api/login`.
- **Editor (after login):** tabbed — `النصوص | الأعمال | الخدمات | الآراء | الأرقام`.
  - Text tab: labelled AR + EN inputs for each field.
  - List tabs: cards with edit/delete, an "add" button, drag-to-reorder (or up/down), image upload with preview.
  - **Save**: writes the whole content object via `PUT /api/content`; toast on success. "Preview site" link.
- Arabic RTL, styled to match the site (reuse tokens).
- Loads current content via `GET /api/content` to populate the forms.

## 8. Security

- Password lives only as a Cloudflare **secret**, checked server-side; never shipped to the client.
- Writes require a valid signed session cookie; anon can only read.
- Upload: enforce content-type (image/*) and a size cap; generate random R2 keys.
- Basic login rate-limit (e.g., short lockout after N failures via KV counter).

## 9. Deployment

1. `git init` the project; push to a **GitHub** repo.
2. Cloudflare dashboard → **Pages** → connect the repo (auto-deploy on push). Avoids local CLI (works around the machine's native-binding limitation).
3. Create **KV namespace** `TRACK_CONTENT` and **R2 bucket** `track-media`; bind them to the Pages project.
4. Set secrets `ADMIN_PASSWORD`, `SESSION_SECRET` in Pages settings.
5. Seed KV `content` with the current site content (one-time script or admin first-save).
6. Guided step-by-step for the user (they own the Cloudflare account).

## 10. Phasing (incremental, each independently shippable)

- **Phase 1 — Foundation:** git+GitHub+Pages deploy of the current static site; KV + `GET /api/content` + `PUT /api/content`; login/session; public site reads content with fallback; admin **Texts** tab. → editable texts live.
- **Phase 2 — Images + Works:** R2 + `/api/upload` + `/media/*`; admin **Works** CRUD with image upload; hero slides editable.
- **Phase 3 — Services / Testimonials / Stats:** remaining CRUD tabs.
- **Phase 4 — Polish:** reorder UX, session hardening, rate-limit, empty/error states.

## 11. Open considerations

- KV eventual consistency (~≤60s propagation) — fine for single admin; note in admin ("changes may take up to a minute to appear").
- Local machine blocks native `.node` binaries → prefer GitHub-connected Pages deploy over local `wrangler`; if `wrangler` is needed, use the WASM/remote path.
- Image optimization: cap dimensions on upload to keep the site light (the site already targets low-end devices).
