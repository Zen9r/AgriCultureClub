'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { cn } from '@/lib/utils';

// --- UI Components ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, AlertTriangle, CheckCircle, Loader2, Archive, ListChecks, FileText, Clock, User, Calendar } from 'lucide-react';

// --- Types ---
type EventWithTimes = { id: number; title: string; start_time: string; end_time: string; report_id: string | null; };
type ParticipantProfile = { full_name: string; student_id: string; email: string; phone_number: string; };
type Participant = { role: 'attendee' | 'organizer'; status: 'attended' | 'absent' | 'registered'; profiles: ParticipantProfile; };
type ReportNotesForm = { notes: string; };
type ReportDetails = { notes: string | null; created_at: string; uploaded_by: string; uploader_name?: string; };

// --- Helper Functions ---
const calculateDuration = (start: string, end: string): string => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    if (isNaN(diffMs) || diffMs < 0) return '0.0';
    return (diffMs / (1000 * 60 * 60)).toFixed(1);
};
const exportToCSV = (participants: Participant[], event: EventWithTimes) => {
  if (!participants || participants.length === 0) { toast.error('لا يوجد مشاركين لتصديرهم.'); return; }
  const headers = ['الاسم الكامل', 'الرقم الجامعي', 'البريد الإلكتروني', 'رقم الهاتف', 'الدور', 'الحالة'];
  const rows = participants.map(p => {
    const profile = p.profiles;
    const name = `"${profile?.full_name?.replace(/"/g, '""') || '-'}"`;
    const studentId = `"${profile?.student_id || '-'}"`;
    const email = `"${profile?.email || '-'}"`;
    const phone = `"${profile?.phone_number || '-'}"`;
    const role = p.role === 'organizer' ? '"منظم"' : '"حضور"';
    const status = p.status === 'attended' ? '"حاضر"' : p.status === 'absent' ? '"غائب"' : '"مسجل"';
    return [name, studentId, email, phone, role, status].join(',');
  });
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `report-${event.title.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Details View Component ---
function EventDetailsView({ event, onReportSubmitted }: { event: EventWithTimes; onReportSubmitted: (eventId: number, newReportId: string) => void; }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [reportDetails, setReportDetails] = useState<ReportDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ReportNotesForm>({
    defaultValues: { notes: '' }
  });
  const eventDuration = calculateDuration(event.start_time, event.end_time);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_event_participants', { event_id_input: event.id });
      if (error) { toast.error("فشل جلب قائمة الحضور."); console.error("RPC Error:", error); } 
      else { setParticipants(data as Participant[]); }
      
      if (event.report_id) {
        const { data: reportData, error: reportError } = await supabase.from('event_reports').select('notes, created_at, uploaded_by').eq('id', event.report_id).single();
        if (!reportError && reportData) {
            // **تصحيح**: جلب اسم الموثِّق في طلب منفصل لتجنب المشاكل
            const { data: uploaderProfile, error: profileError } = await supabase.from('profiles').select('full_name').eq('id', reportData.uploaded_by).single();
            if(!profileError) {
                setReportDetails({ ...reportData, uploader_name: uploaderProfile.full_name });
            } else {
                setReportDetails(reportData); // Show details even if uploader name fails
            }
        }
      }
      setIsLoading(false);
    };
    fetchDetails();
  }, [event.id, event.report_id]);

  const onMarkAsReported: SubmitHandler<ReportNotesForm> = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      const { data: report, error: reportError } = await supabase.from('event_reports').insert({ event_id: event.id, notes: formData.notes, uploaded_by: user.id }).select('id').single();
      if (reportError) throw reportError;
      const { error: eventUpdateError } = await supabase.from('events').update({ report_id: report.id }).eq('id', event.id);
      if (eventUpdateError) throw eventUpdateError;
      toast.success('تم توثيق التقرير بنجاح!');
      onReportSubmitted(event.id, report.id);
    } catch (e: any) {
      toast.error(e.message || 'فشل توثيق التقرير.');
    }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg space-y-6">
      <div>
        <div className="flex justify-between items-center mb-2"><h4 className="text-lg font-semibold">قائمة الحضور</h4><Badge variant="secondary" className="flex items-center gap-2"><Clock size={14}/><span>مدة الفعالية: {eventDuration} ساعات</span></Badge></div>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin"/> : (
          <>
            <div className="overflow-x-auto border rounded-lg"><Table className="min-w-[800px]"><TableHeader><TableRow><TableHead>الاسم الكامل</TableHead><TableHead>الرقم الجامعي</TableHead><TableHead>البريد الإلكتروني</TableHead><TableHead>رقم الهاتف</TableHead><TableHead>الدور</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader><TableBody>{participants.map((p, i) => (<TableRow key={i}><TableCell>{p.profiles?.full_name || '-'}</TableCell><TableCell>{p.profiles?.student_id || '-'}</TableCell><TableCell>{p.profiles?.email || '-'}</TableCell><TableCell>{p.profiles?.phone_number || '-'}</TableCell><TableCell>{p.role === 'organizer' ? 'منظم' : 'حضور'}</TableCell><TableCell>{p.status === 'attended' ? 'حاضر' : 'غائب'}</TableCell></TableRow>))}</TableBody></Table></div>
            <Button variant="outline" className="mt-4" onClick={() => exportToCSV(participants, event)}><Download className="ml-2 h-4 w-4"/> تصدير CSV</Button>
          </>
        )}
      </div>
      {event.report_id ? (
          <div className="pt-6 border-t"><h4 className="text-lg font-semibold mb-2">معلومات التوثيق</h4>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> :
              reportDetails ? (<div className="text-sm space-y-2 text-muted-foreground"><p className="flex items-center gap-2"><User size={14}/> <strong>تم التوثيق بواسطة:</strong> {reportDetails.uploader_name || 'غير معروف'}</p><p className="flex items-center gap-2"><Calendar size={14}/> <strong>تاريخ التوثيق:</strong> {new Date(reportDetails.created_at).toLocaleString('ar-SA')}</p>{reportDetails.notes && <p><strong>الملاحظات:</strong> {reportDetails.notes}</p>}</div>)
              : <p className="text-sm text-red-500">لم يتم العثور على تفاصيل التقرير.</p>}
          </div>
      ) : (
        <div className="pt-6 border-t"><h4 className="text-lg font-semibold mb-2">تسجيل إنجاز التقرير</h4><form onSubmit={handleSubmit(onMarkAsReported)} className="space-y-4"><div><label htmlFor={`notes-${event.id}`} className="text-sm font-medium">ملاحظات (اختياري)</label><Textarea id={`notes-${event.id}`} {...register('notes')}/></div><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2"/> : <CheckCircle className="h-4 w-4 ml-2"/>}توثيق التقرير</Button></form></div>
      )}
    </div>
  );
}

// --- Main Tab Component ---
export default function ReportsTab() {
  const [events, setEvents] = useState<EventWithTimes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.from('events').select('id, title, start_time, end_time, report_id').order('end_time', { ascending: false });
      if (fetchError) throw fetchError;
      setEvents(data);
    } catch (e: any) { setError("فشل جلب الفعاليات"); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  
  const handleReportSubmitted = (eventId: number, newReportId: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, report_id: newReportId } : e));
  };

  const now = new Date();
  const awaitingReport = events.filter(e => !e.report_id && new Date(e.end_time) < now);
  const archivedEvents = events.filter(e => e.report_id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader><CardTitle>توثيق تقارير الفعاليات</CardTitle><CardDescription>متابعة وتوثيق تقارير الفعاليات المنتهية وتصدير بيانات الحضور.</CardDescription></CardHeader>
        <CardContent>
          <Tabs defaultValue="awaiting">
            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="awaiting"><ListChecks className="ml-2 h-4 w-4"/>بانتظار التوثيق ({awaitingReport.length})</TabsTrigger><TabsTrigger value="archive"><Archive className="ml-2 h-4 w-4"/>الأرشيف ({archivedEvents.length})</TabsTrigger></TabsList>
            <TabsContent value="awaiting" className="pt-4">
              {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
               : error ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>{error}</AlertTitle></Alert>
               : awaitingReport.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {awaitingReport.map(e => (
                    <AccordionItem value={String(e.id)} key={e.id}>
                      <AccordionTrigger><div className="flex w-full justify-between pr-4"><p className="font-semibold">{e.title}</p><p className="text-sm text-muted-foreground">{new Date(e.end_time).toLocaleDateString('ar-SA')}</p></div></AccordionTrigger>
                      <AccordionContent><EventDetailsView event={e} onReportSubmitted={handleReportSubmitted}/></AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
               ) : <p className="text-center text-muted-foreground py-8">لا توجد فعاليات بانتظار توثيق تقريرها.</p>}
            </TabsContent>
            <TabsContent value="archive" className="pt-4">
               {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
               : error ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>{error}</AlertTitle></Alert>
               : archivedEvents.length > 0 ? (
                 <Accordion type="single" collapsible className="w-full">
                  {archivedEvents.map(e => (
                    <AccordionItem value={String(e.id)} key={e.id}>
                      <AccordionTrigger>
                        <div className="flex w-full justify-between items-center pr-4">
                          <div><p className="font-semibold">{e.title}</p><p className="text-sm text-muted-foreground">{new Date(e.end_time).toLocaleDateString('ar-SA')}</p></div>
                          <Badge variant="success" className="gap-2"><FileText size={14}/>تم التوثيق</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent><EventDetailsView event={e} onReportSubmitted={handleReportSubmitted}/></AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
               ) : <p className="text-center text-muted-foreground py-8">لا توجد تقارير في الأرشيف.</p>}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
