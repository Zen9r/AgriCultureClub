// src/hooks/useUserProfileData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import type { Profile } from './useProfile'; // نستورد الأنواع من الملفات القديمة
import type { Registration } from './useUserRegistrations';

// تعريف نوع البيانات التي ستعود من الدالة الجديدة
interface UserProfileData {
  profile: Profile | null;
  registrations: Registration[];
  eventHours: number; // الإضافة الجديدة
  extraHours: number; // الإضافة الجديدة
}

const fetchUserProfileData = async (userId: string): Promise<UserProfileData> => {
    const { data, error } = await supabase
        .rpc('get_user_profile_data', { p_user_id: userId });

    if (error) {
        console.error("Error fetching user profile data:", error);
        throw new Error(error.message);
    }
    return data;
};

/**
 * Hook واحد فائق السرعة لجلب كل بيانات صفحة الملف الشخصي في طلب واحد
 */
export const useUserProfileData = () => {
  const { user } = useAuth();
  
  return useQuery<UserProfileData, Error>({
      queryKey: ['userProfileData', user?.id],
      queryFn: () => {
          if (!user?.id) throw new Error("User not authenticated");
          return fetchUserProfileData(user.id);
      },
      enabled: !!user,
      // يمكن إضافة staleTime لتحسين تجربة المستخدم أكثر
      staleTime: 5 * 60 * 1000, // 5 دقائق
  });
};
