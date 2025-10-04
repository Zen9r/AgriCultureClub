'use client';

import React, { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';

// --- UI Components ---
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Link as LinkIcon, X, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
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

type ImagePreview = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
};

export default function GalleryUploadTab() {
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema),
  });

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  // Handle file selection and create previews
  const handleFiles = (files: File[]) => {
    const newPreviews: ImagePreview[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending'
    }));

    setImagePreviews(prev => [...prev, ...newPreviews]);

    // Auto-upload files
    newPreviews.forEach(preview => {
      uploadImage(preview);
    });
  };

  // Upload single image with progress
  const uploadImage = async (imagePreview: ImagePreview) => {
    const updateProgress = (id: string, progress: number, status: ImagePreview['status'], error?: string) => {
      setImagePreviews(prev => 
        prev.map(img => img.id === id ? { ...img, progress, status, error } : img)
      );
    };

    try {
      updateProgress(imagePreview.id, 10, 'uploading');

      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (p: number) => {
          updateProgress(imagePreview.id, 10 + (p * 0.4), 'uploading');
        }
      };

      const compressedFile = await imageCompression(imagePreview.file, options);
      updateProgress(imagePreview.id, 50, 'uploading');

      // Upload to storage
      const filePath = `gallery-images/${Date.now()}-${compressedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      updateProgress(imagePreview.id, 90, 'uploading');

      const { data: urlData } = supabase.storage.from('gallery-images').getPublicUrl(filePath);
      form.setValue('image_url', urlData.publicUrl, { shouldValidate: true });

      updateProgress(imagePreview.id, 100, 'success');
      toast.success(`تم رفع ${imagePreview.file.name} بنجاح!`);

    } catch (error: any) {
      updateProgress(imagePreview.id, 0, 'error', error.message || "فشل الرفع");
      toast.error(`فشل رفع ${imagePreview.file.name}`);
      console.error("Upload Error:", error);
    }
  };

  const removePreview = (id: string) => {
    setImagePreviews(prev => {
      const preview = prev.find(p => p.id === id);
      if (preview) {
        URL.revokeObjectURL(preview.preview);
      }
      return prev.filter(p => p.id !== id);
    });
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/50 dark:to-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ImageIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl">رفع صور للمعرض</CardTitle>
              <CardDescription>أضف صورًا عالية الجودة لتوثيق أنشطة النادي</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-xl p-8 sm:p-12
              transition-all duration-300 cursor-pointer
              ${isDragging 
                ? 'border-primary bg-primary/5 scale-[1.02]' 
                : 'border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }
            `}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleFiles(Array.from(e.target.files));
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <motion.div
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                className="p-4 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full"
              >
                <Upload className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {isDragging ? 'أفلت الصور هنا' : 'اسحب الصور وأفلتها هنا'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  أو انقر للاختيار من جهازك
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP حتى 10MB
                </p>
              </div>

              <Badge variant="outline" className="gap-1.5">
                <ImageIcon className="h-3 w-3" />
                يمكنك رفع عدة صور مرة واحدة
              </Badge>
            </div>
          </div>

          {/* Image Previews Grid */}
          <AnimatePresence>
            {imagePreviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    الصور المرفوعة ({imagePreviews.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      imagePreviews.forEach(p => URL.revokeObjectURL(p.preview));
                      setImagePreviews([]);
                    }}
                    className="text-xs"
                  >
                    مسح الكل
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <motion.div
                      key={preview.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <img
                          src={preview.preview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />

                        {/* Overlay with status */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                          <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                            {/* Progress Bar */}
                            {preview.status === 'uploading' && (
                              <div className="space-y-1">
                                <Progress value={preview.progress} className="h-1.5" />
                                <p className="text-xs text-white font-medium">
                                  {Math.round(preview.progress)}%
                                </p>
                              </div>
                            )}

                            {/* Success Badge */}
                            {preview.status === 'success' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1.5 text-green-400"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">تم الرفع بنجاح</span>
                              </motion.div>
                            )}

                            {/* Error Badge */}
                            {preview.status === 'error' && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="flex items-center gap-1.5 text-red-400"
                              >
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">{preview.error || 'فشل الرفع'}</span>
                              </motion.div>
                            )}

                            <p className="text-xs text-white truncate">
                              {preview.file.name}
                            </p>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removePreview(preview.id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form for metadata */}
          <div className="border-t pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">فئة الصورة *</FormLabel>
                      <FormDescription>
                        اختر الفئة المناسبة لجميع الصور المرفوعة
                      </FormDescription>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="اختر الفئة" />
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
                  )}
                />

                <FormField
                  control={form.control}
                  name="alt_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">وصف الصورة *</FormLabel>
                      <FormDescription>
                        وصف موجز يساعد في تحسين الوصولية ومحركات البحث
                      </FormDescription>
                      <FormControl>
                        <Textarea 
                          placeholder="مثال: فعالية ورشة عمل الزراعة المستدامة..."
                          {...field}
                          rows={3}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <Upload className="ml-2 h-4 w-4" />
                      رفع ملف
                    </TabsTrigger>
                    <TabsTrigger value="link">
                      <LinkIcon className="ml-2 h-4 w-4" />
                      رابط مباشر
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      استخدم منطقة السحب والإفلات أعلاه لرفع الصور
                    </p>
                  </TabsContent>

                  <TabsContent value="link" className="pt-4">
                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/image.png" 
                              {...field}
                              dir="ltr"
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base gap-2"
                  disabled={form.formState.isSubmitting || imagePreviews.some(p => p.status === 'uploading')}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      إضافة الصور للمعرض
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}