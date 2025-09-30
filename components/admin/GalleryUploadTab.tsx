'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression'; // مكتبة ضغط الصور

// --- UI Components ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react';
import { Textarea } from '../ui/textarea';

// --- Schema & Types ---
// مخطط التحقق من صحة النموذج
const galleryFormSchema = z.object({
  alt_text: z.string().min(3, "وصف الصورة إجباري."),
  category: z.enum(['ورش عمل', 'ندوات', 'معارض', 'زيارات', 'دورات تدريبية', 'اعمال تطوعية', 'حفلات', 'مبادرات'], {
    required_error: "الرجاء اختيار فئة للصورة.",
  }),
  image_url: z.string().url({ message: "الرابط غير صحيح." }).min(1, "رابط الصورة أو رفعها إجباري."),
});

type GalleryFormValues = z.infer<typeof galleryFormSchema>;

export default function GalleryUploadTab() {
  const [isUploading, setIsUploading] = useState(false);
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
  });

  // دالة لمعالجة ورفع الصورة بعد ضغطها
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    
    // إعدادات ضغط الصورة (يمكن تعديلها حسب الحاجة)
    const options = {
      maxSizeMB: 1,          // الحجم الأقصى بعد الضغط (1 ميجابايت)
      maxWidthOrHeight: 1920, // أقصى عرض أو ارتفاع
      useWebWorker: true,    // استخدام Web Worker لتسريع العملية
    };

    try {
      toast('جاري ضغط الصورة...', { icon: '⏳' });
      const compressedFile = await imageCompression(file, options);
      
      toast('جاري رفع الصورة...', { icon: '🚀' });
      const filePath = `gallery-images/${Date.now()}-${compressedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(filePath);
      form.setValue('image_url', urlData.publicUrl, { shouldValidate: true });
      toast.success("تم رفع الصورة بنجاح!");

    } catch (error: any) {
      toast.error(error.message || "فشل رفع الصورة.");
      console.error("Upload Error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // دالة الإرسال النهائية إلى قاعدة البيانات
  const onSubmit: SubmitHandler<GalleryFormValues> = async (data) => {
    const { error } = await supabase.from('gallery_images').insert({
      image_url: data.image_url,
      alt_text: data.alt_text,
      category: data.category,
    });

    if (error) {
      toast.error("فشل حفظ الصورة في قاعدة البيانات.");
      console.error("Insert Error:", error);
    } else {
      toast.success("تمت إضافة الصورة إلى المعرض بنجاح!");
      form.reset({ alt_text: '', image_url: '', category: undefined });
    }
  };

  return (
    // السطر الصحيح
// السطر الصحيح ليتوافق مع بقية الصفحات
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader className="text-right">
          <CardTitle>رفع صورة جديدة للمعرض</CardTitle>
          <CardDescription>أضف صورًا عالية الجودة لتوثيق أنشطة النادي.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مصدر الصورة</FormLabel>
                    <Tabs defaultValue="upload" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload"><Upload className="ml-2 h-4 w-4" /> رفع ملف</TabsTrigger>
                        <TabsTrigger value="link"><LinkIcon className="ml-2 h-4 w-4" /> استخدام رابط</TabsTrigger>
                      </TabsList>
                      <TabsContent value="upload" className="pt-4">
                        <Input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                          disabled={isUploading}
                        />
                        {isUploading && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>جاري المعالجة والرفع...</span>
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="link" className="pt-4">
                        <FormControl>
                          <Input placeholder="https://example.com/image.png" {...field} />
                        </FormControl>
                      </TabsContent>
                    </Tabs>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>فئة الصورة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الفئة المناسبة" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['ورش عمل', 'ندوات', 'معارض', 'زيارات', 'دورات تدريبية', 'اعمال تطوعية', 'حفلات', 'مبادرات'].map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alt_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وصف الصورة</FormLabel>
                    <FormControl>
                      <Textarea placeholder="وصف موجز لمحتوى الصورة، مفيد لتحسين محركات البحث والوصولية." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isUploading || form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                إضافة الصورة للمعرض
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}