// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  throw new Error("Supabase anonymous key is missing in .env.local file.");
}

// دالة ذكية لتحديد الرابط الكامل للبروكسي
const getProxyUrl = () => {
  // إذا كان الكود يعمل في المتصفح، يمكننا الحصول على الرابط الحالي مباشرة
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/proxy`;
  }
  
  // إذا كان الكود يعمل في الخادم (أثناء البناء أو SSR)
  // استخدم متغير بيئة مخصص. إذا لم يكن موجودًا، استخدم رابط محلي للتطوير
  // **مهم:** يجب إضافة NEXT_PUBLIC_SITE_URL=http://localhost:3000 في ملف .env.local
  // وعند النشر على Vercel, أضف متغير NEXT_PUBLIC_SITE_URL برابط موقعك
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/proxy`;
};

const supabaseUrl = getProxyUrl();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);