// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or anonymous key are missing in .env.local file. Check variable names.");
}

// دالة ذكية لتحديد الرابط الكامل للبروكسي
const getProxyUrl = () => {
  // في الإنتاج، استخدم Edge Function
  if (process.env.NODE_ENV === 'production') {
    return `${supabaseUrl}/functions/v1/supabase-proxy`;
  }
  
  // في التطوير، استخدم API route للبروكسي
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/proxy`;
  }
  
  // في SSR، استخدم رابط محلي
  return `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/proxy`;
};

// استخدام Edge Function كبروكسي
const proxyUrl = getProxyUrl();

export const supabase = createClient(proxyUrl, supabaseAnonKey);