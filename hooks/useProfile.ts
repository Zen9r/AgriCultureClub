// hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id], // مفتاح الكويري، يعتمد على id المستخدم
    queryFn: () => fetchProfile(user!.id),
    // هذا هو السطر السحري: الكويري لن يعمل إلا إذا كان هناك مستخدم مسجل دخوله
    enabled: !!user,
  });
};