// Single source of truth for the site's default content. The content API
// returns this whenever KV has no `content` yet, so the site works before the
// admin's first save. Kept as a plain JS object (no JSON import) for maximum
// compatibility with the Cloudflare Workers bundler.
export const DEFAULT_CONTENT = {
  version: 1,
  site: {
    brandTag: { ar: 'إنتاج فني', en: 'Art Production' },
    heroEyebrow: { ar: 'إنتاج سمعي بصري · الرياض · Track', en: 'Audio-Visual Production · Riyadh · تراك' },
    heroTitle1: { ar: 'كل المسارات', en: 'All tracks' },
    heroTitle2Html: { ar: 'تؤدي <em>إلينا</em>', en: 'lead to <em>us</em>' },
    heroSub: {
      ar: 'إبداعٌ يستحق كل لحظة. دار إنتاج سعودية تحوّل الأفكار إلى فعاليات وصوتٍ وفيلم — منذ ثلاثة عشر عامًا.',
      en: 'Creativity worth every moment. A Saudi production house turning ideas into events, sound, and film — for thirteen years.',
    },
    aboutHeadingHtml: {
      ar: 'ليست السنوات وحدها — بل <em>الخبرة</em> التي بنتها السنوات.',
      en: "It's not just the years — it's the <em>expertise</em> the years built.",
    },
    aboutLead: {
      ar: 'تراك شركة سعودية متخصصة في الإنتاج السمعي البصري. نخطّط للفعالية من الفكرة الأولى إلى اللقطة الأخيرة، ونُهندس الصوت الذي يحملها، ونصوّر الفيلم الذي يبقى بعد انتهاء الليلة.',
      en: 'Track is a Saudi company built for audio-visual production. We plan an event from the first idea to the final frame, engineer the sound that carries it, and shoot the film that outlives the night.',
    },
    aboutBody: {
      ar: 'فريق واحد يدير السلسلة كاملة — الإخراج والتصوير والصوت والمونتاج — حتى لا يضيع شيء بين مرحلة وأخرى. هكذا تبقى اللحظة صادقة من الغرفة التي حدثت فيها إلى الشاشة التي تعيش عليها.',
      en: "One team runs the whole chain — direction, capture, audio, and edit — so nothing gets lost in a handoff. That's how a moment stays true from the room it happened in to the screen it lives on.",
    },
    contact: {
      email: 'info@trackksa.com',
      phone: '+966 50 034 4410',
      address: { ar: 'الرياض · شارع الأمير بندر بن عبدالعزيز', en: 'Riyadh · Prince Bandar Bin Abdulaziz St.' },
    },
    footerTag: { ar: 'إبداعٌ يستحق كل لحظة.', en: 'Creativity worth every moment.' },
    heroVideo: '', // optional /media/... URL; when set, plays as the hero background
    heroSlides: ['assets/img/corridor-800.jpg', 'assets/img/audio-studio-800.jpg', 'assets/img/vocal-booth-800.jpg'],
  },
  stats: [
    { id: 'yrs', number: 13, suffix: '+', label: { ar: 'سنة في المجال', en: 'Years in the field' } },
    { id: 'proj', number: 120, suffix: '+', label: { ar: 'مشروع وشراكة', en: 'Projects & partnerships' } },
    { id: 'srv', number: 560, suffix: '+', label: { ar: 'خدمة قُدّمت', en: 'Services delivered' } },
    { id: 'team', number: 20, suffix: '+', label: { ar: 'مبدع في الفريق', en: 'Creatives on the team' } },
  ],
  services: [],
  works: [],
  testimonials: [],
};
