// hooks/useUserRegistrations.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const fetchUserRegistrations = async (userId: string) => {
  const { data, error } = await supabase
    .from('event_registrations')
    .select(`
      id,
      role,
      status,
      hours,
      events:events (
        id,
        title,
        start_time,
        location
      )
    `)
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const useUserRegistrations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['registrations', user?.id],
    queryFn: () => fetchUserRegistrations(user!.id),
    enabled: !!user, // لن يعمل إلا بوجود مستخدم مسجل
  });
};