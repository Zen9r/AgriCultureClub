'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Loader2, CalendarPlus, Download, Sparkles, Zap, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Separator } from '@/components/ui/separator';

// --- Types ---
interface Event {
  id: number;
  title: string;
  location: string | null;
  start_time: string;
  end_time: string;
}

interface Registration {
  id: number;
  role: string;
  events: Event | null;
}

interface UpcomingEventsTabProps {
  registrations: Registration[];
  isLoading: boolean;
}

// --- Helper Functions ---
const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const targetDate = new Date(dateString);
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 7) {
    return `خلال ${diffDays} يوم`;
  } else if (diffDays === 1) {
    const time = targetDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `غداً في ${time}`;
  } else if (diffDays === 0 && diffHours > 0) {
    return `اليوم خلال ${diffHours} ساعة`;
  } else if (diffDays === 0 && diffMinutes > 0) {
    return `خلال ${diffMinutes} دقيقة`;
  } else if (diffDays === 0 && diffMinutes <= 0) {
    return 'قريباً جداً!';
  } else {
    return `خلال ${diffDays} أيام`;
  }
};

const generateICSFile = (event: Event): void => {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Club Events//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location || ''}`,
    `DESCRIPTION:فعالية نادي علوم الأغذية والزراعة`,
    `UID:${event.id}@club-events.com`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  toast.success('تم تنزيل ملف التقويم بنجاح!');
};

const generateGoogleCalendarLink = (event: Event): string => {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  const formatGoogleDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: 'فعالية نادي علوم الأغذية والزراعة',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// --- Compact Mobile Event Card ---
function MobileEventCard({ registration }: { registration: Registration }) {
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (!registration.events) return;
    
    setRelativeTime(getRelativeTime(registration.events.start_time));
    
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(registration.events!.start_time));
    }, 60000);

    return () => clearInterval(interval);
  }, [registration.events]);

  if (!registration.events) return null;

  const { title, location, start_time } = registration.events;
  const startDate = new Date(start_time);
  const isOrganizer = registration.role === 'organizer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className={`rounded-xl p-4 transition-all ${
        isOrganizer
          ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-400 dark:border-blue-600 shadow-lg'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md'
      }`}
    >
      {/* Top Row: Countdown & Role Badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="outline" className="gap-1.5 text-xs bg-white/50 dark:bg-gray-900/50">
          <Sparkles className="h-3 w-3 text-amber-500" />
          {relativeTime}
        </Badge>
        
        {isOrganizer && (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white gap-1">
            <Zap className="h-3 w-3 fill-white" />
            منظم
          </Badge>
        )}
      </div>

      {/* Event Title */}
      <h3 className="text-xl font-bold mb-3 leading-tight text-gray-900 dark:text-white">
        {title}
      </h3>

      {/* Details Grid */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
            <Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
          <span className="font-medium">
            {startDate.toLocaleDateString('ar-SA', { 
              weekday: 'long',
              day: 'numeric', 
              month: 'long'
            })}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="font-medium">
            {startDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
        
        {location && (
          <div className="flex items-center gap-2 text-sm">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
              <MapPin className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-medium line-clamp-1">{location}</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <Button
        onClick={() => setShowActions(!showActions)}
        variant="outline"
        className="w-full h-12 gap-2 touch-manipulation font-semibold"
      >
        {showActions ? 'إخفاء الخيارات' : 'إضافة للتقويم'}
        <ChevronRight className={`h-4 w-4 transition-transform ${showActions ? 'rotate-90' : ''}`} />
      </Button>

      {/* Calendar Actions (Expandable) */}
      {showActions && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-3 pt-3 border-t space-y-2"
        >
          <Button
            size="sm"
            variant="secondary"
            onClick={() => generateICSFile(registration.events!)}
            className="w-full gap-2 h-11 touch-manipulation"
          >
            <Download className="h-4 w-4" />
            تنزيل (.ics)
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const link = generateGoogleCalendarLink(registration.events!);
              window.open(link, '_blank');
            }}
            className="w-full gap-2 h-11 touch-manipulation"
          >
            <CalendarPlus className="h-4 w-4" />
            Google Calendar
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// --- Main Component ---
export default function UpcomingEventsTab({ registrations, isLoading }: UpcomingEventsTabProps) {
  // Sort by start time (nearest first)
  const sortedRegistrations = [...registrations].sort((a, b) => {
    if (!a.events || !b.events) return 0;
    return new Date(a.events.start_time).getTime() - new Date(b.events.start_time).getTime();
  });

  // Separate organizer and attendee events
  const organizerEvents = sortedRegistrations.filter(r => r.role === 'organizer');
  const attendeeEvents = sortedRegistrations.filter(r => r.role !== 'organizer');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-800/50 dark:to-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-md">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">الفعاليات القادمة</CardTitle>
              <CardDescription className="text-sm">
                {sortedRegistrations.length} {sortedRegistrations.length === 1 ? 'فعالية' : 'فعاليات'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : sortedRegistrations.length > 0 ? (
            <div className="space-y-6">
              {/* Organizer Events Section */}
              {organizerEvents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-sm uppercase tracking-wide text-blue-600">
                      مهامك كمنظم ({organizerEvents.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {organizerEvents.map((reg) => (
                      <MobileEventCard key={reg.id} registration={reg} />
                    ))}
                  </div>
                </div>
              )}

              {/* Separator */}
              {organizerEvents.length > 0 && attendeeEvents.length > 0 && (
                <Separator className="my-6" />
              )}

              {/* Attendee Events Section */}
              {attendeeEvents.length > 0 && (
                <div>
                  {organizerEvents.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="h-4 w-4 text-green-600" />
                      <h3 className="font-bold text-sm uppercase tracking-wide text-green-600">
                        فعالياتك كحضور ({attendeeEvents.length})
                      </h3>
                    </div>
                  )}
                  <div className="space-y-3">
                    {attendeeEvents.map((reg) => (
                      <MobileEventCard key={reg.id} registration={reg} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Calendar className="h-14 w-14 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">لا توجد فعاليات قادمة</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                لم تسجل في أي فعاليات قادمة بعد. تصفح صفحة الفعاليات للانضمام!
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
