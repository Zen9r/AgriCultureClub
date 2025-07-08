import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

const fetchEvents = async () => {
  // ... نفس كود جلب الفعاليات الذي كتبته سابقاً ...
  const { data, error } = await supabase.from('events').select('*');
  if (error) throw new Error(error.message);
  return data;
}

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  });
}