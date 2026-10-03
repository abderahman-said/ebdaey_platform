# Ebdaey Edge Worker — Wildcard Subdomains + OG Previews

هذا الـ Worker هو واجهة كل النطاق `ebdaey.com`. وظيفته:

1. **يدعم النطاقات الفرعية المتعددة للمنتورين** (`<mentor>.ebdaey.com`)
   عن طريق إعادة التوجيه الداخلي إلى Lovable (لأن Lovable ما يدعمش
   wildcard custom domains مباشرةً).
2. **يظهر صورة + عنوان + وصف صحيحين** لما تشارك أي لينك على
   WhatsApp / Facebook / Twitter / LinkedIn / Telegram.
3. **يحوّل اللينكات القديمة** (`ebdaey.com/<mentor>/...`) للنطاق الجديد
   (`<mentor>.ebdaey.com/...`) مع الحفاظ على معاينة المشاركة للزواحف.
4. يفصل لوحات التحكم على `app.ebdaey.com` و `admin.ebdaey.com`.

النشر كله من **Cloudflare Dashboard** — مفيش terminal، مفيش `wrangler`.

> ⚠️ **شرط أساسي:** النطاق `ebdaey.com` لازم يكون على Cloudflare
> (Nameservers محوّلة لـ Cloudflare). لو لسه على Lovable مباشرة، أضفه أولاً
> من Cloudflare: Add Site → ebdaey.com → Free → غيّر NS عند مسجّل النطاق →
> استنى propagation.

---

## 1) Wildcard DNS

في Cloudflare → **DNS → Records**، تأكد عندك:

| Type | Name | Content              | Proxy |
|------|------|----------------------|-------|
| A    | `@`  | `185.158.133.1`      | ✅ Proxied (برتقالي) |
| A    | `www`| `185.158.133.1`      | ✅ Proxied |
| A    | `*`  | `185.158.133.1`      | ✅ Proxied |
| A    | `app`| `185.158.133.1`      | ✅ Proxied |
| A    | `admin`| `185.158.133.1`    | ✅ Proxied |
| CNAME | `lovable-origin` | `ebdaey.lovable.app` | ❌ DNS only (رمادي) |

السطر `*` هو اللي بيوفّر كل النطاقات الفرعية لكل المنتورين.
لازم كلها **Proxied** عشان Cloudflare SSL يغطي `*.ebdaey.com` تلقائيًا.

`app` و `admin` ممكن تستغني عنهم لو حابب الـ wildcard `*` يغطيهم —
لكن لو حابب تتأكد من الأولوية، اتركهم.

مهم جدًا: `lovable-origin` لازم يكون **DNS only** وليس Proxied؛ الـ Worker يستخدمه داخليًا كـ origin alias عشان يمنع تحويل `.lovable.app` إلى `ebdaey.com`.

---

## 2) إنشاء الـ Worker

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**
2. الاسم: `ebdaey` → **Deploy**
3. بعد الـ Deploy، اضغط **Edit code**.
4. امسح كل الكود الافتراضي.
5. افتح ملف `cloudflare-worker/src/worker.ts` من المشروع، انسخ محتواه بالكامل
   والصقه في المحرر → **Save and deploy**.

### لو ظهر خطأ `Unexpected token 'export'`

هذا يعني أن الـ Worker عندك ما زال بنظام Cloudflare القديم **Service Worker**،
وليس ES Modules. في هذه الحالة لا تلصق `worker.ts`؛ الصق بدلًا منه محتوى:

```txt
cloudflare-worker/src/worker-legacy.js
```

هذا الملف هو نفس المنطق لكن بدون `export` وبدون TypeScript، ويعمل مباشرةً مع
الـ Workers القديمة التي تستخدم `addEventListener("fetch", ...)`.

---

## 3) Variables

في صفحة الـ Worker → **Settings** → **Variables and Secrets** → أضف هذه كـ **Plain text**:

| Name | Value |
|------|-------|
| `ORIGIN_HOST` | `ebdaey.lovable.app` |
| `SITE_URL` | `https://ebdaey.com` |
| `SUPABASE_URL` | `https://hnrcibzgoziqvtsiepws.supabase.co` |
| `SUPABASE_ANON_KEY` | (الـ anon key — public/آمن) |

ثم **Save and deploy**.

> ملاحظة: الكود الحالي يستخدم `lovable-origin.ebdaey.com` داخليًا عبر `resolveOverride`. اترك `ORIGIN_HOST` كما هو لو كان موجودًا، لكنه لم يعد هو الذي يحل مشكلة التحويل.

---

## 4) Routes

في صفحة الـ Worker → **Settings** → **Domains & Routes** → **Add** → **Route**:

| Zone | Route |
|------|-------|
| `ebdaey.com` | `ebdaey.com/*` |
| `ebdaey.com` | `www.ebdaey.com/*` |
| `ebdaey.com` | `*.ebdaey.com/*` |

السطر الأخير هو اللي بيخلي الـ Worker يعالج كل المنتورين + `app.` + `admin.`.

---

## 5) Lovable Auth

في Lovable Cloud → **Users** → **Auth settings** → Site URL & Redirect URLs،
ضيف:

- `https://ebdaey.com/**`
- `https://*.ebdaey.com/**`
- `https://app.ebdaey.com/**`
- `https://admin.ebdaey.com/**`

لو Google sign-in مفعّل: في Google Cloud Console → OAuth client → Authorized
redirect URIs، ضيف نفس القائمة.

---

## 6) اختبار

### تأكيد أن الـ Worker يعمل فعلاً (مهم جدًا)

شغل الأمر ده في الـ terminal:

```bash
curl -sSI https://marjini.ebdaey.com/ | grep -i x-ebdaey-worker
```

- **لو شفت** `x-ebdaey-worker: mentor-proxy` → الـ Worker شغّال ✅
- **لو الناتج فاضي** → الـ Worker **مش متربط بالـ route** ❌
  والطلب بيروح مباشرة لـ Lovable اللي بيعمل 302 لـ `ebdaey.com`.

#### الحل لو الـ Worker مش شغّال

في Cloudflare Dashboard → Workers & Pages → افتح الـ Worker `ebdaey`
→ **Settings → Domains & Routes → Add**:

| Zone | Route |
|------|-------|
| `ebdaey.com` | `ebdaey.com/*` |
| `ebdaey.com` | `www.ebdaey.com/*` |
| `ebdaey.com` | `*.ebdaey.com/*` ← **ده اللي بيغطي مرجيني وكل المنتورين** |

كمان تأكد إن:
- DNS فيه سطر `A * → 185.158.133.1 Proxied (برتقالي)`
- DNS فيه سطر `CNAME lovable-origin → ebdaey.lovable.app DNS only (رمادي)`
- الـ Worker code المنشور هو نسخة `worker-legacy.js` الأخيرة (Save and deploy)

### اختبار وظيفي

1. `https://marjini.ebdaey.com` — لازم تشوف صفحة المنتور (مش الصفحة الرئيسية).
2. `https://marjini.ebdaey.com/course/<slug>` — صفحة الكورس.
3. اللينك القديم `https://ebdaey.com/marjini` — يتحوّل لـ `marjini.ebdaey.com`.
4. شارك لينك على WhatsApp/Facebook → لازم تشوف الصورة والعنوان.
5. لو لينك قديم متخزّن، استعمل:
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter/X: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/
   - WhatsApp: امسح المحادثة وأعد إرسال اللينك.

---

## التحديث لاحقاً

لو اتعدّل `cloudflare-worker/src/worker.ts`:

1. ادخل الـ Worker → **Edit code**
2. الصق المحتوى الجديد → **Save and deploy**

لو الـ Worker قديم وسبق وظهر خطأ `Unexpected token 'export'`، حدّثه من
`cloudflare-worker/src/worker-legacy.js` بدل `worker.ts`.

---

## ملاحظات تقنية

- **عزل الجلسات**: كل نطاق فرعي (origin) معزول في المتصفح تلقائيًا —
  تسجيل دخول طالب على `mentor-a.ebdaey.com` ما يتنقلش لـ `mentor-b.ebdaey.com`.
- **الـ Worker شفاف للمستخدم العادي**: يعدّي الطلب لـ Lovable مع تعديل
  Host header. شريط العنوان في المتصفح يفضل يعرض النطاق الفرعي.
- **fail-open**: لو فيه خطأ في الـ Worker، الطلب يعدّي للأصل من غير
  معاينة (المستخدم ما يلاحظش).
- `SUPABASE_ANON_KEY` آمن في الكود لأنه public بطبيعته (RLS يحمي البيانات).
