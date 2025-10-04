'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// --- UI Components ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle, AlertTriangle, Calendar, Clock, MapPin, FileText } from 'lucide-react';

// --- Types ---
type UpcomingEvent = {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  is_pre_report_submitted: boolean;
};

const UNIVERSITY_FORM_URL = 'https://university.example.com/pre-event-form'; // Placeholder URL

export default function PreEventReportsTab() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchUpcomingEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, location')
        .gt('start_time', now)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Map data and add is_pre_report_submitted with default false if column doesn't exist
      const eventsWithStatus = (data || []).map(event => ({
        ...event,
        is_pre_report_submitted: (event as any).is_pre_report_submitted || false
      }));
      
      setEvents(eventsWithStatus);
    } catch (e: any) {
      toast.error('فشل جلب الفعاليات القادمة');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  const handleMarkAsSubmitted = async (eventId: number) => {
    setSubmittingId(eventId);
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_pre_report_submitted: true })
        .eq('id', eventId);

      if (error) {
        // If column doesn't exist, show helpful error message
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          toast.error('يرجى إضافة العمود is_pre_report_submitted إلى جدول events في قاعدة البيانات');
          console.error('Database column missing. Run: ALTER TABLE events ADD COLUMN is_pre_report_submitted BOOLEAN DEFAULT false;');
        } else {
          throw error;
        }
      } else {
        toast.success('تم تحديد التقرير كمُرسَل بنجاح!');
        fetchUpcomingEvents(); // Refresh the list
      }
    } catch (e: any) {
      toast.error(e.message || 'فشل تحديث حالة التقرير');
      console.error(e);
    } finally {
      setSubmittingId(null);
    }
  };

  const calculateDaysUntil = (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays === 2) return 'بعد يومين';
    if (diffDays < 11) return `بعد ${diffDays} أيام`;
    return `بعد ${diffDays} يوماً`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-xl">تقارير ما قبل الفعاليات</CardTitle>
              <CardDescription>
                إدارة التقارير المطلوبة من الجامعة قبل انعقاد الفعاليات
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {/* Database Setup Notice */}
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              <strong>ملاحظة:</strong> لتفعيل ميزة "تحديد كمُرسَل"، يرجى تشغيل الأمر التالي في قاعدة البيانات:
              <code className="block mt-2 p-2 bg-amber-100 dark:bg-amber-900/40 rounded text-xs font-mono" dir="ltr">
                ALTER TABLE events ADD COLUMN is_pre_report_submitted BOOLEAN DEFAULT false;
              </code>
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
              <p className="text-muted-foreground">جاري تحميل الفعاليات القادمة...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Alert */}
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  يوجد <strong>{events.length}</strong> فعالية قادمة،{' '}
                  <strong>{events.filter(e => !e.is_pre_report_submitted).length}</strong>{' '}
                  منها تحتاج إلى رفع التقرير المسبق
                </AlertDescription>
              </Alert>

              {/* Events List */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4"
              >
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    className="border rounded-lg p-4 sm:p-5 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Event Title and Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                              event.is_pre_report_submitted 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-orange-100 dark:bg-orange-900/30'
                            }`}>
                              {event.is_pre_report_submitted ? (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base mb-1 truncate">{event.title}</h3>
                              <p className="text-xs text-muted-foreground">
                                {calculateDaysUntil(event.start_time)}
                              </p>
                            </div>
                          </div>
                          
                          {event.is_pre_report_submitted ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0 gap-1.5">
                              <CheckCircle size={12}/>
                              تم الإرسال
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex-shrink-0 gap-1.5">
                              <AlertTriangle size={12}/>
                              يحتاج تقرير
                            </Badge>
                          )}
                        </div>

                        {/* Event Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="flex-shrink-0"/>
                            <span className="truncate">
                              {new Date(event.start_time).toLocaleDateString('ar-SA', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="flex-shrink-0"/>
                            <span className="truncate">
                              {new Date(event.start_time).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <MapPin size={14} className="flex-shrink-0"/>
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex sm:flex-col gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 flex-1 sm:flex-none"
                          onClick={() => window.open(UNIVERSITY_FORM_URL, '_blank')}
                        >
                          <ExternalLink size={16}/>
                          <span className="hidden sm:inline">الانتقال لنموذج الجامعة</span>
                          <span className="sm:hidden">النموذج</span>
                        </Button>
                        
                        {!event.is_pre_report_submitted && (
                          <Button
                            size="sm"
                            className="gap-2 flex-1 sm:flex-none"
                            onClick={() => handleMarkAsSubmitted(event.id)}
                            disabled={submittingId === event.id}
                          >
                            {submittingId === event.id ? (
                              <>
                                <Loader2 size={16} className="animate-spin"/>
                                <span className="hidden sm:inline">جاري الحفظ...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16}/>
                                <span className="hidden sm:inline">تحديد كمُرسَل</span>
                                <span className="sm:hidden">إرسال</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Submitted Confirmation */}
                    {event.is_pre_report_submitted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 pt-3 border-t border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                          <CheckCircle size={14}/>
                          <span>تم رفع التقرير المسبق للجامعة</span>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Calendar className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">لا توجد فعاليات قادمة</p>
              <p className="text-muted-foreground text-sm">
                سيتم عرض الفعاليات القادمة التي تحتاج تقارير مسبقة هنا
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

