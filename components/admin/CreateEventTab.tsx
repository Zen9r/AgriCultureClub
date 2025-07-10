'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { format } from 'date-fns';

// --- UI Components ---
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PlusCircle, Edit, Loader2, CalendarIcon, Upload, Link as LinkIcon, AlertTriangle, Copy, Check } from 'lucide-react';

// --- Types & Schema ---
type DatabaseEvent = {
  id: number;
  title: string;
  description: string;
  details: string;
  location: string;
  start_time: string;
  end_time: string;
  category: 'ورش عمل' | 'ندوات' | 'معارض' | 'زيارات' | 'دورات تدريبية' | 'اعمال تطوعية' | 'حفلات' | 'مبادرات';
  image_url: string | null;
  organizer_whatsapp_link: string | null;
  max_attendees: number | null;
  check_in_code: string;
};

const eventFormSchema = z.object({
  title: z.string().min(3, "العنوان إجباري."),
  description: z.string().min(10, "الوصف المختصر إجباري."),
  details: z.string().min(20, "التفاصيل الكاملة إجبارية."),
  location: z.string().min(3, "الموقع إجباري."),
  startDate: z.date({ required_error: "تاريخ البدء إجباري." }),
  startHour: z.string({ required_error: "الساعة إجبارية." }),
  startMinute: z.string({ required_error: "الدقيقة إجبارية." }),
  endDate: z.date({ required_error: "تاريخ الانتهاء إجباري." }),
  endHour: z.string({ required_error: "الساعة إجبارية." }),
  endMinute: z.string({ required_error: "الدقيقة إجبارية." }),
  category: z.enum(['ورش عمل', 'ندوات', 'معارض', 'زيارات', 'دورات تدريبية', 'اعمال تطوعية', 'حفلات', 'مبادرات']),
  max_attendees: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number({ invalid_type_error: "الرجاء إدخال رقم صحيح."})
     .int()
     .positive("يجب أن يكون الرقم أكبر من صفر.")
     .optional()
  ),
  image_url: z.string().url("الرابط غير صحيح.").optional().or(z.literal('')),
  organizer_whatsapp_link: z.string().url("رابط الواتساب غير صحيح.").optional().or(z.literal('')),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// --- Helper Functions ---
const combineDateTime = (date: Date, hour: string, minute: string): string => {
  const combined = new Date(date);
  combined.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
  return combined.toISOString();
};

const hoursOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const minutesOptions = ['00', '15', '30', '45'];


// --- Reusable Form Component ---
function EventForm({ mode, initialData, onSubmit, onCancel }: {
  mode: 'create' | 'edit';
  initialData?: Partial<DatabaseEvent>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}) {
    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: {
            title: initialData?.title || '',
            description: initialData?.description || '',
            details: initialData?.details || '',
            location: initialData?.location || '',
            startDate: initialData?.start_time ? new Date(initialData.start_time) : undefined,
            startHour: initialData?.start_time ? format(new Date(initialData.start_time), 'HH') : undefined,
            startMinute: initialData?.start_time ? format(new Date(initialData.start_time), 'mm') : undefined,
            endDate: initialData?.end_time ? new Date(initialData.end_time) : undefined,
            endHour: initialData?.end_time ? format(new Date(initialData.end_time), 'HH') : undefined,
            endMinute: initialData?.end_time ? format(new Date(initialData.end_time), 'mm') : undefined,
            category: initialData?.category,
            max_attendees: initialData?.max_attendees || undefined,
            image_url: initialData?.image_url || '',
            organizer_whatsapp_link: initialData?.organizer_whatsapp_link || '',
        },
    });
    const [isUploading, setIsUploading] = useState(false);

    const handleImageUpload = async (file: File) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
            const filePath = `events/${Date.now()}-${compressedFile.name}`;
            const { error } = await supabase.storage.from('event-images').upload(filePath, compressedFile);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filePath);
            form.setValue('image_url', publicUrl, { shouldValidate: true });
            toast.success("تم رفع الصورة بنجاح.");
        } catch (e) {
            toast.error("فشل رفع الصورة.");
        } finally {
            setIsUploading(false);
        }
    };

    const processSubmit = (data: EventFormValues) => {
        const submissionData = {
            ...data,
            start_time: combineDateTime(data.startDate, data.startHour, data.startMinute),
            end_time: combineDateTime(data.endDate, data.endHour, data.endMinute),
            max_attendees: data.max_attendees || null,
        };
        const { startDate, startTime, endDate, endTime, startHour, startMinute, endHour, endMinute, ...finalData } = submissionData as any;
        onSubmit(finalData);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6">
                <FormField name="title" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>عنوان الفعالية</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="description" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>وصف مختصر</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField name="details" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>التفاصيل الكاملة</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <Separator />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <FormLabel>وقت البدء</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <FormField name="startDate" control={form.control} render={({ field }) => (
                                <FormItem className="flex-1"><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full justify-start text-right font-normal">{field.value ? format(field.value, "PPP") : <span>اختر تاريخ</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                            <div className="flex gap-2 flex-1">
                                <FormField name="startHour" control={form.control} render={({ field }) => (
                                    <FormItem className="w-full"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="الساعة" /></SelectTrigger></FormControl><SelectContent>{hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField name="startMinute" control={form.control} render={({ field }) => (
                                    <FormItem className="w-full"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="الدقيقة" /></SelectTrigger></FormControl><SelectContent>{minutesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <FormLabel>وقت الانتهاء</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <FormField name="endDate" control={form.control} render={({ field }) => (
                                <FormItem className="flex-1"><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full justify-start text-right font-normal">{field.value ? format(field.value, "PPP") : <span>اختر تاريخ</span>}<CalendarIcon className="ml-auto h-4 w-4" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>
                            )}/>
                            <div className="flex gap-2 flex-1">
                                <FormField name="endHour" control={form.control} render={({ field }) => (
                                    <FormItem className="w-full"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="الساعة" /></SelectTrigger></FormControl><SelectContent>{hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField name="endMinute" control={form.control} render={({ field }) => (
                                    <FormItem className="w-full"><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="الدقيقة" /></SelectTrigger></FormControl><SelectContent>{minutesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                    </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="category" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>فئة الفعالية</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger></FormControl><SelectContent>{['ورش عمل', 'ندوات', 'معارض', 'زيارات', 'دورات تدريبية', 'اعمال تطوعية', 'حفلات', 'مبادرات'].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <FormField name="location" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>الموقع</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="max_attendees" control={form.control} render={({ field }) => (
                         <FormItem>
                            <FormLabel>الحد الأقصى للحضور (اختياري)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="50" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField name="organizer_whatsapp_link" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>رابط قروب الواتساب (اختياري)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <div>
                    <FormLabel>صورة الفعالية (اختياري)</FormLabel>
                    <Tabs defaultValue="link"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="link"><LinkIcon className="h-4 w-4 mr-2"/>رابط</TabsTrigger><TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2"/>رفع</TabsTrigger></TabsList>
                        <TabsContent value="link" className="pt-2"><FormField name="image_url" control={form.control} render={({ field }) => (<FormItem><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/></TabsContent>
                        <TabsContent value="upload" className="pt-2"><div className="flex items-center gap-2"><Input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} disabled={isUploading}/>{isUploading && <Loader2 className="h-5 w-5 animate-spin"/>}</div></TabsContent>
                    </Tabs>
                </div>
                <div className="flex gap-2 pt-4">
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : mode === 'create' ? <PlusCircle className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}{mode === 'create' ? 'إنشاء الفعالية' : 'تحديث الفعالية'}</Button>
                    {mode === 'edit' && <Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button>}
                </div>
            </form>
        </Form>
    );
}

// --- Main Management Component ---
export default function EventManagementTab() {
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [activeTab, setActiveTab] = useState('manage');
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setEvents(data as DatabaseEvent[]);
    } catch (e: any) { setError("فشل في جلب الفعاليات."); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async (data: any) => {
    const { error } = await supabase.from('events').insert({ ...data, check_in_code: Math.floor(100000 + Math.random() * 900000).toString() });
    if (error) { toast.error(error.message); } 
    else { toast.success("تم إنشاء الفعالية."); await fetchEvents(); setActiveTab('manage'); }
  };
  
  const handleUpdate = async (data: any) => {
    if (!selectedEvent) return;
    const { error } = await supabase.from('events').update(data).eq('id', selectedEvent.id);
    if (error) { toast.error(error.message); }
    else { toast.success("تم تحديث الفعالية."); setMode('create'); setSelectedEvent(null); await fetchEvents(); setActiveTab('manage'); }
  };
  
  const handleEditClick = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setMode('edit');
    setActiveTab('form');
  };
  
  const handleCancelEdit = () => {
    setMode('create');
    setSelectedEvent(null);
    setActiveTab('manage');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("تم نسخ الرمز!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="manage">إدارة الفعاليات</TabsTrigger>
        <TabsTrigger value="form">{mode === 'create' ? 'إنشاء فعالية جديدة' : 'تعديل الفعالية'}</TabsTrigger>
      </TabsList>
      <TabsContent value="manage" className="mt-6">
        <Card>
          <CardHeader><CardTitle>الفعاليات المنشأة</CardTitle><CardDescription>قائمة بالفعاليات التي تم إنشاؤها.</CardDescription></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
             : error ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>خطأ</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
             : <Accordion type="single" collapsible className="w-full">
                 {events.map(event => (
                   <AccordionItem key={event.id} value={String(event.id)}>
                     <AccordionTrigger>
                       <div className="flex justify-between items-center w-full pr-4"><span>{event.title}</span><span className="text-sm text-muted-foreground">{format(new Date(event.start_time), 'yyyy/MM/dd')}</span></div>
                     </AccordionTrigger>
                     <AccordionContent className="space-y-4">
                       <div className="flex flex-wrap items-center justify-between gap-4">
                         <div className="flex items-center gap-2">
                            <p className="font-mono text-lg p-2 bg-secondary rounded-md">{event.check_in_code}</p>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(event.check_in_code)}>
                               {copiedCode === event.check_in_code ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                            </Button>
                         </div>
                         <Button variant="outline" size="sm" onClick={() => handleEditClick(event)}><Edit className="h-4 w-4 mr-2"/>تعديل</Button>
                       </div>
                     </AccordionContent>
                   </AccordionItem>
                 ))}
               </Accordion>
            }
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="form" className="mt-6">
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'إنشاء فعالية جديدة' : 'تعديل الفعالية'}</CardTitle>
                <CardDescription>املأ جميع الحقول المطلوبة لإنشاء أو تعديل فعالية.</CardDescription>
            </CardHeader>
            <CardContent>
                <EventForm 
                    key={selectedEvent ? `edit-${selectedEvent.id}` : 'create'}
                    mode={mode}
                    initialData={selectedEvent || undefined}
                    onSubmit={mode === 'create' ? handleCreate : handleUpdate}
                    onCancel={handleCancelEdit}
                />
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}