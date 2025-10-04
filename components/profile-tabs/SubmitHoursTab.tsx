'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Send, Upload, Link as LinkIcon, Loader2, ArrowLeft, 
  CheckCircle, Info, FileText, Image as ImageIcon, X, CheckCheck,
  Clock, XCircle, Award, Calendar, History
} from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

type ExtraHoursRequest = {
  user_id: string;
  activity_title: string;
  task_description: string;
  task_type: 'تصميم' | 'مونتاج' | 'كتابة محتوى' | 'تنظيم لوجستي' | 'أخرى';
  image_url?: string | null;
  status?: 'pending' | 'approved' | 'rejected';
};

type SubmissionRecord = {
  id: string;
  activity_title: string;
  task_description: string;
  task_type: string;
  status: 'pending' | 'approved' | 'rejected';
  awarded_hours: number | null;
  notes: string | null;
  created_at: string;
  image_url: string | null;
};

const taskTypeInfo = {
  'تصميم': { icon: '🎨', description: 'بوسترات، لوجوهات، أو أي تصاميم جرافيكية' },
  'مونتاج': { icon: '🎬', description: 'مونتاج فيديوهات أو محتوى مرئي' },
  'كتابة محتوى': { icon: '✍️', description: 'كتابة مقالات، منشورات، أو محتوى نصي' },
  'تنظيم لوجستي': { icon: '📋', description: 'التخطيط والتنسيق اللوجستي للفعاليات' },
  'أخرى': { icon: '⭐', description: 'أي نوع آخر من المهام التطوعية' },
};

const statusConfig = {
  pending: {
    label: 'قيد المراجعة',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
    badgeVariant: 'warning' as const,
  },
  approved: {
    label: 'مقبول',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
    badgeVariant: 'success' as const,
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700',
    badgeVariant: 'destructive' as const,
  },
};

export default function SubmitHoursTab() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isValidUrl, setIsValidUrl] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const { 
    register, 
    handleSubmit, 
    reset, 
    control,
    watch,
    formState: { errors, isSubmitting }, 
    setValue,
    trigger
  } = useForm<ExtraHoursRequest>({
    defaultValues: {
      activity_title: "",
      task_description: "",
      image_url: ""
    }
  });

  const { uploadFile, isUploading } = useFileUpload();

  const watchedImageUrl = watch('image_url');

  // Fetch submission history
  const fetchSubmissions = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('extra_hours_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('فشل تحميل سجل الطلبات');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Validate URL
  React.useEffect(() => {
    if (watchedImageUrl && watchedImageUrl.trim() !== '') {
      try {
        new URL(watchedImageUrl);
        setIsValidUrl(true);
      } catch {
        setIsValidUrl(false);
      }
    } else {
      setIsValidUrl(false);
    }
  }, [watchedImageUrl]);

  const handleProofUpload = async (file: File) => {
    if (!file) return;
    
    setUploadedFileName(file.name);
    const publicUrl = await uploadFile(file, 'extra-hours-proofs');
    
    if (publicUrl) {
      setValue('image_url', publicUrl, { shouldValidate: true });
      toast.success("تم رفع ملف الإثبات بنجاح!");
    } else {
      setUploadedFileName('');
    }
  };

  const removeFile = () => {
    setUploadedFileName('');
    setValue('image_url', '');
  };

  const handleNextStep = async () => {
    const isValid = await trigger(['activity_title', 'task_description', 'task_type']);
    if (isValid) {
      setCurrentStep(2);
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

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
      if (error) throw error;

      toast.success('🎉 تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.');
      reset();
      setCurrentStep(1);
      setUploadedFileName('');
      setIsValidUrl(false);
      
      // Refresh submission history
      fetchSubmissions();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ ما أثناء إرسال الطلب.');
      console.error(error);
    }
  };

  const progress = (currentStep / 2) * 100;

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl sm:text-2xl font-bold">طلب توثيق ساعات تطوعية</CardTitle>
                  <CardDescription className="text-sm sm:text-base">خطوة {currentStep} من 2</CardDescription>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                  <span className={currentStep === 1 ? 'text-primary font-semibold' : ''}>تفاصيل المهمة</span>
                  <span className={currentStep === 2 ? 'text-primary font-semibold' : ''}>الإثبات والإرسال</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Step 1 Header */}
                    <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                        أخبرنا عن العمل التطوعي الذي قمت به للنادي. كن دقيقاً في الوصف!
                      </AlertDescription>
                    </Alert>

                    {/* Activity Title */}
                    <div className="space-y-2">
                      <Label htmlFor="activity_title" className="text-base font-semibold">
                        عنوان النشاط <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="activity_title" 
                        {...register('activity_title', { required: 'هذا الحقل إجباري' })} 
                        placeholder="مثال: تصميم بوستر لفعالية التوعية الغذائية..."
                        className="h-12 text-base"
                      />
                      {errors.activity_title && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {errors.activity_title.message}
                        </p>
                      )}
                    </div>

                    {/* Task Type */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">
                        نوع المهمة <span className="text-red-500">*</span>
                      </Label>
                      <Controller
                        name="task_type"
                        control={control}
                        rules={{ required: "الرجاء اختيار نوع المهمة" }}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="اختر نوع المهمة التي قمت بها" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(taskTypeInfo).map(([key, info]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <span>{info.icon}</span>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{key}</span>
                                      <span className="text-xs text-muted-foreground hidden sm:block">{info.description}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.task_type && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <X className="h-3 w-3" />
                          {errors.task_type.message}
                        </p>
                      )}
                    </div>

                    {/* Task Description */}
                    <div className="space-y-2">
                      <Label htmlFor="task_description" className="text-base font-semibold">
                        وصف تفصيلي للمهمة <span className="text-red-500">*</span>
                      </Label>
                      <Textarea 
                        id="task_description" 
                        {...register('task_description', { 
                          required: 'هذا الحقل إجباري',
                          minLength: { value: 20, message: 'يجب أن يكون الوصف 20 حرفاً على الأقل' }
                        })} 
                        placeholder="اشرح بالتفصيل ما قمت به... مثال: قمت بتصميم بوستر إعلاني للفعالية باستخدام Photoshop، مع مراعاة هوية النادي البصرية..."
                        rows={5}
                        className="resize-none text-base"
                      />
                      <div className="flex justify-between items-center">
                        {errors.task_description && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <X className="h-3 w-3" />
                            {errors.task_description.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mr-auto">
                          {watch('task_description')?.length || 0} حرف (الحد الأدنى: 20)
                        </p>
                      </div>
                    </div>

                    {/* Next Button */}
                    <div className="pt-4">
                      <Button 
                        type="button"
                        onClick={handleNextStep}
                        className="w-full h-14 text-base gap-2 touch-manipulation"
                      >
                        المتابعة إلى الخطوة التالية
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    {/* Step 2 Header */}
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                        أضف رابطاً أو ملفاً يثبت إنجازك (اختياري ولكن موصى به)
                      </AlertDescription>
                    </Alert>

                    {/* File/Link Input */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">
                        إثبات العمل (اختياري)
                      </Label>
                      
                      <Tabs defaultValue="link" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 h-12">
                          <TabsTrigger value="link" className="gap-2">
                            <LinkIcon className="h-4 w-4"/>
                            إدخال رابط
                          </TabsTrigger>
                          <TabsTrigger value="upload" className="gap-2">
                            <Upload className="h-4 w-4"/>
                            رفع ملف
                          </TabsTrigger>
                        </TabsList>

                        {/* Link Tab */}
                        <TabsContent value="link" className="space-y-3 pt-3">
                          <div className="relative">
                            <Input 
                              {...register('image_url')} 
                              placeholder="https://drive.google.com/..." 
                              disabled={isUploading}
                              className="h-12 text-base pr-10"
                              dir="ltr"
                            />
                            {isValidUrl && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute left-3 top-1/2 -translate-y-1/2"
                              >
                                <CheckCheck className="h-5 w-5 text-green-500" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            💡 يمكنك إضافة رابط من Google Drive، Behance، أو أي خدمة تخزين سحابية
                          </p>
                        </TabsContent>

                        {/* Upload Tab */}
                        <TabsContent value="upload" className="space-y-3 pt-3">
                          {!uploadedFileName ? (
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-primary transition-colors">
                              <div className="flex flex-col items-center gap-3">
                                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">اختر ملفاً من جهازك</p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG, PDF حتى 10MB</p>
                                </div>
                                <Input 
                                  type="file" 
                                  onChange={(e) => e.target.files && handleProofUpload(e.target.files[0])} 
                                  disabled={isUploading || isSubmitting}
                                  className="max-w-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">تم رفع الملف بنجاح</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                      {uploadedFileName}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={removeFile}
                                  disabled={isUploading}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          )}

                          {isUploading && (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>جاري رفع الملف...</span>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={handlePreviousStep}
                        className="w-full sm:flex-1 h-14 gap-2 touch-manipulation order-2 sm:order-1"
                      >
                        العودة
                      </Button>
                      <Button 
                        type="submit" 
                        className="w-full sm:flex-1 h-14 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 touch-manipulation order-1 sm:order-2"
                        disabled={isSubmitting || isUploading}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            إرسال الطلب
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </form>
      </motion.div>

      {/* Submission History Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                <History className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">سجل طلباتي</CardTitle>
                <CardDescription className="text-sm">تتبع حالة جميع طلباتك السابقة</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">جاري تحميل السجل...</p>
              </div>
            ) : submissions.length > 0 ? (
              <div className="space-y-3">
                {submissions.map((submission, index) => {
                  const status = statusConfig[submission.status];
                  const StatusIcon = status.icon;

                  return (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`rounded-lg border-2 p-4 ${status.color} transition-all hover:shadow-md`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-base leading-tight truncate">
                            {submission.activity_title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(submission.created_at).toLocaleDateString('ar-SA', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Badge variant={status.badgeVariant} className="gap-1.5 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>

                      {/* Task Type */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-muted-foreground">النوع:</span>
                        <Badge variant="outline" className="text-xs">
                          {submission.task_type}
                        </Badge>
                      </div>

                      {/* Approved Hours */}
                      {submission.status === 'approved' && submission.awarded_hours && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3 mb-3 flex items-center gap-2"
                        >
                          <Award className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">الساعات المعتمدة</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {submission.awarded_hours} {submission.awarded_hours === 1 ? 'ساعة' : submission.awarded_hours === 2 ? 'ساعتان' : 'ساعات'}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* Rejection Notes */}
                      {submission.status === 'rejected' && submission.notes && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3 mb-3"
                        >
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                            سبب الرفض:
                          </p>
                          <p className="text-sm leading-relaxed">{submission.notes}</p>
                        </motion.div>
                      )}

                      {/* Description Preview */}
                      <div className="pt-3 border-t border-current/10">
                        <p className="text-xs text-muted-foreground mb-1">الوصف:</p>
                        <p className="text-sm line-clamp-2 leading-relaxed">
                          {submission.task_description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">لا توجد طلبات سابقة</h3>
                <p className="text-sm text-muted-foreground">
                  لم تقدم أي طلبات لتوثيق ساعات تطوعية بعد
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
