// src/components/admin/DesignRequestTab.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Send, List, ThumbsUp, ThumbsDown, Eye, 
  FileText, Calendar as CalendarIcon, Palette, Clock, 
  CheckCircle, XCircle, AlertCircle, Image as ImageIcon
} from 'lucide-react';

// --- Types & Schema ---
const requestFormSchema = z.object({
  title: z.string().min(3, "العنوان إجباري."),
  design_type: z.enum(['اعلان للفعالية', 'بوستر', 'شعار', 'تعديل صورة', 'فيديو', 'تعديل فيديو'], {
    required_error: "الرجاء اختيار نوع التصميم.",
  }),
  description: z.string().min(10, "الوصف إجباري."),
  deadline: z.string().nullable().optional(),
});
type RequestFormValues = z.infer<typeof requestFormSchema>;

type MyRequest = {
  id: string;
  title: string;
  design_type: string;
  created_at: string;
  deadline: string | null;
  status: 'new' | 'in_progress' | 'awaiting_review' | 'completed' | 'rejected';
  design_url: string | null;
  feedback_notes: string | null;
};

// Status configuration
const statusConfig = {
  new: { 
    label: 'جديد', 
    color: 'bg-gray-100 text-gray-700 border-gray-300', 
    borderColor: 'border-l-gray-400',
    icon: AlertCircle,
    dotColor: 'bg-gray-400'
  },
  in_progress: { 
    label: 'قيد التنفيذ', 
    color: 'bg-blue-100 text-blue-700 border-blue-300', 
    borderColor: 'border-l-blue-500',
    icon: Clock,
    dotColor: 'bg-blue-500'
  },
  awaiting_review: { 
    label: 'بانتظار المراجعة', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300', 
    borderColor: 'border-l-yellow-500',
    icon: Eye,
    dotColor: 'bg-yellow-500'
  },
  completed: { 
    label: 'مكتمل', 
    color: 'bg-green-100 text-green-700 border-green-300', 
    borderColor: 'border-l-green-500',
    icon: CheckCircle,
    dotColor: 'bg-green-500'
  },
  rejected: { 
    label: 'مرفوض', 
    color: 'bg-red-100 text-red-700 border-red-300', 
    borderColor: 'border-l-red-500',
    icon: XCircle,
    dotColor: 'bg-red-500'
  },
};

// --- Main Component ---
export default function DesignRequestTab() {
  const [myRequests, setMyRequests] = useState<MyRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      deadline: null,
    },
  });

  const fetchMyRequests = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase.from('design_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) {
      toast.error("فشل جلب طلباتك السابقة.");
    } else {
      setMyRequests(data as any);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const onSubmit: SubmitHandler<RequestFormValues> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const submissionData = {
        ...formData,
        deadline: formData.deadline || null,
        user_id: user.id,
        status: 'new' as const
    };
    const { error } = await supabase.from('design_requests').insert(submissionData);

    if (error) {
      toast.error("فشل تقديم الطلب.");
      console.error('Supabase insert error:', error);
    } else {
      toast.success("تم تقديم طلبك بنجاح.");
      form.reset();
      await fetchMyRequests();
    }
  };

  const handleReview = async (requestId: string, newStatus: 'completed' | 'rejected') => {
    if (newStatus === 'rejected' && !feedbackNotes) {
      toast.error("يرجى كتابة سبب الرفض.");
      return;
    }
    const { error } = await supabase.from('design_requests').update({
      status: newStatus,
      feedback_notes: newStatus === 'rejected' ? feedbackNotes : null
    }).eq('id', requestId);

    if (error) {
      toast.error("فشل تحديث حالة الطلب.");
    } else {
      toast.success("تم تحديث الطلب.");
      setFeedbackNotes('');
      document.getElementById(`dialog-close-${requestId}`)?.click();
      await fetchMyRequests();
    }
  };

  // Status Card Component
  const StatusCard = ({ request }: { request: MyRequest }) => {
    const config = statusConfig[request.status];
    const StatusIcon = config.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border-2 border-l-4 ${config.borderColor} ${config.color} p-4 shadow-sm hover:shadow-md transition-all`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
              <h3 className="font-bold text-lg truncate">{request.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {request.design_type}
            </p>
          </div>
          <Badge variant="outline" className={`gap-1.5 ${config.color} border-current flex-shrink-0`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {config.label}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(request.created_at).toLocaleDateString('ar-SA')}</span>
          </div>
          {request.deadline && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>موعد: {new Date(request.deadline).toLocaleDateString('ar-SA')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {request.status === 'awaiting_review' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="flex-1 h-10 gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
                  <Eye className="h-4 w-4"/>
                  مراجعة التصميم
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="text-right max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">مراجعة التصميم المقدم</DialogTitle>
                  <DialogDescription>هذا هو التصميم الذي تم تسليمه. يمكنك قبوله أو رفضه مع تقديم ملاحظات.</DialogDescription>
                </DialogHeader>
                <div className="my-4">
                  {request.design_url?.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                    <img src={request.design_url} alt="Design Preview" className="rounded-lg border max-h-96 w-full object-contain"/>
                  ) : (
                    <a href={request.design_url!} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      عرض الملف/الفيديو
                    </a>
                  )}
                </div>
                <Textarea 
                  placeholder="ملاحظات الرفض (إجبارية في حال الرفض)..." 
                  onChange={e=>setFeedbackNotes(e.target.value)}
                  className="min-h-24"
                />
                <DialogFooter className="sm:justify-start gap-2 pt-4">
                  <Button variant="destructive" onClick={()=>handleReview(request.id, 'rejected')} className="gap-2">
                    <ThumbsDown className="h-4 w-4"/>
                    رفض مع ملاحظات
                  </Button>
                  <Button onClick={()=>handleReview(request.id, 'completed')} className="gap-2 bg-green-600 hover:bg-green-700">
                    <ThumbsUp className="h-4 w-4"/>
                    قبول التصميم
                  </Button>
                  <DialogClose asChild>
                    <Button id={`dialog-close-${request.id}`} type="button" variant="secondary">إغلاق</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {(request.status === 'completed' || request.status === 'rejected') && request.design_url && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 h-10 gap-2">
                  <Eye className="h-4 w-4"/>
                  عرض التصميم
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl" className="text-right max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">التصميم النهائي</DialogTitle>
                  {request.status === 'rejected' && request.feedback_notes && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="font-semibold text-red-700 dark:text-red-400 mb-2">سبب الرفض:</p>
                      <p className="text-sm text-red-600 dark:text-red-300">{request.feedback_notes}</p>
                    </div>
                  )}
                </DialogHeader>
                <div className="my-4">
                  {request.design_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 
                    <img src={request.design_url} alt="Design Preview" className="rounded-lg border max-h-96 w-full object-contain"/> : 
                    <a href={request.design_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      عرض الملف/الفيديو
                    </a>
                  }
                </div>
                <DialogFooter className="pt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">إغلاق</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      dir="rtl" 
      className="text-right"
    >
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="new" className="gap-2">
            <Send className="h-4 w-4"/>
            طلب جديد
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <List className="h-4 w-4"/>
            طلباتي ({myRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">تقديم طلب تصميم</CardTitle>
                  <CardDescription>املأ التفاصيل أدناه لإرسال طلبك لفريق التصميم</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Request Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-border" />
                      <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        تفاصيل الطلب
                      </p>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    <FormField 
                      name="title" 
                      control={form.control} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">عنوان الطلب *</FormLabel>
                          <FormDescription>اختر عنواناً واضحاً يصف المطلوب</FormDescription>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="مثال: تصميم بوستر لفعالية الزراعة المستدامة"
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField 
                      name="design_type" 
                      control={form.control} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">نوع التصميم *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="اختر النوع"/>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {['اعلان للفعالية', 'بوستر', 'شعار', 'تعديل صورة', 'فيديو', 'تعديل فيديو'].map(t=> (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField 
                      name="description" 
                      control={form.control} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">الوصف التفصيلي *</FormLabel>
                          <FormDescription>
                            اشرح بالتفصيل ما تحتاجه، بما في ذلك الألوان، الأبعاد، والمحتوى النصي
                          </FormDescription>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="مثال: أحتاج إلى بوستر بمقاس A4 بألوان خضراء وزرقاء، يحتوي على شعار النادي وتفاصيل الفعالية..."
                              rows={5}
                              className="resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField 
                      name="deadline" 
                      control={form.control} 
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">الموعد النهائي (اختياري)</FormLabel>
                          <FormDescription>حدد تاريخاً إذا كان هناك موعد محدد للتسليم</FormDescription>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value ?? ''} 
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <Button 
                    type="submit" 
                    disabled={form.formState.isSubmitting}
                    className="w-full h-12 text-base gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin"/>
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5"/>
                        إرسال الطلب
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <List className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl">متابعة طلباتك</CardTitle>
                  <CardDescription>قائمة بجميع الطلبات التي قدمتها وحالاتها</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : myRequests.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence>
                    {myRequests.map((req, index) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <StatusCard request={req} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                    <ImageIcon className="h-14 w-14 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">لا توجد طلبات سابقة</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    لم تقدم أي طلبات تصميم بعد. استخدم تبويب "طلب جديد" لإرسال طلبك الأول.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
