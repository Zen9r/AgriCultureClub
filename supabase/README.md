# Supabase Edge Functions

هذا المجلد يحتوي على Edge Functions لـ Supabase.

## Edge Function: supabase-proxy

هذه الـ Edge Function تعمل كبروكسي لجميع طلبات Supabase، مما يساعد على تجاوز قيود الشبكة.

### كيفية النشر

1. تأكد من تثبيت Supabase CLI:
```bash
npm install -g supabase
```

2. سجل دخولك إلى Supabase:
```bash
supabase login
```

3. اربط المشروع بـ Supabase:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. انشر الـ Edge Function:
```bash
supabase functions deploy supabase-proxy
```

### متغيرات البيئة المطلوبة

تأكد من إضافة المتغيرات التالية في Supabase Dashboard > Settings > Edge Functions:

- `SUPABASE_URL`: رابط مشروع Supabase
- `SUPABASE_ANON_KEY`: المفتاح المجهول لـ Supabase

### كيفية الاستخدام

بعد النشر، سيتم إنشاء رابط Edge Function في النموذج:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/supabase-proxy/
```

قم بتحديث `lib/supabaseClient.ts` لاستخدام هذا الرابط بدلاً من `/api/proxy`.

### المميزات

- ✅ يعمل على Edge (أقرب للمستخدم)
- ✅ أداء محسن
- ✅ دعم CORS كامل
- ✅ تجاوز قيود الشبكة
- ✅ دعم جميع HTTP methods
- ✅ معالجة الأخطاء المحسنة
