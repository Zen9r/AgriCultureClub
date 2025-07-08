'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Send, List, Download, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// --- Types ---
type DesignRequest = {
  id: string;
  created_at: string;
  title: string;
  status: 'new' | 'in_progress' | 'completed' | 'rejected';
  design_url: string | null;
};

// --- Form Schema ---
const designRequestSchema = z.object({
  title: z.string().min(3, { message: 'العنوان يجب أن يكون 3 أحرف على الأقل.' }),
  design_type: z.enum(['بوستر', 'فيديو', 'شعار', 'تعديل صورة']),
  description: z.string().min(10, { message: 'الوصف يجب أن يكون 10 أحرف على الأقل.' }),
  deadline: z.string().optional(),
});
type DesignRequestFormValues = z.infer<typeof designRequestSchema>;

// --- Helper Components ---
function StatusBadge({ status }: { status: DesignRequest['status'] }) {
    const statusMap = {
        new: { text: 'جديد', variant: 'default' as const },
        in_progress: { text: 'قيد التنفيذ', variant: 'secondary' as const },
        completed: { text: 'مكتمل', variant: 'success' as const },
        rejected: { text: 'مرفوض', variant: 'destructive' as const },
    };
    return <Badge variant={statusMap[status]?.variant || 'default'}>{statusMap[status]?.text || status}</Badge>;
}

// --- Main Component ---
export default function DesignRequestTab() {
  const [myRequests, setMyRequests] = useState<DesignRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<DesignRequestFormValues>({ resolver: zodResolver(designRequestSchema) });
  const { isSubmitting } = form.formState;

  const fetchMyRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("المستخدم غير مسجل.");

      const { data, error: fetchError } = await supabase
        .from('design_requests')
        .select('id, created_at, title, status, design_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      setMyRequests(data);
    } catch (e: any) {
      setError("فشل في جلب طلباتك السابقة.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const onSubmit: SubmitHandler<DesignRequestFormValues> = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول لتقديم طلب.");

      const requestData = { ...formData, user_id: user.id, status: 'new' as const, deadline: formData.deadline || null };
      const { error } = await supabase.from('design_requests').insert(requestData);
      if (error) throw error;

      toast.success('تم إرسال طلب التصميم بنجاح.');
      form.reset();
      await fetchMyRequests(); // Refresh the list after submitting
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إرسال الطلب.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Tabs defaultValue="new_request">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new_request"><Send className="ml-2 h-4 w-4" /> تقديم طلب جديد</TabsTrigger>
          <TabsTrigger value="my_requests"><List className="ml-2 h-4 w-4" /> طلباتي السابقة</TabsTrigger>
        </TabsList>
        
        {/* --- Tab 1: New Request Form --- */}
        <TabsContent value="new_request">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle>تقديم طلب تصميم</CardTitle>
                  <CardDescription>املأ النموذج لتقديم طلب إلى لجنة التصميم.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان الطلب</FormLabel>
                        <FormControl><Input placeholder="بوستر لفعالية..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="design_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع التصميم</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="بوستر">بوستر</SelectItem>
                            <SelectItem value="فيديو">فيديو</SelectItem>
                            <SelectItem value="شعار">شعار</SelectItem>
                            <SelectItem value="تعديل صورة">تعديل صورة</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )}/>
                  <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف التفصيلي</FormLabel>
                        <FormControl><Textarea rows={4} placeholder="صف المطلوب بدقة..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}/>
                   <FormField control={form.control} name="deadline" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الموعد النهائي (اختياري)</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                  )}/>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Send className="h-4 w-4 ml-2" />}
                    إرسال الطلب
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>

        {/* --- Tab 2: My Previous Requests --- */}
        <TabsContent value="my_requests">
          <Card>
            <CardHeader>
              <CardTitle>طلباتي السابقة</CardTitle>
              <CardDescription>هنا يمكنك متابعة حالة طلباتك السابقة.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
               : error ? <div className="text-red-500 text-center p-8"><AlertTriangle className="mx-auto mb-2" />{error}</div>
               : myRequests.length === 0 ? <p className="text-center text-muted-foreground p-8">لم تقم بتقديم أي طلبات بعد.</p>
               : (
                <div className="space-y-3">
                  {myRequests.map(req => (
                    <div key={req.id} className="border rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <p className="font-semibold">{req.title}</p>
                        <p className="text-sm text-muted-foreground">تاريخ الطلب: {new Date(req.created_at).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <StatusBadge status={req.status} />
                        {req.status === 'completed' && req.design_url && (
                          <a href={req.design_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 ml-2" />
                              تحميل التصميم
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
             <CardFooter>
                <Button variant="ghost" onClick={fetchMyRequests} disabled={isLoading} className="mx-auto">
                    <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                    تحديث القائمة
                </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
