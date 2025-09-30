// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or anonymous key are missing in .env.local file. Check variable names.");
}

// دالة ذكية لتحديد الرابط الكامل للبروكسي
const getProxyUrl = () => {
  // استخدم API route في جميع البيئات (تطوير وإنتاج)
  if (typeof window !== 'undefined') {
    // في المتصفح، استخدم الرابط الحالي
    return `${window.location.origin}/api/proxy`;
  }
  
  // في SSR، استخدم رابط الموقع من متغير البيئة
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/proxy`;
};

// استخدام API route كبروكسي في جميع البيئات
const proxyUrl = getProxyUrl();

export const supabase = createClient(proxyUrl, supabaseAnonKey);