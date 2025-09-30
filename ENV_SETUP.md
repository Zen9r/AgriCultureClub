# إعداد متغيرات البيئة

## المشكلة
الموقع لا يعمل لأن ملف `.env.local` غير موجود أو لا يحتوي على المتغيرات المطلوبة.

## الحل

### 1. إنشاء ملف `.env.local`

أنشئ ملف `.env.local` في المجلد الجذر للمشروع:

```bash
touch .env.local
```

### 2. إضافة المتغيرات المطلوبة

افتح ملف `.env.local` وأضف المتغيرات التالية:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site URL (for SSR)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. الحصول على قيم Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى Settings > API
4. انسخ:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. مثال كامل

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 5. إعادة تشغيل الخادم

بعد إضافة المتغيرات:

```bash
npm run dev
```

## ملاحظات مهمة

- ⚠️ **لا تشارك ملف `.env.local`** - يحتوي على مفاتيح حساسة
- ✅ تأكد من أن الملف في المجلد الجذر للمشروع
- ✅ تأكد من عدم وجود مسافات حول علامة `=`
- ✅ تأكد من عدم وجود علامات اقتباس حول القيم
