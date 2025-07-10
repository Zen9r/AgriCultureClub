// src/hooks/useProfile.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';

// تعريف وتصدير واجهة البيانات للملف الشخصي
export interface Profile {
  id: string;
  full_name: string;
  student_id: string;
  college: string;
  major: string;
  phone_number: string;
  role: 'member' | 'committee_member' | 'committee_lead' | 'committee_deputy' | 'club_deputy' | 'club_lead' | 'club_supervisor' | 'super_admin';
  committee: 'hr' | 'pr' | 'media' | 'design' | 'logistics' | null;
}

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // إذا لم يجد Supabase أي صف، فإنه يرسل خطأ. نتعامل معه كحالة طبيعية ونرجع null
    if (error.code === 'PGRST116') {
        return null;
    }
    // للأخطاء الأخرى، نقوم بإظهارها
    throw new Error(error.message);
  }
  return data;
};

export const useProfile = () => {
  const { user } = useAuth();

  return useQuery<Profile | null, Error>({
    // مفتاح الكويري يعتمد على هوية المستخدم لضمان عدم تداخل البيانات
    queryKey: ['profile', user?.id],
    queryFn: () => {
        // لا نقم بتشغيل الدالة إذا لم يكن هناك مستخدم
        if (!user?.id) throw new Error("User not authenticated");
        return fetchProfile(user.id);
    },
    // هذا هو السطر السحري: الكويري لن يعمل إلا إذا كان هناك مستخدم مسجل دخوله
    enabled: !!user,
  });
};
