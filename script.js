/* TRACK — interactions, motion & bilingual (AR default / EN toggle)
   Progressive, reduced-motion aware, no framework. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ============================================================
     LANGUAGE  — Arabic is the default; English is the toggle.
     Arabic text lives in the DOM; English lives in data-en*.
     ============================================================ */
  const de = document.documentElement;
  let LANG = 'ar';
  try { LANG = localStorage.getItem('track-lang') === 'en' ? 'en' : 'ar'; } catch (e) {}

  const NOTE = {
    invalid: { ar: 'أضف اسمك وبريدًا صحيحًا حتى نتمكّن من الرد.', en: 'Add your name and a valid email so we can reply.' },
    success: {
      ar: n => `شكرًا ${n} — استلمنا طلبك وسنتواصل معك قريبًا.`,
      en: n => `Thanks, ${n} — brief received. We'll be in touch.`,
    },
  };

  const applyLang = (l) => {
    const en = l === 'en';
    de.classList.toggle('en', en);
    de.classList.toggle('ar', !en);
    de.lang = en ? 'en' : 'ar';
    de.dir = en ? 'ltr' : 'rtl';

    $$('[data-en]').forEach(el => {
      if (el.__ar === undefined) el.__ar = el.textContent;
      el.textContent = en ? el.getAttribute('data-en') : el.__ar;
    });
    $$('[data-en-html]').forEach(el => {
      if (el.__arH === undefined) el.__arH = el.innerHTML;
      el.innerHTML = en ? el.getAttribute('data-en-html') : el.__arH;
    });
    $$('[data-en-ph]').forEach(el => {
      if (el.__arP === undefined) el.__arP = el.getAttribute('placeholder') || '';
      el.setAttribute('placeholder', en ? el.getAttribute('data-en-ph') : el.__arP);
    });
    $$('[data-en-aria]').forEach(el => {
      if (el.__arA === undefined) el.__arA = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', en ? el.getAttribute('data-en-aria') : el.__arA);
    });

    $$('.lang').forEach(btn => {
      btn.textContent = btn.classList.contains('lang-mobile')
        ? (en ? 'العربية / Arabic' : 'English / الإنجليزية')
        : (en ? 'ع' : 'EN');
      btn.setAttribute('aria-label', en ? 'التبديل إلى العربية' : 'Switch to English');
    });

    LANG = l;
    try { localStorage.setItem('track-lang', l); } catch (e) {}
  };

  applyLang(LANG);
  $$('.lang').forEach(btn => btn.addEventListener('click', () => applyLang(LANG === 'en' ? 'ar' : 'en')));

  /* ---------- hydrate editable texts from the CMS (fallback: keep embedded) ---------- */
  async function hydrateContent() {
    let data;
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (!res.ok) return;                 // keep embedded defaults
      data = await res.json();
    } catch { return; }                    // offline / file:// → keep embedded
    const s = data && data.site;
    if (!s) return;
    // setPair/​setPairHtml also refresh applyLang's __ar/__arH caches so a later
    // language toggle uses the fresh content, not the stale embedded value.
    const setPair = (el, val) => {
      if (!el || !val) return;
      if (val.ar != null) { el.textContent = val.ar; el.__ar = val.ar; }
      if (val.en != null) el.setAttribute('data-en', val.en);
    };
    const setPairHtml = (el, val) => {
      if (!el || !val) return;
      if (val.ar != null) { el.innerHTML = val.ar; el.__arH = val.ar; }
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
      const em = q('[data-cms="email"]');
      if (em && s.contact.email) { em.textContent = s.contact.email; em.href = 'mailto:' + s.contact.email; }
      const ph = q('[data-cms="phone"]');
      if (ph && s.contact.phone) { ph.textContent = s.contact.phone; ph.href = 'tel:' + s.contact.phone.replace(/\s/g, ''); }
      setPair(q('[data-cms="address"]'), s.contact.address);
    }
    applyLang(LANG);   // re-apply so the active language reflects fresh data
  }
  hydrateContent();

  /* ---------- waveform bars (signature, calm) ---------- */
  const wf = $('#wfBars');
  if (wf) {
    const N = 56;
    let html = '';
    for (let i = 0; i < N; i++) {
      const h = 14 + Math.round(32 * Math.abs(Math.sin(i * 0.5) * Math.cos(i * 0.13)));
      const d = (i % 12) * 0.08;
      html += `<span style="height:${h}%;animation-delay:${d}s"></span>`;
    }
    wf.innerHTML = html;
  }

  /* ---------- nav scrolled state + mobile menu ---------- */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  const burger = $('#burger');
  const menu = $('#mobileMenu');
  const toggleMenu = (open) => {
    const willOpen = open ?? menu.hasAttribute('hidden');
    if (willOpen) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
    burger.setAttribute('aria-expanded', String(willOpen));
    document.body.style.overflow = willOpen ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => toggleMenu());
  $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  // Close + release scroll-lock if the viewport grows past the mobile breakpoint.
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches && !menu.hasAttribute('hidden')) toggleMenu(false);
  });

  /* ---------- scroll spine progress ---------- */
  const fill = $('.spine-fill');
  const node = $('.spine-node');
  const onScrollSpine = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    if (fill) fill.style.height = (p * 100) + '%';
    if (node) node.style.top = (p * 100) + '%';
  };
  onScrollSpine();
  window.addEventListener('scroll', onScrollSpine, { passive: true });

  /* ---------- reveal on scroll (scroll-sweep, no IO dependency) ---------- */
  const revealTargets = $$('.reveal, .hero-title, .svc, blockquote');
  const show = el => el.classList.add('in');
  const inView = el => {
    const r = el.getBoundingClientRect();
    return r.top < (window.innerHeight || 800) * 0.92 && r.bottom > 0;
  };
  const revealHero = () => {
    $('.hero-title') && show($('.hero-title'));
    $$('.hero .reveal').forEach((el, i) => setTimeout(() => show(el), 90 + i * 80));
  };

  if (reduce) {
    revealTargets.forEach(show);
  } else {
    // Hero owns its own staggered entrance; keep it out of the sweep so the
    // synchronous first sweep doesn't reveal all hero items at once.
    let pending = revealTargets.filter(el => !el.closest('.hero'));
    const sweep = () => {
      if (!pending.length) return;
      pending = pending.filter(el => { if (inView(el)) { show(el); return false; } return true; });
    };
    revealHero();
    sweep();
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    window.addEventListener('load', () => setTimeout(sweep, 300));
  }

  /* ---------- animated count-up stats ---------- */
  const stats = $$('.stat');
  const runCount = (el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    const numEl = $('.stat-num', el);
    if (reduce) { numEl.textContent = target + suffix; return; }
    const dur = 1400, start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = Math.round(target * eased) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  let pendingStats = stats.slice();
  const sweepStats = () => {
    if (!pendingStats.length) return;
    pendingStats = pendingStats.filter(s => {
      const r = s.getBoundingClientRect();
      if (r.top < (window.innerHeight || 800) * 0.85 && r.bottom > 0) { runCount(s); return false; }
      return true;
    });
  };
  sweepStats();
  window.addEventListener('scroll', sweepStats, { passive: true });
  window.addEventListener('resize', sweepStats, { passive: true });
  window.addEventListener('load', () => setTimeout(sweepStats, 300));

  /* ---------- work filter ---------- */
  const filters = $$('.filter:not(.lang)');
  const cards = $$('.work-card');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
      const f = btn.dataset.filter;
      cards.forEach(card => {
        const showCard = f === 'all' || card.dataset.cat === f;
        clearTimeout(card._hideT); // cancel any pending hide from a prior click
        if (reduce) { card.classList.toggle('hide', !showCard); return; }
        if (showCard) {
          card.classList.remove('hide');
          requestAnimationFrame(() => card.classList.remove('fade'));
        } else {
          card.classList.add('fade');
          card._hideT = setTimeout(() => card.classList.add('hide'), 260);
        }
      });
    });
  });

  /* ---------- hero: pause/play the CSS crossfade slideshow ----------
     The hero background is a pure-CSS image crossfade (see styles.css) — light
     and decode-free. JS only wires the pause button. */
  const vtoggle = $('#heroVToggle');
  const heroSlides = $('#heroSlides');
  const setToggle = (playing) => {
    if (!vtoggle) return;
    vtoggle.setAttribute('aria-pressed', String(playing));
    vtoggle.setAttribute('aria-label', playing
      ? (LANG === 'en' ? 'Pause background' : 'إيقاف الخلفية')
      : (LANG === 'en' ? 'Play background' : 'تشغيل الخلفية'));
    vtoggle.setAttribute('data-en-aria', playing ? 'Pause background' : 'Play background');
    vtoggle.__ar = playing ? 'إيقاف الخلفية' : 'تشغيل الخلفية';
  };
  if (heroSlides) {
    setToggle(true);
    vtoggle?.addEventListener('click', (e) => {
      e.preventDefault();
      const paused = heroSlides.classList.toggle('paused');
      setToggle(!paused);
    });
  }

  /* ---------- studio: scroll-driven canvas image-sequence tour ----------
     Uses a pre-extracted frame sequence drawn to <canvas> — reliable across
     browsers/mobile, unlike scrubbing a <video> via currentTime. */
  const scrolly = $('#studio.scrolly');
  const canvas = $('#scrollyCanvas');
  const strack = $('#scrollyTrack');
  const sbar = $('#scrollyBar');
  const chapters = $$('.chapter');
  if (scrolly && canvas && strack) {
    const ctx = canvas.getContext('2d');
    const N = 60;                                    // frames in assets/seq
    const pad = i => String(i).padStart(3, '0');
    const imgs = new Array(N);
    let lastIdx = -1;

    const nearest = (idx) => {
      idx = Math.max(0, Math.min(N - 1, Math.round(idx)));
      const ok = im => im && im.complete && im.naturalWidth > 0;
      if (ok(imgs[idx])) return imgs[idx];
      for (let d = 1; d < N; d++) {
        if (ok(imgs[idx - d])) return imgs[idx - d];
        if (ok(imgs[idx + d])) return imgs[idx + d];
      }
      return null;
    };
    const sizeCanvas = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    const draw = (idx) => {
      const im = nearest(idx);
      if (!im) return;
      const cw = canvas.width, ch = canvas.height;
      const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
      const w = im.naturalWidth * s, h = im.naturalHeight * s;
      ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    };

    // Preload the sequence, but only when the studio section gets near — so the
    // 90 frame requests don't compete with the hero video's stream on first paint.
    let preloadStarted = false;
    const startPreload = () => {
      if (preloadStarted) return;
      preloadStarted = true;
      for (let i = 0; i < N; i++) {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => draw(lastIdx < 0 ? 0 : lastIdx); // show current frame once it arrives
        im.src = `assets/seq/s_${pad(i + 1)}.jpg`;
        imgs[i] = im;
      }
    };
    if ('IntersectionObserver' in window) {
      const po = new IntersectionObserver((es) => {
        if (es.some(e => e.isIntersecting)) { startPreload(); po.disconnect(); }
      }, { rootMargin: '120% 0px' });
      po.observe(strack);
    }
    window.addEventListener('load', () => setTimeout(startPreload, 1500));

    const prog = () => {
      const total = strack.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-strack.getBoundingClientRect().top, 0), total);
      return total > 0 ? scrolled / total : 0;
    };
    // Direct draw on every scroll — no requestAnimationFrame dependency, so it
    // works even where rAF is throttled. Only redraws when the frame changes.
    const onScrub = () => {
      const r = strack.getBoundingClientRect();
      if (r.top >= window.innerHeight || r.bottom <= 0) return; // section off-screen
      const p = prog();
      if (sbar) sbar.style.transform = `scaleX(${p})`;
      chapters.forEach(ch => {
        const s = +ch.dataset.start, e = +ch.dataset.end;
        ch.classList.toggle('is-active', p >= s && p < e);
      });
      const idx = Math.round(p * (N - 1));
      if (idx !== lastIdx) { lastIdx = idx; draw(idx); }
    };

    sizeCanvas();
    draw(0);
    window.addEventListener('resize', () => { sizeCanvas(); draw(lastIdx < 0 ? 0 : lastIdx); }, { passive: true });
    window.addEventListener('scroll', onScrub, { passive: true });
    window.addEventListener('load', () => { sizeCanvas(); onScrub(); draw(lastIdx < 0 ? 0 : lastIdx); });
    onScrub();
  }

  /* ---------- contact form (client-side, bilingual) ---------- */
  const form = $('#contactForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = $('#formNote');
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      note.style.color = '#ff8a7a';
      note.textContent = NOTE.invalid[LANG];
      return;
    }
    note.style.color = '';
    note.textContent = NOTE.success[LANG](name.split(' ')[0]);
    form.reset();
  });
})();
