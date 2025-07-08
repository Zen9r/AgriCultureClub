'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';

// --- Types to match what ProfilePage will pass ---
interface Event {
  id: number;
  title: string;
  location: string | null;
  start_time: string;
}

interface Registration {
  id: number;
  role: string;
  events: Event | null;
}

interface UpcomingEventsTabProps {
  registrations: Registration[];
  isLoading: boolean; // Receive loading state from parent
}

// --- Reusable Event Card Component ---
function EventCard({ registration }: { registration: Registration }) {
  if (!registration.events) return null;

  const { title, location, start_time } = registration.events;
  const startDate = new Date(start_time);
  
  const dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
  const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border rounded-lg p-4 bg-background transition-shadow hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <Badge variant={registration.role === 'organizer' ? 'default' : 'secondary'} className="shrink-0">
          {registration.role === 'organizer' ? 'منظم' : 'حضور'}
        </Badge>
      </div>
      <div className="flex flex-col sm:flex-row gap-x-6 gap-y-2 text-sm mt-3 text-muted-foreground">
        <div className="flex items-center gap-2"><Calendar size={14} /><span>{startDate.toLocaleDateString('ar-SA', dateFormat)}</span></div>
        <div className="flex items-center gap-2"><Clock size={14} /><span>{startDate.toLocaleTimeString('ar-SA', timeFormat)}</span></div>
        {location && <div className="flex items-center gap-2"><MapPin size={14} /><span>{location}</span></div>}
      </div>
    </motion.div>
  );
}

// --- Main Tab Component ---
export default function UpcomingEventsTab({ registrations, isLoading }: UpcomingEventsTabProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>الفعاليات القادمة</CardTitle>
          <CardDescription>قائمة بالفعاليات التي سجلت فيها ولم تبدأ بعد.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : registrations.length > 0 ? (
            <div className="space-y-4">
              {registrations.map((reg) => (
                <EventCard key={reg.id} registration={reg} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4">لا يوجد لديك أي فعاليات قادمة مسجلة.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
