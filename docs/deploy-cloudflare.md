# نشر موقع Track ولوحة التحكّم على Cloudflare

دليل عملي خطوة بخطوة. المستودع: `https://github.com/trak-1/web-trak`

---

## 1) رفع الكود إلى GitHub
تم إعداد git محليًا. للرفع (من مجلد `D:\track-website`):

```bash
git push -u origin main
```

> إن طلب اسم مستخدم/كلمة مرور: استخدم اسم مستخدم GitHub، وكـ"كلمة مرور" استخدم **Personal Access Token** (من GitHub → Settings → Developer settings → Personal access tokens).

## 2) إنشاء مشروع Cloudflare Pages
1. ادخل لوحة Cloudflare: <https://dash.cloudflare.com>
2. **Workers & Pages** → **Create** → تبويب **Pages** → **Connect to Git**.
3. اختر مستودع **web-trak**.
4. الإعدادات:
   - Framework preset: **None**
   - Build command: **(اتركه فارغًا)**
   - Build output directory: **/**
5. **Save and Deploy**. سيعطيك رابطًا مثل `https://web-trak.pages.dev`.

## 3) إنشاء قاعدة البيانات (KV)
1. **Storage & Databases** → **KV** → **Create a namespace** → الاسم: `TRACK_CONTENT`.
2. انسخ **Namespace ID** والصقه في ملف `wrangler.toml` مكان `REPLACE_WITH_KV_ID`.
3. اربطه بالمشروع: **Pages → web-trak → Settings → Bindings → Add → KV namespace**
   - Variable name: `TRACK_CONTENT`
   - KV namespace: `TRACK_CONTENT`

## 4) ضبط كلمة المرور والمفتاح السرّي
**Pages → web-trak → Settings → Variables and secrets → Add**، أضف اثنين كـ **Secret**:
- `ADMIN_PASSWORD` = كلمة مرور الدخول للوحة التحكّم (اختر واحدة قوية).
- `SESSION_SECRET` = نص عشوائي طويل. لتوليده:
  ```bash
  node -e "console.log(crypto.randomUUID()+crypto.randomUUID())"
  ```

## 5) إعادة النشر
بعد إضافة الربط والأسرار: **Deployments → أعد النشر (Retry/Redeploy)** حتى تُفعّل الإعدادات.

## 6) (اختياري) تعبئة المحتوى مسبقًا
لا حاجة عادةً — الموقع يعرض المحتوى الافتراضي تلقائيًا، وأول حفظ من لوحة التحكّم ينشئ السجل. إن أردت التعبئة يدويًا: **KV → TRACK_CONTENT → Add entry**، المفتاح `content` والقيمة محتوى JSON.

## 7) الاستخدام
- الموقع: `https://web-trak.pages.dev`
- لوحة التحكّم: `https://web-trak.pages.dev/admin/` — ادخل بكلمة المرور، عدّل، احفظ.
- التغييرات قد تظهر خلال دقيقة (طبيعة KV).

## 8) نطاق مخصّص (لاحقًا)
**Pages → web-trak → Custom domains** لربط نطاق مثل `trak.com`.

---

### التحقق السريع بعد النشر
```bash
BASE=https://web-trak.pages.dev
curl -s $BASE/api/content | head -c 200                 # يرجع JSON المحتوى
curl -s -o /dev/null -w "%{http_code}\n" -X PUT $BASE/api/content -d '{}'   # 401 (بدون دخول)
```
