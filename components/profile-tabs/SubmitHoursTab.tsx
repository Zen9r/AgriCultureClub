'use client';

import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useForm, SubmitHandler } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

type ExtraHoursRequest = {
  user_id: string;
  activity_title: string;
  task_description: string;
  task_type: 'تصميم' | 'مونتاج' | 'كتابة محتوى' | 'تنظيم لوجستي' | 'أخرى';
  image_url?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
};

export default function SubmitHoursTab() {
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors, isSubmitting }, 
    setValue
  } = useForm<ExtraHoursRequest>();

  const onSubmit: SubmitHandler<ExtraHoursRequest> = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول لتقديم طلب.");

      const requestData: ExtraHoursRequest = {
        ...formData,
        user_id: user.id,
        status: 'pending',
      };
      
      const { error } = await supabase.from('extra_hours_requests').insert(requestData);

      if (error) {
        throw error;
      }

      toast.success('تم إرسال طلبك بنجاح للمراجعة.');
      reset();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ ما أثناء إرسال الطلب.');
      console.error(error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>طلب توثيق ساعات تطوعية</CardTitle>
            <CardDescription>املأ النموذج التالي لتوثيق ساعات العمل الإضافية التي قمت بها.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity_title">عنوان النشاط*</Label>
              <Input id="activity_title" {...register('activity_title', { required: 'هذا الحقل إجباري' })} placeholder="مثال: تصميم بوستر لفعالية..." />
              {errors.activity_title && <p className="text-sm text-red-500">{errors.activity_title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="task_description">وصف المهمة*</Label>
              <Textarea id="task_description" {...register('task_description', { required: 'هذا الحقل إجباري' })} placeholder="يرجى تقديم وصف تفصيلي للمهمة..." />
              {errors.task_description && <p className="text-sm text-red-500">{errors.task_description.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>نوع المهمة*</Label>
              <Select 
                onValueChange={(value) => {
                  setValue('task_type', value as ExtraHoursRequest['task_type']);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المهمة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="تصميم">تصميم</SelectItem>
                  <SelectItem value="مونتاج">مونتاج</SelectItem>
                  <SelectItem value="كتابة محتوى">كتابة محتوى</SelectItem>
                  <SelectItem value="تنظيم لوجستي">تنظيم لوجستي</SelectItem>
                  <SelectItem value="أخرى">أخرى</SelectItem>
                </SelectContent>
              </Select>
              {errors.task_type && <p className="text-sm text-red-500">{errors.task_type.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">رابط إثبات العمل (اختياري)</Label>
              <Input id="image_url" {...register('image_url')} placeholder="https://example.com/link-to-your-work.png" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الإرسال...' : <> <Send className="ml-2 h-4 w-4" /> إرسال الطلب </>}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </motion.div>
  );
}