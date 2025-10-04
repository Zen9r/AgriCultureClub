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
import { Download, AlertTriangle, CheckCircle, Loader2, Archive, ListChecks, FileText, Clock, User, Calendar, CalendarDays, Link as LinkIcon, ExternalLink } from 'lucide-react';

// --- Types ---
type EventWithTimes = { 
  id: number; 
  title: string; 
  start_time: string; 
  end_time: string; 
  event_reports: { 
    id: string;
    notes: string | null;
    report_url: string | null;
    created_at: string;
    uploaded_by: string;
    certificates_generated: boolean;
    excuses_prepared: boolean;
  }[];
};

type ParticipantProfile = { full_name: string; student_id: string; email: string; phone_number: string; };
type Participant = { role: 'attendee' | 'organizer'; status: 'attended' | 'absent' | 'registered'; profiles: ParticipantProfile; };
type ReportNotesForm = { notes: string; };

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
function EventDetailsView({ event, onReportSubmitted }: { event: EventWithTimes; onReportSubmitted: (eventId: number) => void; }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploaderName, setUploaderName] = useState<string | null>(null);
  const [certificatesGenerated, setCertificatesGenerated] = useState(false);
  const [excusesPrepared, setExcusesPrepared] = useState(false);
  const [updatingChecklist, setUpdatingChecklist] = useState(false);
  const eventDuration = calculateDuration(event.start_time, event.end_time);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('get_event_participants', { event_id_input: event.id });
      if (error) { toast.error("فشل جلب قائمة الحضور."); console.error("RPC Error:", error); } 
      else { setParticipants(data as Participant[]); }
      
      if (event.event_reports.length > 0) {
        const report = event.event_reports[0];
        const uploaderId = report.uploaded_by;
        const { data: uploaderProfile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', uploaderId)
          .single();
        if (!profileError) {
          setUploaderName(uploaderProfile.full_name);
        }
        
        // Set checklist state from database
        setCertificatesGenerated(report.certificates_generated || false);
        setExcusesPrepared(report.excuses_prepared || false);
      }
      setIsLoading(false);
    };
    fetchDetails();
  }, [event.id, event.event_reports]);

  const handleChecklistUpdate = async (field: 'certificates_generated' | 'excuses_prepared', value: boolean) => {
    if (event.event_reports.length === 0) return;
    
    setUpdatingChecklist(true);
    try {
      const reportId = event.event_reports[0].id;
      const { error } = await supabase
        .from('event_reports')
        .update({ [field]: value })
        .eq('id', reportId);

      if (error) throw error;
      
      if (field === 'certificates_generated') {
        setCertificatesGenerated(value);
      } else {
        setExcusesPrepared(value);
      }
      
      toast.success('تم تحديث حالة المهمة');
    } catch (e: any) {
      toast.error('فشل تحديث حالة المهمة');
      console.error(e);
    } finally {
      setUpdatingChecklist(false);
    }
  };

  const attendedCount = participants.filter(p => p.status === 'attended').length;
  const organizersCount = participants.filter(p => p.role === 'organizer').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30 rounded-b-lg space-y-6"
    >
      {/* Event Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock size={16}/>
            <span className="text-xs font-medium">المدة</span>
          </div>
          <p className="text-xl font-bold text-primary">{eventDuration} ساعة</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <CheckCircle size={16}/>
            <span className="text-xs font-medium">الحضور</span>
          </div>
          <p className="text-xl font-bold text-green-600">{attendedCount}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <User size={16}/>
            <span className="text-xs font-medium">المنظمون</span>
          </div>
          <p className="text-xl font-bold text-blue-600">{organizersCount}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar size={16}/>
            <span className="text-xs font-medium">الإجمالي</span>
          </div>
          <p className="text-xl font-bold">{participants.length}</p>
        </motion.div>
      </div>

      {/* Participants Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h4 className="text-lg font-semibold">قائمة المشاركين</h4>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => exportToCSV(participants, event)}
            className="gap-2"
          >
            <Download size={16}/>
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead className="font-semibold">الاسم الكامل</TableHead>
                  <TableHead className="font-semibold">الرقم الجامعي</TableHead>
                  <TableHead className="font-semibold">البريد الإلكتروني</TableHead>
                  <TableHead className="font-semibold">رقم الهاتف</TableHead>
                  <TableHead className="font-semibold">الدور</TableHead>
                  <TableHead className="font-semibold">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p, i) => (
                  <motion.tr 
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <TableCell className="font-medium">{p.profiles?.full_name || '-'}</TableCell>
                    <TableCell>{p.profiles?.student_id || '-'}</TableCell>
                    <TableCell className="text-sm">{p.profiles?.email || '-'}</TableCell>
                    <TableCell>{p.profiles?.phone_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.role === 'organizer' ? 'default' : 'secondary'}>
                        {p.role === 'organizer' ? 'منظم' : 'حضور'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'attended' ? 'success' : 'destructive'}>
                        {p.status === 'attended' ? 'حاضر' : 'غائب'}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Report Information */}
      {event.event_reports.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-lg font-semibold">معلومات التقرير</h4>
          </div>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin"/> : (
            <div className="space-y-3">
              {(() => {
                const report = event.event_reports[0];
                return (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground"/>
                      <span className="text-muted-foreground">تم التوثيق بواسطة:</span>
                      <span className="font-medium">{uploaderName || 'غير معروف'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground"/>
                      <span className="text-muted-foreground">تاريخ التوثيق:</span>
                      <span className="font-medium">{new Date(report.created_at).toLocaleString('ar-SA')}</span>
                    </div>
                    {report.report_url && (
                      <div className="flex items-start gap-2 text-sm">
                        <LinkIcon className="h-4 w-4 text-muted-foreground mt-0.5"/>
                        <span className="text-muted-foreground">رابط التقرير:</span>
                        <a 
                          href={report.report_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline inline-flex items-center gap-1"
                        >
                          عرض التقرير
                          <ExternalLink className="h-3 w-3"/>
                        </a>
                      </div>
                    )}
                    {report.notes && (
                      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-muted-foreground mb-2">الملاحظات:</p>
                        <p className="text-sm bg-white/60 dark:bg-gray-900/20 p-3 rounded-lg">{report.notes}</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Post-Event Tasks Checklist */}
      {event.event_reports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold">مهام ما بعد الفعالية</h4>
          </div>
          
          <div className="space-y-3">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                certificatesGenerated 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={certificatesGenerated}
                onChange={(e) => handleChecklistUpdate('certificates_generated', e.target.checked)}
                disabled={updatingChecklist}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <label className="text-sm font-medium cursor-pointer">
                  إصدار شهادات الحضور
                </label>
                {certificatesGenerated && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1"
                  >
                    <CheckCircle size={12}/>
                    تم الإنجاز
                  </motion.p>
                )}
              </div>
              {updatingChecklist && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600"/>
              )}
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.01 }}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                excusesPrepared 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={excusesPrepared}
                onChange={(e) => handleChecklistUpdate('excuses_prepared', e.target.checked)}
                disabled={updatingChecklist}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="flex-1">
                <label className="text-sm font-medium cursor-pointer">
                  تجهيز أعذار الغياب
                </label>
                {excusesPrepared && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1"
                  >
                    <CheckCircle size={12}/>
                    تم الإنجاز
                  </motion.p>
                )}
              </div>
              {updatingChecklist && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600"/>
              )}
            </motion.div>

            {/* Progress Summary */}
            <div className="pt-3 mt-3 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">التقدم الكلي:</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${((certificatesGenerated ? 1 : 0) + (excusesPrepared ? 1 : 0)) * 50}%` 
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="font-semibold text-primary">
                    {((certificatesGenerated ? 1 : 0) + (excusesPrepared ? 1 : 0)) * 50}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
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
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, event_reports(*)')
        .order('end_time', { ascending: false });
      if (fetchError) throw fetchError;
      setEvents(data);
    } catch (e: any) { setError("فشل جلب الفعاليات"); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  
  const handleReportSubmitted = (eventId: number) => {
    fetchEvents();
  };

  const now = new Date();
  const awaitingReport = events.filter(e => e.event_reports.length === 0 && new Date(e.end_time) < now);
  const archivedEvents = events.filter(e => e.event_reports.length > 0);
  const upcomingEvents = events.filter(e => new Date(e.start_time) > now);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">إدارة تقارير الفعاليات</CardTitle>
              <CardDescription>متابعة وتوثيق تقارير الفعاليات وتصدير بيانات الحضور</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="awaiting" className="w-full">
            <div className="border-b px-4 sm:px-6">
              <TabsList className="w-full sm:w-auto grid grid-cols-3 bg-transparent h-auto p-0 gap-0">
                <TabsTrigger 
                  value="awaiting" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2 px-3 sm:px-6 py-4"
                >
                  <ListChecks className="h-4 w-4"/>
                  <span className="hidden sm:inline">بانتظار التوثيق</span>
                  <span className="sm:hidden">بانتظار</span>
                  <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                    {awaitingReport.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="archive" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2 px-3 sm:px-6 py-4"
                >
                  <Archive className="h-4 w-4"/>
                  <span className="hidden sm:inline">الأرشيف</span>
                  <span className="sm:hidden">أرشيف</span>
                  <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                    {archivedEvents.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="upcoming" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2 px-3 sm:px-6 py-4"
                >
                  <CalendarDays className="h-4 w-4"/>
                  <span className="hidden sm:inline">القادمة</span>
                  <span className="sm:hidden">قادمة</span>
                  <Badge variant="secondary" className="h-5 min-w-5 text-xs">
                    {upcomingEvents.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="awaiting" className="p-4 sm:p-6 mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
                  <p className="text-muted-foreground">جاري تحميل الفعاليات...</p>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4"/>
                  <AlertTitle>خطأ</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : awaitingReport.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ staggerChildren: 0.1 }}
                >
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {awaitingReport.map((e, index) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AccordionItem 
                          value={String(e.id)} 
                          className="border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                        >
                          <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                            <div className="flex w-full justify-between items-center pr-4 gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
                                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="text-right flex-1 min-w-0">
                                  <p className="font-semibold text-base truncate">{e.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    انتهت في: {new Date(e.end_time).toLocaleDateString('ar-SA', { 
                                      day: 'numeric', 
                                      month: 'long', 
                                      year: 'numeric' 
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="destructive" className="gap-1.5 flex-shrink-0 hidden sm:flex">
                                <Clock size={12}/>
                                يحتاج توثيق
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <EventDetailsView event={e} onReportSubmitted={handleReportSubmitted}/>
                          </AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    ))}
                  </Accordion>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                    <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-medium mb-2">رائع! جميع الفعاليات موثقة</p>
                  <p className="text-muted-foreground text-sm">لا توجد فعاليات بانتظار توثيق التقارير</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="archive" className="p-4 sm:p-6 mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
                  <p className="text-muted-foreground">جاري تحميل الأرشيف...</p>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4"/>
                  <AlertTitle>خطأ</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : archivedEvents.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Accordion type="single" collapsible className="w-full space-y-3">
                    {archivedEvents.map((e, index) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <AccordionItem 
                          value={String(e.id)}
                          className="border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                        >
                          <AccordionTrigger className="px-4 sm:px-6 hover:no-underline">
                            <div className="flex w-full justify-between items-center pr-4 gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                                  <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="text-right flex-1 min-w-0">
                                  <p className="font-semibold text-base truncate">{e.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(e.end_time).toLocaleDateString('ar-SA', { 
                                      day: 'numeric', 
                                      month: 'long', 
                                      year: 'numeric' 
                                    })}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="success" className="gap-1.5 flex-shrink-0 hidden sm:flex">
                                <CheckCircle size={12}/>
                                تم التوثيق
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="p-0">
                            <EventDetailsView event={e} onReportSubmitted={handleReportSubmitted}/>
                          </AccordionContent>
                        </AccordionItem>
                      </motion.div>
                    ))}
                  </Accordion>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                    <Archive className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">الأرشيف فارغ</p>
                  <p className="text-muted-foreground text-sm">لا توجد تقارير موثقة في الأرشيف بعد</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="p-4 sm:p-6 mt-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-4"/>
                  <p className="text-muted-foreground">جاري تحميل الفعاليات القادمة...</p>
                </div>
              ) : error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4"/>
                  <AlertTitle>خطأ</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : upcomingEvents.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  {upcomingEvents.map((e, index) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border rounded-lg p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0 mt-0.5">
                            <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base mb-2">{e.title}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar size={14}/>
                                <span>البداية: {new Date(e.start_time).toLocaleDateString('ar-SA', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={14}/>
                                <span>المدة: {calculateDuration(e.start_time, e.end_time)} ساعة</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="gap-1.5 flex-shrink-0">
                          قريباً
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                    <CalendarDays className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium mb-2">لا توجد فعاليات قادمة</p>
                  <p className="text-muted-foreground text-sm">سيتم عرض الفعاليات المخططة هنا</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}