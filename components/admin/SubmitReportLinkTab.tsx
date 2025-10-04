'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- UI Components ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Loader2, Link as LinkIcon, ExternalLink, CheckCircle, Calendar, Clock, AlertTriangle, Send } from 'lucide-react';

// --- Types ---
type EventWithoutReport = {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
};

type ReportSubmissionForm = {
  report_url: string;
  notes?: string;
};

const reportSchema = z.object({
  report_url: z.string()
    .url("الرجاء إدخال رابط صحيح (يجب أن يبدأ بـ http:// أو https://)")
    .min(1, "رابط التقرير مطلوب"),
  notes: z.string().optional(),
});

// --- Main Component ---
export default function SubmitReportLinkTab() {
  const [events, setEvents] = useState<EventWithoutReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventWithoutReport | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ReportSubmissionForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      report_url: '',
      notes: '',
    },
  });

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, event_reports(id)')
        .order('end_time', { ascending: false });

      if (error) throw error;

      // Filter to only show events that have ended but don't have a report
      const now = new Date();
      const eventsNeedingReports = (data || [])
        .filter((e: any) => {
          const hasNoReport = !e.event_reports || e.event_reports.length === 0;
          const hasEnded = new Date(e.end_time) < now;
          return hasNoReport && hasEnded;
        })
        .map(({ event_reports, ...event }: any) => event);

      setEvents(eventsNeedingReports);
    } catch (e: any) {
      toast.error('فشل جلب الفعاليات');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenDialog = (event: EventWithoutReport) => {
    setSelectedEvent(event);
    form.reset({ report_url: '', notes: '' });
    setIsDialogOpen(true);
  };

  const onSubmit: SubmitHandler<ReportSubmissionForm> = async (data) => {
    if (!selectedEvent) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const { error } = await supabase
        .from('event_reports')
        .insert({
          event_id: selectedEvent.id,
          report_url: data.report_url,
          notes: data.notes || null,
          uploaded_by: user.id,
        });

      if (error) throw error;

      toast.success('تم رفع رابط التقرير بنجاح!');
      setIsDialogOpen(false);
      setSelectedEvent(null);
      form.reset();
      fetchEvents(); // Refresh the list
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء رفع التقرير');
      console.error(e);
    }
  };

  const calculateDaysAgo = (endTime: string): string => {
    const end = new Date(endTime);
    const now = new Date();
    const diffTime = now.getTime() - end.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'منذ يوم واحد';
    if (diffDays === 2) return 'منذ يومين';
    if (diffDays < 11) return `منذ ${diffDays} أيام`;
    return `منذ ${diffDays} يوماً`;
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <LinkIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl">رفع روابط التقارير</CardTitle>
              <CardDescription>إضافة روابط التقارير للفعاليات المنتهية</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
              <p className="text-muted-foreground">جاري تحميل الفعاليات...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-3">
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  يوجد <strong>{events.length}</strong> فعالية تحتاج إلى رفع رابط التقرير
                </AlertDescription>
              </Alert>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-3"
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
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0 mt-0.5">
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1 truncate">{event.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              {calculateDaysAgo(event.end_time)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="flex-shrink-0"/>
                            <span className="truncate">
                              انتهت: {new Date(event.end_time).toLocaleDateString('ar-SA', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="flex-shrink-0"/>
                            <span className="truncate">
                              {new Date(event.end_time).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleOpenDialog(event)}
                        size="sm"
                        className="gap-2 flex-shrink-0"
                      >
                        <LinkIcon size={16}/>
                        <span className="hidden sm:inline">رفع الرابط</span>
                        <span className="sm:hidden">رفع</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-lg font-medium mb-2">رائع! جميع التقارير مرفوعة</p>
              <p className="text-muted-foreground text-sm">
                لا توجد فعاليات تحتاج إلى رفع رابط تقرير حالياً
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Report Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl">رفع رابط التقرير</DialogTitle>
            <DialogDescription className="text-base pt-2">
              {selectedEvent && (
                <span className="font-medium text-foreground">{selectedEvent.title}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="report_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">رابط التقرير *</FormLabel>
                    <FormDescription className="text-sm">
                      أدخل رابط التقرير (مثال: رابط تغريدة، منشور، أو صفحة ويب)
                    </FormDescription>
                    <div className="relative">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://twitter.com/..."
                          className="pr-10 h-11 text-base"
                          dir="ltr"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormDescription className="text-sm">
                      أي ملاحظات إضافية عن التقرير
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="مثال: تم نشر التقرير على تويتر..."
                        rows={3}
                        className="resize-none text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Preview Link */}
              {form.watch('report_url') && form.formState.errors.report_url === undefined && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
                >
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        معاينة الرابط:
                      </p>
                      <a
                        href={form.watch('report_url')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {form.watch('report_url')}
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full sm:w-auto gap-2"
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الرفع...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      رفع الرابط
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

