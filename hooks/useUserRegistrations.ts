// src/hooks/useUserRegistrations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

// --- الواجهات (Interfaces) ---
// واجهة للفعالية نفسها (مستخدمة داخل التسجيل)
export interface EventForRegistration {
  id: number;
  title: string;
  start_time: string;
  location: string;
  role: 'attendee' | 'organizer';
}

// واجهة للتسجيل الواحد
export interface Registration {
  id: number;
  role: string;
  status: string;
  hours: number | null;
  events: EventForRegistration | null;
  
}

// واجهة للفعالية الكاملة (مستخدمة في عملية الإنشاء)
// نستوردها من ملف useEvents لضمان عدم التكرار
import type { Event as FullEvent } from './useEvents';


// =================================================================
// ١. HOOK لقراءة بيانات التسجيل (Query)
// =================================================================
const fetchUserRegistrations = async (userId: string): Promise<Registration[]> => {
    const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id, role, status, hours,
          events (id, title, start_time, location)
        `)
        .eq('user_id', userId)
        .order('start_time', { foreignTable: 'events', ascending: false });

    if (error) {
        throw new Error(error.message);
    }
    return (data as unknown as Registration[]) || [];
};

/**
 * Hook لجلب قائمة بكل الفعاليات التي سجل فيها المستخدم الحالي.
 */
export const useUserRegistrations = () => {
    const { user } = useAuth();
    
    return useQuery<Registration[], Error>({
        queryKey: ['userRegistrations', user?.id],
        queryFn: () => {
            if (!user?.id) throw new Error("User not authenticated");
            return fetchUserRegistrations(user.id);
        },
        enabled: !!user,
    });
};


// =================================================================
// ٢. HOOK لكتابة بيانات التسجيل (Mutation)
// =================================================================
interface RegistrationParams {
  eventId: number;
  userId: string;
  event: FullEvent; // نستخدم الواجهة الكاملة هنا للتحقق من عدد المقاعد
}

const registerForEvent = async ({ eventId, userId, event }: RegistrationParams) => {
  const { data: existingRegistration } = await supabase
    .from('event_registrations')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingRegistration) throw new Error('أنت مسجل بالفعل في هذه الفعالية.');

  if (event.max_attendees && event.registered_attendees >= event.max_attendees) {
    throw new Error('عذراً، المقاعد لهذه الفعالية ممتلئة.');
  }

  const { error: insertError } = await supabase
    .from('event_registrations')
    .insert([{ user_id: userId, event_id: eventId, status: 'registered' }]);

  if (insertError) throw new Error(insertError.message);

  return { success: true };
};

/**
 * Hook لتنفيذ عملية تسجيل المستخدم في فعالية جديدة.
 * يتضمن تحديثاً فورياً للواجهة (Optimistic Update).
 */
export const useEventRegistration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerForEvent,
    onMutate: async (newRegistration) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previousEvents = queryClient.getQueryData<FullEvent[]>(['events']);
      queryClient.setQueryData<FullEvent[]>(['events'], (oldData = []) =>
        oldData.map(event =>
          event.id === newRegistration.eventId
            ? { ...event, registered_attendees: event.registered_attendees + 1 }
            : event
        )
      );
      return { previousEvents };
    },
    onError: (err: Error, newRegistration, context: any) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['events'], context.previousEvents);
      }
      toast.error(err.message || 'حدث خطأ أثناء التسجيل.');
    },
    onSettled: () => {
      // بعد انتهاء العملية، نحدث كلاً من قائمة الفعاليات (لتحديث العداد)
      // وقائمة تسجيلات المستخدم (لإضافة الفعالية الجديدة في بروفايله)
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['userRegistrations'] });
    },
    onSuccess: () => {
        toast.success('تم تسجيلك بنجاح!');
    }
  });
};