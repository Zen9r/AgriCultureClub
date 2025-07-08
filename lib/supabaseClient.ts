import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// هذا السطر سيعطيك خطأ واضحاً في المستقبل إذا كان هناك مشكلة في ملف .env.local
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or anonymous key are missing in .env.local file. Check variable names.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)