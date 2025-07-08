// hooks/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

// 1. دالة الجلب: وظيفتها فقط جلب البيانات
const fetchEvents = async () => {
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw new Error(error.message);
  return data;
};

// 2. الـ Hook: يربط الدالة بـ TanStack Query
export const useEvents = () => {
  return useQuery({
    queryKey: ['events'], // مفتاح فريد لتخزين هذه البيانات
    queryFn: fetchEvents,
  });
};