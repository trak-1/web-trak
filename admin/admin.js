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

$('#loginForm').addEventListener('submit', login);
$('#saveBtn').addEventListener('click', save);
$('#logoutBtn').addEventListener('click', logout);
$('#heroVideoUpload').addEventListener('click', uploadHeroVideo);
$('#heroVideoClear').addEventListener('click', clearHeroVideo);
document.querySelectorAll('button[data-slide]').forEach((b) =>
  b.addEventListener('click', () => uploadSlide(+b.dataset.slide)));
