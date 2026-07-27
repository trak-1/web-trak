const $ = (s) => document.querySelector(s);
const api = (path, opts) => fetch(path, { credentials: 'same-origin', ...opts });

const SITE_KEYS = [
  'brandTag', 'heroEyebrow', 'heroTitle1', 'heroTitle2Html',
  'heroSub', 'aboutHeadingHtml', 'aboutLead', 'aboutBody', 'footerTag',
];

let CONTENT = null;

async function login(e) {
  e.preventDefault();
  $('#loginMsg').textContent = '';
  let r;
  try {
    r = await api('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: $('#pw').value }),
    });
  } catch { $('#loginMsg').textContent = 'تعذّر الاتصال بالخادم'; return; }
  if (r.ok) {
    $('#login').hidden = true;
    $('#editor').hidden = false;
    loadContent();
  } else {
    $('#loginMsg').textContent = r.status === 401 ? 'كلمة المرور غير صحيحة' : 'الخادم غير مهيّأ';
  }
}

async function loadContent() {
  try { CONTENT = await (await api('/api/content')).json(); }
  catch { $('#saveMsg').textContent = 'تعذّر تحميل المحتوى'; return; }
  if (!CONTENT || typeof CONTENT !== 'object') CONTENT = {};
  const s = CONTENT.site || (CONTENT.site = {});
  for (const k of SITE_KEYS) {
    const ar = $(`#f_${k}_ar`), en = $(`#f_${k}_en`);
    if (ar) ar.value = s[k]?.ar ?? '';
    if (en) en.value = s[k]?.en ?? '';
  }
  const c = s.contact || {};
  $('#f_email').value = c.email ?? '';
  $('#f_phone').value = c.phone ?? '';
  $('#f_address_ar').value = c.address?.ar ?? '';
  $('#f_address_en').value = c.address?.en ?? '';
  showHeroVideo();
  showSlides();
  renderLists();
}

function showHeroVideo() {
  const v = CONTENT?.site?.heroVideo || '';
  $('#heroVideoCurrent').textContent = v || 'لا يوجد (صور)';
}

async function uploadHeroVideo() {
  const f = $('#heroVideoFile').files[0];
  const st = $('#heroVideoStatus');
  if (!f) { st.style.color = '#ff8a7a'; st.textContent = 'اختر ملف فيديو أولًا'; return; }
  st.style.color = '';
  st.textContent = 'جارٍ الرفع… قد يستغرق حسب حجم الملف';
  const fd = new FormData();
  fd.append('file', f);
  let r;
  try { r = await api('/api/upload', { method: 'POST', body: fd }); }
  catch { st.style.color = '#ff8a7a'; st.textContent = 'تعذّر الاتصال'; return; }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    st.style.color = '#ff8a7a';
    st.textContent = r.status === 401 ? 'انتهت الجلسة — سجّل الدخول' : ('تعذّر الرفع: ' + (e?.error?.message || r.status));
    return;
  }
  const { url } = await r.json();
  CONTENT.site = CONTENT.site || {};
  CONTENT.site.heroVideo = url;
  showHeroVideo();
  st.textContent = 'تم الرفع ✓ — اضغط "حفظ التغييرات" لتثبيته على الموقع';
}

function clearHeroVideo() {
  if (!CONTENT) return;
  CONTENT.site = CONTENT.site || {};
  CONTENT.site.heroVideo = '';
  showHeroVideo();
  $('#heroVideoStatus').textContent = 'سيُزال الفيديو عند الحفظ (رجوع للصور)';
}

const DEFAULT_SLIDES = ['assets/img/corridor-800.jpg', 'assets/img/audio-studio-800.jpg', 'assets/img/vocal-booth-800.jpg'];
function showSlides() {
  const arr = (CONTENT?.site?.heroSlides && CONTENT.site.heroSlides.length) ? CONTENT.site.heroSlides : DEFAULT_SLIDES;
  for (let i = 0; i < 3; i++) {
    const img = $('#slideThumb' + i);
    if (img) img.src = (arr[i] || DEFAULT_SLIDES[i]) + (arr[i] && arr[i].startsWith('/media/') ? '' : '');
  }
}
async function uploadSlide(i) {
  const f = $('#slideFile' + i).files[0];
  const st = $('#slideStatus');
  if (!f) { st.style.color = '#ff8a7a'; st.textContent = 'اختر صورة أولًا'; return; }
  st.style.color = ''; st.textContent = `جارٍ رفع الصورة ${i + 1}…`;
  const fd = new FormData(); fd.append('file', f);
  let r;
  try { r = await api('/api/upload', { method: 'POST', body: fd }); }
  catch { st.style.color = '#ff8a7a'; st.textContent = 'تعذّر الاتصال'; return; }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    st.style.color = '#ff8a7a';
    st.textContent = r.status === 401 ? 'انتهت الجلسة — سجّل الدخول' : ('تعذّر الرفع: ' + (e?.error?.message || r.status));
    return;
  }
  const { url } = await r.json();
  CONTENT.site = CONTENT.site || {};
  if (!Array.isArray(CONTENT.site.heroSlides) || CONTENT.site.heroSlides.length < 3) CONTENT.site.heroSlides = [...DEFAULT_SLIDES];
  CONTENT.site.heroSlides[i] = url;
  showSlides();
  st.textContent = `تم رفع الصورة ${i + 1} ✓ — اضغط "حفظ التغييرات" لتثبيتها`;
}

async function save() {
  if (!CONTENT) return;
  const s = CONTENT.site || (CONTENT.site = {});
  for (const k of SITE_KEYS) {
    s[k] = { ar: $(`#f_${k}_ar`).value, en: $(`#f_${k}_en`).value };
  }
  s.contact = {
    email: $('#f_email').value,
    phone: $('#f_phone').value,
    address: { ar: $('#f_address_ar').value, en: $('#f_address_en').value },
  };
  // keep list fields valid arrays (Phase 1 doesn't edit them)
  for (const k of ['stats', 'services', 'works', 'testimonials']) {
    if (!Array.isArray(CONTENT[k])) CONTENT[k] = [];
  }
  $('#saveMsg').textContent = 'جارٍ الحفظ…';
  let r;
  try {
    r = await api('/api/content', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: CONTENT }),
    });
  } catch { $('#saveMsg').textContent = 'تعذّر الاتصال بالخادم'; return; }
  if (r.ok) $('#saveMsg').textContent = 'تم الحفظ ✓ (قد يستغرق ظهورها على الموقع دقيقة)';
  else if (r.status === 401) { $('#saveMsg').textContent = 'انتهت الجلسة — سجّل الدخول من جديد'; setTimeout(() => location.reload(), 1500); }
  else $('#saveMsg').textContent = 'تعذّر الحفظ';
}

async function logout() {
  try { await api('/api/logout', { method: 'POST' }); } catch {}
  location.reload();
}

/* ---------- CRUD for stats / services / works / testimonials ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rid = () => 'x' + Math.random().toString(36).slice(2, 8);
function setPath(obj, path, val) {
  const p = path.split('.'); let o = obj;
  for (let i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
  o[p[p.length - 1]] = val;
}
function ensureLists() {
  CONTENT = CONTENT || {};
  for (const k of ['stats', 'services', 'works', 'testimonials']) if (!Array.isArray(CONTENT[k])) CONTENT[k] = [];
}
const imgBlock = (ent, i, url) => `<div class="full"><label>الصورة</label>
  <img class="thumb" src="${esc(url || '')}" alt="">
  <input type="file" accept="image/*" data-imgfile="${ent}" data-idx="${i}">
  <button class="btn btn-ghost" type="button" data-imgupload="${ent}" data-idx="${i}">رفع الصورة</button></div>`;
const inp = (ent, i, path, val, ltr) => `<input data-ent="${ent}" data-idx="${i}" data-path="${path}" ${ltr ? 'dir=ltr' : ''} value="${esc(val)}">`;
const ta = (ent, i, path, val, ltr, list) => `<textarea data-ent="${ent}" data-idx="${i}" data-path="${path}" ${list ? 'data-list=1' : ''} rows="2" ${ltr ? 'dir=ltr' : ''}>${esc(list && Array.isArray(val) ? val.join('\n') : val)}</textarea>`;
const del = (ent, i) => `<button class="card-del" data-del="${ent}" data-idx="${i}" type="button">حذف ✕</button>`;

function renderLists() {
  ensureLists();
  $('#statsList').innerHTML = CONTENT.stats.map((s, i) => `<div class="card">${del('stats', i)}
    <div><label>الرقم</label><input data-ent="stats" data-idx="${i}" data-path="number" data-num=1 type="number" value="${esc(s.number)}"></div>
    <div><label>اللاحقة (مثل +)</label>${inp('stats', i, 'suffix', s.suffix)}</div>
    <div><label>التسمية — عربي</label>${inp('stats', i, 'label.ar', s.label?.ar)}</div>
    <div><label>التسمية — إنجليزي</label>${inp('stats', i, 'label.en', s.label?.en, 1)}</div></div>`).join('');

  $('#servicesList').innerHTML = CONTENT.services.map((s, i) => `<div class="card">${del('services', i)}
    ${imgBlock('services', i, s.image)}
    <div><label>العنوان — عربي</label>${inp('services', i, 'title.ar', s.title?.ar)}</div>
    <div><label>العنوان — إنجليزي</label>${inp('services', i, 'title.en', s.title?.en, 1)}</div>
    <div class="full"><label>الوصف — عربي</label>${ta('services', i, 'desc.ar', s.desc?.ar)}</div>
    <div class="full"><label>الوصف — إنجليزي</label>${ta('services', i, 'desc.en', s.desc?.en, 1)}</div>
    <div class="full"><label>الوسوم — عربي (وسم بكل سطر)</label>${ta('services', i, 'tags.ar', s.tags?.ar, 0, 1)}</div>
    <div class="full"><label>الوسوم — إنجليزي (وسم بكل سطر)</label>${ta('services', i, 'tags.en', s.tags?.en, 1, 1)}</div></div>`).join('');

  $('#worksList').innerHTML = CONTENT.works.map((w, i) => `<div class="card">${del('works', i)}
    ${imgBlock('works', i, w.image)}
    <div><label>التصنيف (للفلتر)</label><select data-ent="works" data-idx="${i}" data-path="cat">
      <option value="event" ${w.cat === 'event' ? 'selected' : ''}>فعاليات</option>
      <option value="audio" ${w.cat === 'audio' ? 'selected' : ''}>صوتي</option>
      <option value="visual" ${w.cat === 'visual' ? 'selected' : ''}>مرئي</option></select></div>
    <div><label>النوع (تحت الصورة) — عربي</label>${inp('works', i, 'catLabel.ar', w.catLabel?.ar)}</div>
    <div><label>النوع — إنجليزي</label>${inp('works', i, 'catLabel.en', w.catLabel?.en, 1)}</div>
    <div><label>العنوان — عربي</label>${inp('works', i, 'title.ar', w.title?.ar)}</div>
    <div><label>العنوان — إنجليزي</label>${inp('works', i, 'title.en', w.title?.en, 1)}</div></div>`).join('');

  $('#quotesList').innerHTML = CONTENT.testimonials.map((t, i) => `<div class="card">${del('testimonials', i)}
    <div class="full"><label>الاقتباس — عربي</label>${ta('testimonials', i, 'quote.ar', t.quote?.ar)}</div>
    <div class="full"><label>الاقتباس — إنجليزي</label>${ta('testimonials', i, 'quote.en', t.quote?.en, 1)}</div>
    <div><label>الاسم — عربي</label>${inp('testimonials', i, 'name.ar', t.name?.ar)}</div>
    <div><label>الاسم — إنجليزي</label>${inp('testimonials', i, 'name.en', t.name?.en, 1)}</div>
    <div><label>الصفة — عربي</label>${inp('testimonials', i, 'role.ar', t.role?.ar)}</div>
    <div><label>الصفة — إنجليزي</label>${inp('testimonials', i, 'role.en', t.role?.en, 1)}</div></div>`).join('');
}

async function uploadItemImage(ent, i, btn) {
  const file = document.querySelector(`input[data-imgfile="${ent}"][data-idx="${i}"]`)?.files[0];
  if (!file) { alert('اختر صورة أولًا'); return; }
  const old = btn.textContent; btn.textContent = 'جارٍ الرفع…';
  const fd = new FormData(); fd.append('file', file);
  try {
    const r = await api('/api/upload', { method: 'POST', body: fd });
    if (!r.ok) { btn.textContent = old; alert('تعذّر الرفع'); return; }
    const { url } = await r.json();
    CONTENT[ent][i].image = url;
    renderLists();
  } catch { btn.textContent = old; alert('تعذّر الاتصال'); }
}

// live edit via delegation
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-ent]'); if (!el) return;
  const { ent, idx, path } = el.dataset;
  if (!CONTENT?.[ent]?.[+idx]) return;
  let v = el.value;
  if (el.dataset.num) v = Number(v) || 0;
  else if (el.dataset.list) v = v.split('\n').map((x) => x.trim()).filter(Boolean);
  setPath(CONTENT[ent][+idx], path, v);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('select[data-ent]'); if (!el) return;
  setPath(CONTENT[el.dataset.ent][+el.dataset.idx], el.dataset.path, el.value);
});
// delete + image upload via delegation
document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-del]');
  if (d) { CONTENT[d.dataset.del].splice(+d.dataset.idx, 1); renderLists(); return; }
  const u = e.target.closest('[data-imgupload]');
  if (u) uploadItemImage(u.dataset.imgupload, +u.dataset.idx, u);
});

// tabs
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('is-active'));
  t.classList.add('is-active');
  document.querySelectorAll('.panel').forEach((p) => { p.hidden = p.id !== 'panel-' + t.dataset.tab; });
}));

// add buttons
const addItem = (ent, blank) => { ensureLists(); CONTENT[ent].push(blank); renderLists(); };
$('#addStat').addEventListener('click', () => addItem('stats', { id: rid(), number: 0, suffix: '+', label: { ar: '', en: '' } }));
$('#addService').addEventListener('click', () => addItem('services', { id: rid(), image: '', title: { ar: '', en: '' }, desc: { ar: '', en: '' }, tags: { ar: [], en: [] } }));
$('#addWork').addEventListener('click', () => addItem('works', { id: rid(), cat: 'event', image: '', catLabel: { ar: '', en: '' }, title: { ar: '', en: '' } }));
$('#addQuote').addEventListener('click', () => addItem('testimonials', { id: rid(), quote: { ar: '', en: '' }, name: { ar: '', en: '' }, role: { ar: '', en: '' } }));

$('#loginForm').addEventListener('submit', login);
$('#saveBtn').addEventListener('click', save);
$('#logoutBtn').addEventListener('click', logout);
$('#heroVideoUpload').addEventListener('click', uploadHeroVideo);
$('#heroVideoClear').addEventListener('click', clearHeroVideo);
document.querySelectorAll('button[data-slide]').forEach((b) =>
  b.addEventListener('click', () => uploadSlide(+b.dataset.slide)));
