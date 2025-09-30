# إصلاح سريع للموقع

## المشكلة
الموقع لا يعمل بسبب عدم وجود ملف `.env.local` مع متغيرات Supabase.

## الحل السريع

### 1. أنشئ ملف `.env.local`

```bash
# في المجلد الجذر للمشروع
touch .env.local
```

### 2. أضف المتغيرات التالية

افتح `.env.local` وأضف:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. احصل على القيم من Supabase

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. Settings > API
4. انسخ:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. أعد تشغيل الخادم

```bash
npm run dev
```

## ملاحظة
- في التطوير: يستخدم Supabase مباشرة
- في الإنتاج: يستخدم Edge Function
