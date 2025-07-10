// src/components/admin/DesignRequestTab.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Send, List, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';

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
  status: 'new' | 'in_progress' | 'awaiting_review' | 'completed' | 'rejected';
  design_url: string | null;
  feedback_notes: string | null;
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
        deadline: formData.deadline || null, // Ensure empty string becomes null
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
      // Find the dialog close button and click it programmatically
      document.getElementById(`dialog-close-${requestId}`)?.click();
      await fetchMyRequests();
    }
  };
  
  const StatusBadge = ({ status }: { status: MyRequest['status'] }) => {
    const statusMap = {
      new: { text: 'جديد', variant: 'secondary' as const },
      in_progress: { text: 'قيد التنفيذ', variant: 'default' as const },
      awaiting_review: { text: 'بانتظار المراجعة', variant: 'warning' as const },
      completed: { text: 'مكتمل', variant: 'success' as const },
      rejected: { text: 'مرفوض', variant: 'destructive' as const },
    };
    return <Badge variant={statusMap[status]?.variant || 'default'}>{statusMap[status]?.text}</Badge>;
  };

  return (
    <div dir="rtl" className="text-right">
      <Tabs defaultValue="new" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new"><Send className="ml-2 h-4 w-4"/>طلب جديد</TabsTrigger>
          <TabsTrigger value="history"><List className="ml-2 h-4 w-4"/>طلباتي</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          <Card>
            <CardHeader>
                <CardTitle className="text-right">تقديم طلب تصميم</CardTitle>
                <CardDescription className="text-right">هنا يمكنك تقديم طلب تصميم جديد للجنة الإعلامية.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField name="title" control={form.control} render={({ field }) => (<FormItem><FormLabel>عنوان الطلب</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                  <FormField name="design_type" control={form.control} render={({ field }) => (<FormItem><FormLabel>نوع التصميم</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="اختر النوع"/></SelectTrigger></FormControl><SelectContent>{['اعلان للفعالية', 'بوستر', 'شعار', 'تعديل صورة', 'فيديو', 'تعديل فيديو'].map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)}/>
                  <FormField name="description" control={form.control} render={({ field }) => (<FormItem><FormLabel>الوصف</FormLabel><FormControl><Textarea {...field} placeholder="يرجى تقديم وصف كامل وواضح للمطلوب..."/></FormControl><FormMessage/></FormItem>)}/>
                  <FormField name="deadline" control={form.control} render={({ field }) => (<FormItem><FormLabel>الموعد النهائي (اختياري)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>)}/>
                  <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : "إرسال الطلب"}</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
                <CardTitle className="text-right">متابعة طلباتك</CardTitle>
                <CardDescription className="text-right">قائمة بجميع الطلبات التي قدمتها وحالاتها.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> :
               myRequests.map(req => (
                <div key={req.id} className="border p-4 rounded-lg flex justify-between items-center">
                  {/* Group title and badge together to keep them on the right */}
                  <div className="flex-grow space-y-2">
                    <p className="font-semibold">{req.title}</p>
                    <StatusBadge status={req.status}/>
                  </div>
                  
                  {/* Action button on the left */}
                  <div className="flex-shrink-0">
                    {req.status === 'awaiting_review' && (
                      <Dialog>
                        <DialogTrigger asChild><Button><Eye className="ml-2 h-4 w-4"/>مراجعة</Button></DialogTrigger>
                        <DialogContent dir="rtl" className="text-right">
                          <DialogHeader><DialogTitle>مراجعة التصميم المقدم</DialogTitle><DialogDescription>هذا هو التصميم الذي تم تسليمه. يمكنك قبوله أو رفضه مع تقديم ملاحظات.</DialogDescription></DialogHeader>
                          {req.design_url?.match(/\.(jpeg|jpg|gif|png)$/i) ? <img src={req.design_url} alt="Design Preview" className="rounded-md border max-h-80 w-full object-contain"/> : <a href={req.design_url!} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">عرض الملف/الفيديو</a>}
                          <Textarea placeholder="ملاحظات الرفض (إجبارية في حال الرفض)..." onChange={e=>setFeedbackNotes(e.target.value)}/>
                          <DialogFooter className="sm:justify-start gap-2 pt-4">
                            <Button variant="destructive" onClick={()=>handleReview(req.id, 'rejected')}><ThumbsDown className="ml-2 h-4 w-4"/>رفض مع ملاحظات</Button>
                            <Button variant="success" onClick={()=>handleReview(req.id, 'completed')}><ThumbsUp className="ml-2 h-4 w-4"/>قبول التصميم</Button>
                            <DialogClose asChild><Button id={`dialog-close-${req.id}`} type="button" variant="secondary">إغلاق</Button></DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    {(req.status === 'completed' || req.status === 'rejected') && req.design_url && (
                       <Dialog>
                        <DialogTrigger asChild><Button variant="outline"><Eye className="ml-2 h-4 w-4"/>عرض التصميم</Button></DialogTrigger>
                        <DialogContent dir="rtl" className="text-right">
                          <DialogHeader>
                            <DialogTitle>التصميم النهائي لطلب: {req.title}</DialogTitle>
                            {req.status === 'rejected' && <DialogDescription className="text-red-500 pt-2">تم رفض هذا الطلب. الملاحظات: {req.feedback_notes || 'لا يوجد'}</DialogDescription>}
                          </DialogHeader>
                          {req.design_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? 
                            <img src={req.design_url} alt="Design Preview" className="rounded-md border max-h-80 w-full object-contain"/> : 
                            <a href={req.design_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">عرض الملف/الفيديو</a>
                          }
                          <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="secondary">إغلاق</Button></DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
              {myRequests.length === 0 && !isLoading && <p className="text-center text-muted-foreground py-4">لا توجد طلبات سابقة.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}