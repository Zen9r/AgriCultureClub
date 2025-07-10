// src/hooks/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  image_url: string | null;
  category: string | null;
  max_attendees: number | null;
  registered_attendees: number;
}

const fetchEvents = async (): Promise<Event[]> => {
  // 1. Fetch upcoming events
  const oneHourInMs = 60 * 60 * 1000;
  const filterTime = new Date(Date.now() - oneHourInMs).toISOString();

  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .gt('end_time', filterTime)
    .order('start_time', { ascending: true });

  if (eventsError) {
    console.error('Error fetching events:', eventsError);
    throw new Error(eventsError.message);
  }

  if (!eventsData || eventsData.length === 0) {
    return [];
  }

  // 2. Fetch registrations for these events
  const eventIds = eventsData.map(e => e.id);
  
  // --- Robust way to count registrations ---
  const { data: registrations, error: registrationsError } = await supabase
    .from('event_registrations')
    .select('event_id')
    .in('event_id', eventIds)
    .eq('status', 'registered');

  if (registrationsError) {
    console.error('Error fetching registration counts:', registrationsError);
    // We can still proceed, the counts will just be 0
  }

  const countsMap = new Map<number, number>();
  if (registrations) {
    for (const reg of registrations) {
      countsMap.set(reg.event_id, (countsMap.get(reg.event_id) || 0) + 1);
    }
  }
  // --- End of robust counting logic ---

  // 3. Combine data
  const eventsWithCounts = eventsData.map(event => ({
    ...event,
    registered_attendees: countsMap.get(event.id) || 0,
  }));

  return eventsWithCounts;
};

export const useEvents = () => {
  return useQuery<Event[], Error>({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
  });
};
