# إعداد Edge Function للبروكسي

تم تحويل البروكسي من Next.js API route إلى Supabase Edge Function لتحسين الأداء وتجاوز قيود الشبكة.

## الملفات المضافة

1. `supabase/functions/supabase-proxy/index.ts` - Edge Function الرئيسي
2. `supabase/functions/supabase-proxy/deno.json` - تكوين Deno
3. `supabase/config.toml` - تكوين Supabase
4. `supabase/README.md` - تعليمات الاستخدام

## الملفات المحدثة

1. `lib/supabaseClient.ts` - محدث لاستخدام Edge Function في الإنتاج

## الملفات المحذوفة

1. `app/api/proxy/[[...path]]/route.ts` - API route القديم

## خطوات النشر

### 1. تثبيت Supabase CLI

```bash
npm install -g supabase
```

### 2. تسجيل الدخول

```bash
supabase login
```

### 3. ربط المشروع

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. إعداد متغيرات البيئة

في Supabase Dashboard > Settings > Edge Functions، أضف:

- `SUPABASE_URL`: رابط مشروعك
- `SUPABASE_ANON_KEY`: المفتاح المجهول

### 5. نشر Edge Function

```bash
supabase functions deploy supabase-proxy
```

## كيفية العمل

- **في التطوير**: يستخدم Next.js API route (`/api/proxy`)
- **في الإنتاج**: يستخدم Supabase Edge Function (`/functions/v1/supabase-proxy`)

## المميزات

✅ **أداء محسن**: Edge Functions تعمل أقرب للمستخدم  
✅ **تجاوز القيود**: تعمل على شبكة Supabase  
✅ **دعم CORS كامل**: لا توجد مشاكل في الطلبات  
✅ **تكلفة أقل**: لا تستهلك موارد Next.js  
✅ **موثوقية عالية**: مدعومة من Supabase  

## اختبار Edge Function

بعد النشر، يمكنك اختبار الـ function:

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/supabase-proxy/auth/v1/token" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"test@example.com","password":"password"}'
```

## استكشاف الأخطاء

إذا واجهت مشاكل:

1. تأكد من نشر الـ function بنجاح
2. تحقق من متغيرات البيئة
3. راجع logs في Supabase Dashboard
4. تأكد من صحة `NEXT_PUBLIC_SUPABASE_URL`
