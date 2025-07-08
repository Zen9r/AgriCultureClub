'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileUp, Download, AlertTriangle, CheckCircle, Loader2, Archive, ListChecks, FileText } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';

// --- Types ---
type SimpleEvent = { id: number; title: string; end_time: string; report_id: string | null; };
type Participant = {
  profiles: { full_name: string; }[] | null;
  role: 'attendee' | 'organizer';
  status: 'attended' | 'absent' | 'registered';
};
type ReportForm = { reportFile: FileList; notes: string; };

// --- Helper Functions & Components ---
const exportToCSV = (participants: Participant[], eventName: string) => {
  if (!participants || participants.length === 0) {
    toast.error('لا يوجد مشاركين لتصديرهم.');
    return;
  }
  const headers = ['الاسم الكامل', 'الدور', 'الحالة'];
  const rows = participants.map(p => [
    `"${p.profiles?.[0]?.full_name || 'غير معروف'}"`,
    p.role === 'organizer' ? '"منظم"' : '"حضور"',
    p.status === 'attended' ? '"حاضر"' : p.status === 'absent' ? '"غائب"' : '"مسجل"'
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(','), ...rows.join('\n')].join('\n');
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `report-${eventName.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Details View Component ---
function EventDetailsView({ event }: { event: SimpleEvent }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<ReportForm>();

  useEffect(() => {
    const fetchParticipants = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`role, status, profiles(full_name)`)
        .eq('event_id', event.id);
      if (!error) setParticipants(data as Participant[]);
      setIsLoading(false);
    };
    fetchParticipants();
  }, [event.id]);

  const onUploadSubmit: SubmitHandler<ReportForm> = async (formData) => {
    const file = formData.reportFile[0];
    if (!file) { toast.error('الرجاء اختيار ملف PDF.'); return; }

    try {
      const filePath = `reports/${event.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('event-reports').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('event-reports').getPublicUrl(filePath);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: report, error: reportError } = await supabase.from('event_reports')
        .insert({ event_id: event.id, report_file_url: publicUrl, notes: formData.notes, uploaded_by: user.id })
        .select('id').single();
      if (reportError) throw reportError;

      const { error: eventUpdateError } = await supabase.from('events').update({ report_id: report.id }).eq('id', event.id);
      if (eventUpdateError) throw eventUpdateError;
      
      toast.success('تم رفع التقرير بنجاح!');
      reset();
      // Here you might want a callback to refresh the main event list
    } catch (e: any) {
      toast.error(e.message || 'فشل رفع التقرير.');
    }
  };

  return (
    <div className="mt-4 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 space-y-6">
      <div>
        <h4 className="text-lg font-semibold mb-2">قائمة الحضور: {event.title}</h4>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>الاسم</TableHead><TableHead>الدور</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
              <TableBody>
                {participants.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.profiles?.[0]?.full_name || 'غير معروف'}</TableCell>
                    <TableCell>{p.role === 'organizer' ? 'منظم' : 'حضور'}</TableCell>
                    <TableCell>{p.status === 'attended' ? 'حاضر' : 'غائب'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" className="mt-4" onClick={() => exportToCSV(participants, event.title)}>
              <Download className="ml-2 h-4 w-4" /> تصدير إلى CSV
            </Button>
          </>
        )}
      </div>
      {!event.report_id && (
        <div className="pt-6 border-t">
          <h4 className="text-lg font-semibold mb-2">رفع التقرير النهائي</h4>
          <form onSubmit={handleSubmit(onUploadSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="reportFile">ملف التقرير (PDF)</Label>
              <Input id="reportFile" type="file" {...register('reportFile', { required: true })} accept=".pdf" />
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea id="notes" {...register('notes')} />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <FileUp className="h-4 w-4 ml-2" />}
              رفع وحفظ التقرير
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export default function ReportsTab() {
  const [events, setEvents] = useState<SimpleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.from('events').select('id, title, end_time, report_id').order('end_time', { ascending: false });
        if (error) throw error;
        setEvents(data);
      } catch (e: any) { setError("فشل جلب الفعاليات"); } finally { setIsLoading(false); }
    };
    fetchEvents();
  }, []);
  
  const now = new Date();
  const awaitingReport = events.filter(e => !e.report_id && new Date(e.end_time) < now);
  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>إدارة تقارير الفعاليات</CardTitle>
          <CardDescription>متابعة، تصدير، ورفع تقارير الفعاليات المنتهية.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="awaiting">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="awaiting"><ListChecks className="ml-2 h-4 w-4"/>بانتظار التقرير ({awaitingReport.length})</TabsTrigger>
              <TabsTrigger value="archive"><Archive className="ml-2 h-4 w-4" />أرشيف التقارير</TabsTrigger>
            </TabsList>
            <TabsContent value="awaiting" className="pt-4">
              {awaitingReport.length > 0 ? awaitingReport.map(e => (
                <div key={e.id} className="p-3 mb-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border" onClick={() => setSelectedEventId(selectedEventId === e.id ? null : e.id)}>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted-foreground">انتهت في: {new Date(e.end_time).toLocaleDateString('ar-SA')}</p>
                  {selectedEventId === e.id && selectedEvent && <EventDetailsView event={selectedEvent} />}
                </div>
              )) : <p className="text-center text-muted-foreground py-8">لا توجد فعاليات بانتظار التقرير.</p>}
            </TabsContent>
            <TabsContent value="archive" className="pt-4">
               {events.map(e => (
                <div key={e.id} className="p-3 mb-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border flex justify-between items-center">
                  <div>
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-muted-foreground">انتهت في: {new Date(e.end_time).toLocaleDateString('ar-SA')}</p>
                  </div>
                  {e.report_id ? 
                    <Badge variant="success" className="gap-2"><FileText size={14} /> تم رفع التقرير</Badge> 
                    : <Badge variant="destructive" className="gap-2"><AlertTriangle size={14}/>لم يتم الرفع</Badge> 
                  }
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
