'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { format } from 'date-fns';

// --- UI Components ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlusCircle, Edit, Loader2, CalendarIcon, Upload, Link as LinkIcon,
  ArrowRight, ArrowLeft, Search, Clock, MapPin, Users, ChevronRight,
  Copy, Check, Trash, Calendar as CalendarClockIcon
} from 'lucide-react';

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
  description: z.string().min(1, "الوصف المختصر إجباري."),
  details: z.string().min(1, "التفاصيل الكاملة إجبارية."),
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

// --- Multi-Step Wizard Component ---
function EventWizardForm({ mode, initialData, onSubmit, onCancel, currentStep, setCurrentStep }: {
  mode: 'create' | 'edit';
  initialData?: Partial<DatabaseEvent>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const totalSteps = 3;
    
    const form = useForm<EventFormValues>({
        resolver: zodResolver(eventFormSchema),
        mode: 'onChange',
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

    // Step validation
    const validateStep = async (step: number): Promise<boolean> => {
        const fieldsToValidate: (keyof EventFormValues)[] = [];
        if (step === 1) fieldsToValidate.push('title', 'category', 'description', 'details');
        if (step === 2) fieldsToValidate.push('location', 'startDate', 'startHour', 'startMinute', 'endDate', 'endHour', 'endMinute');
        return await form.trigger(fieldsToValidate as any);
    };

    const handleNext = async () => {
        const isValid = await validateStep(currentStep);
        if (isValid && currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

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
        const { startDate, endDate, startHour, startMinute, endHour, endMinute, ...finalData } = submissionData as any;
        onSubmit(finalData);
    };

    const progressPercentage = (currentStep / totalSteps) * 100;

    return (
        <Form {...form}>
            {/* Progress Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">
                        الخطوة {currentStep} من {totalSteps}
                    </p>
                    <p className="text-sm font-medium text-primary">
                        {currentStep === 1 && 'التفاصيل الأساسية'}
                        {currentStep === 2 && 'الموقع والوقت'}
                        {currentStep === 3 && 'إعدادات متقدمة'}
                    </p>
                </div>
                <Progress value={progressPercentage} className="h-2" />
            </div>

            <form onSubmit={form.handleSubmit(processSubmit)} className="space-y-6">
                <AnimatePresence mode="wait">
                    {/* Step 1: Core Details */}
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 pb-4">
                                <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-lg">
                                    <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">التفاصيل الأساسية</h3>
                                    <p className="text-sm text-muted-foreground">العنوان والوصف والفئة</p>
                                </div>
                            </div>

                            <FormField name="title" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">عنوان الفعالية *</FormLabel>
                                    <FormDescription>اختر عنواناً جذاباً ووصفياً</FormDescription>
                                    <FormControl>
                                        <Input {...field} className="h-12 text-base" placeholder="مثال: ورشة الزراعة المستدامة" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField name="category" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">فئة الفعالية *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-12">
                                                <SelectValue placeholder="اختر فئة" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {['ورش عمل', 'ندوات', 'معارض', 'زيارات', 'دورات تدريبية', 'اعمال تطوعية', 'حفلات', 'مبادرات'].map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField name="description" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">وصف مختصر *</FormLabel>
                                    <FormDescription>وصف قصير يظهر في قائمة الفعاليات</FormDescription>
                                    <FormControl>
                                        <Textarea {...field} rows={3} className="resize-none" placeholder="مثال: ورشة عمل تفاعلية لتعلم أساسيات الزراعة المستدامة..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField name="details" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">التفاصيل الكاملة *</FormLabel>
                                    <FormDescription>التفاصيل التي تظهر في صفحة الفعالية</FormDescription>
                                    <FormControl>
                                        <Textarea {...field} rows={6} className="resize-none" placeholder="أضف تفاصيل كاملة عن المحتوى، الأهداف، المتطلبات..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </motion.div>
                    )}

                    {/* Step 2: Logistics */}
                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 pb-4">
                                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
                                    <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">الموقع والوقت</h3>
                                    <p className="text-sm text-muted-foreground">المكان والتوقيت المناسب</p>
                                </div>
                            </div>

                            <FormField name="location" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">الموقع *</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-12 text-base" placeholder="مثال: قاعة المؤتمرات - الدور الثاني" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-blue-600" />
                                        <FormLabel className="text-base m-0">وقت البدء *</FormLabel>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <FormField name="startDate" control={form.control} render={({ field }) => (
                                            <FormItem className="sm:col-span-1">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" className="w-full justify-start h-11">
                                                                {field.value ? format(field.value, "PPP") : <span>اختر تاريخ</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField name="startHour" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="الساعة" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField name="startMinute" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="الدقيقة" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {minutesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </div>

                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-purple-600" />
                                        <FormLabel className="text-base m-0">وقت الانتهاء *</FormLabel>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <FormField name="endDate" control={form.control} render={({ field }) => (
                                            <FormItem className="sm:col-span-1">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" className="w-full justify-start h-11">
                                                                {field.value ? format(field.value, "PPP") : <span>اختر تاريخ</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField name="endHour" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="الساعة" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField name="endMinute" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="الدقيقة" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {minutesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Advanced Options */}
                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 pb-4">
                                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">إعدادات متقدمة</h3>
                                    <p className="text-sm text-muted-foreground">الصورة والحدود والروابط</p>
                                </div>
                            </div>

                            <FormField name="max_attendees" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">الحد الأقصى للحضور (اختياري)</FormLabel>
                                    <FormDescription>اتركه فارغاً إذا لم يكن هناك حد أقصى</FormDescription>
                                    <FormControl>
                                        <Input type="number" placeholder="50" {...field} value={field.value ?? ''} className="h-11" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <FormField name="organizer_whatsapp_link" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base">رابط قروب الواتساب للمنظمين (اختياري)</FormLabel>
                                    <FormDescription>للمسجلين كمنظمين فقط</FormDescription>
                                    <FormControl>
                                        <Input {...field} className="h-11" dir="ltr" placeholder="https://chat.whatsapp.com/..." />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>

                            <div>
                                <FormLabel className="text-base">صورة الفعالية (اختياري)</FormLabel>
                                <Tabs defaultValue="link" className="mt-2">
                                    <TabsList className="grid w-full grid-cols-2 h-12">
                                        <TabsTrigger value="link" className="gap-2">
                                            <LinkIcon className="h-4 w-4"/>
                                            رابط مباشر
                                        </TabsTrigger>
                                        <TabsTrigger value="upload" className="gap-2">
                                            <Upload className="h-4 w-4"/>
                                            رفع صورة
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="link" className="pt-3">
                                        <FormField name="image_url" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input {...field} className="h-11" dir="ltr" placeholder="https://example.com/image.jpg" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}/>
                                    </TabsContent>
                                    <TabsContent value="upload" className="pt-3">
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} 
                                                disabled={isUploading}
                                                className="h-11"
                                            />
                                            {isUploading && <Loader2 className="h-5 w-5 animate-spin"/>}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                    {currentStep > 1 && (
                        <Button type="button" variant="outline" onClick={handlePrevious} className="gap-2">
                            <ArrowRight className="h-4 w-4" />
                            السابق
                        </Button>
                    )}
                    
                    {currentStep < totalSteps ? (
                        <Button type="button" onClick={handleNext} className="flex-1 gap-2">
                            التالي
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button 
                            type="button"
                            onClick={form.handleSubmit(processSubmit)}
                            className="flex-1 gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600" 
                            disabled={form.formState.isSubmitting}
                        >
                            {form.formState.isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    جاري الحفظ...
                                </>
                            ) : (
                                <>
                                    {mode === 'create' ? <PlusCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                    {mode === 'create' ? 'إنشاء الفعالية' : 'حفظ التعديلات'}
                                </>
                            )}
                        </Button>
                    )}

                    {mode === 'edit' && (
                        <Button type="button" variant="ghost" onClick={onCancel}>
                            إلغاء
                        </Button>
                    )}
                </div>
            </form>
        </Form>
    );
}

// --- Main Management Component ---
export default function EventManagementTab() {
  const [events, setEvents] = useState<DatabaseEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('manage');
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<DatabaseEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase.from('events').select('*').order('start_time', { ascending: false });
        if (error) throw error;
        setEvents(data as DatabaseEvent[]);
    } catch (e: any) { 
        toast.error("فشل في جلب الفعاليات."); 
    } finally { 
        setIsLoading(false); 
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async (data: any) => {
    const { error } = await supabase.from('events').insert({ 
        ...data, 
        check_in_code: Math.floor(100000 + Math.random() * 900000).toString() 
    });
    if (error) { 
        toast.error(error.message); 
    } else { 
        toast.success("تم إنشاء الفعالية بنجاح!"); 
        await fetchEvents(); 
        setActiveTab('manage'); 
    }
  };
  
  const handleUpdate = async (data: any) => {
    if (!selectedEvent) return;
    const { error } = await supabase.from('events').update(data).eq('id', selectedEvent.id);
    if (error) { 
        toast.error(error.message); 
    } else { 
        toast.success("تم تحديث الفعالية بنجاح!"); 
        setMode('create'); 
        setSelectedEvent(null); 
        await fetchEvents(); 
        setActiveTab('manage'); 
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    const confirm = window.confirm("هل أنت متأكد من حذف الفعالية؟ لا يمكن التراجع.");
    if (!confirm) return;

    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
        toast.error("فشل الحذف: " + error.message);
    } else {
        toast.success("تم حذف الفعالية بنجاح.");
        await fetchEvents();
    }
  };

  const handleEditClick = (event: DatabaseEvent) => {
    setSelectedEvent(event);
    setMode('edit');
    setCurrentStep(1);
    setActiveTab('form');
  };
  
  const handleCancelEdit = () => {
    setMode('create');
    setSelectedEvent(null);
    setCurrentStep(1);
    setActiveTab('manage');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentStep(1);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    toast.success("تم نسخ كود التحقق!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter events based on search
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = filteredEvents.filter(e => new Date(e.start_time) >= now);
  const pastEvents = filteredEvents.filter(e => new Date(e.start_time) < now);

  return (
    <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        dir="rtl"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14">
          <TabsTrigger value="manage" className="gap-2">
            <CalendarClockIcon className="h-4 w-4"/>
            إدارة الفعاليات
          </TabsTrigger>
          <TabsTrigger value="form" className="gap-2">
            {mode === 'create' ? <PlusCircle className="h-4 w-4"/> : <Edit className="h-4 w-4"/>}
            {mode === 'create' ? 'إنشاء فعالية' : 'تعديل الفعالية'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">الفعاليات المنشأة</CardTitle>
                  <CardDescription>
                    {events.length} {events.length === 1 ? 'فعالية' : 'فعاليات'} في النظام
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="بحث بالعنوان أو الفئة..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 h-11 w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-16">
                  <CalendarClockIcon className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <p className="text-lg font-medium mb-2">لا توجد فعاليات</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {searchTerm ? 'لم يتم العثور على نتائج' : 'لم يتم إنشاء أي فعاليات بعد'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setActiveTab('form')}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      إنشاء أول فعالية
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Upcoming Events */}
                  {upcomingEvents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-green-500 text-white">قادمة</Badge>
                        <h3 className="font-bold text-sm uppercase tracking-wide text-green-600">
                          الفعاليات القادمة ({upcomingEvents.length})
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {upcomingEvents.map((event, index) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <EventCard 
                              event={event} 
                              onEdit={handleEditClick}
                              onDelete={handleDeleteEvent}
                              onCopyCode={copyToClipboard}
                              copiedCode={copiedCode}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Past Events */}
                  {pastEvents.length > 0 && (
                    <div>
                      {upcomingEvents.length > 0 && <Separator className="my-6" />}
                      <div className="flex items-center gap-2 mb-4">
                        <Badge variant="outline">منتهية</Badge>
                        <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
                          الفعاليات المنتهية ({pastEvents.length})
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {pastEvents.map((event, index) => (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <EventCard 
                              event={event} 
                              onEdit={handleEditClick}
                              onDelete={handleDeleteEvent}
                              onCopyCode={copyToClipboard}
                              copiedCode={copiedCode}
                              isPast
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="mt-6">
          <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <CardTitle className="text-xl">
                      {mode === 'create' ? 'إنشاء فعالية جديدة' : 'تعديل الفعالية'}
                  </CardTitle>
                  <CardDescription>
                      {mode === 'create' 
                        ? 'املأ التفاصيل لإنشاء فعالية جديدة' 
                        : 'عدّل التفاصيل وقم بالحفظ'}
                  </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                  <EventWizardForm 
                      key={selectedEvent ? `edit-${selectedEvent.id}` : 'create'}
                      mode={mode}
                      initialData={selectedEvent || undefined}
                      onSubmit={mode === 'create' ? handleCreate : handleUpdate}
                      onCancel={handleCancelEdit}
                      currentStep={currentStep}
                      setCurrentStep={setCurrentStep}
                  />
              </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// --- Event Card Component ---
function EventCard({ 
  event, 
  onEdit, 
  onDelete, 
  onCopyCode,
  copiedCode,
  isPast = false
}: { 
  event: DatabaseEvent; 
  onEdit: (event: DatabaseEvent) => void;
  onDelete: (id: number) => void;
  onCopyCode: (code: string) => void;
  copiedCode: string | null;
  isPast?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`rounded-xl border-2 transition-all ${
      isPast 
        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' 
        : 'bg-white dark:bg-gray-800 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md'
    }`}>
      {/* Collapsed View */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg truncate">{event.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span>{format(new Date(event.start_time), 'PP')}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {event.category}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <ChevronRight className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Expanded View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-muted-foreground">الموقع</p>
                    <p>{event.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-muted-foreground">الوقت</p>
                    <p>{format(new Date(event.start_time), 'p')} - {format(new Date(event.end_time), 'p')}</p>
                  </div>
                </div>
                {event.max_attendees && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-muted-foreground">الحد الأقصى</p>
                      <p>{event.max_attendees} مشارك</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">كود التحقق:</p>
                  <p className="font-mono text-lg font-bold">{event.check_in_code}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onCopyCode(event.check_in_code)}
                  className="flex-shrink-0"
                >
                  {copiedCode === event.check_in_code ? (
                    <Check className="h-4 w-4 text-green-500"/> 
                  ) : (
                    <Copy className="h-4 w-4"/>
                  )}
                </Button>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onEdit(event)}
                  className="flex-1 gap-2"
                >
                  <Edit className="h-4 w-4"/>
                  تعديل
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onDelete(event.id)}
                  className="gap-2"
                >
                  <Trash className="h-4 w-4"/>
                  حذف
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
