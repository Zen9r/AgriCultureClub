// src/hooks/useFileUpload.ts

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileToUpload = file;
      // الخطوة 1: ضغط الصورة إذا كانت من نوع صورة
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1,          // الحجم الأقصى بعد الضغط (1 ميجابايت)
          maxWidthOrHeight: 1920, // أقصى عرض أو ارتفاع
          useWebWorker: true,
          onProgress: (p: number) => setUploadProgress(p * 0.5), // الضغط يمثل 50% من التقدم
        };
        toast.promise(
           imageCompression(file, options),
           {
             loading: 'جارٍ ضغط الصورة...',
             success: 'تم ضغط الصورة بنجاح!',
             error: 'فشل ضغط الصورة.',
           }
        );
        fileToUpload = await imageCompression(file, options);
      }
      
      const fileName = `${Date.now()}_${fileToUpload.name}`;
      const filePath = `${fileName}`;

      // الخطوة 2: رفع الملف إلى Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          // تتبع تقدم الرفع
          // للأسف، مكتبة supabase-js الحالية لا تدعم تتبع التقدم مباشرة
          // سنترك هذا للتحسين المستقبلي
        });

      if (uploadError) {
        throw uploadError;
      }

      // الخطوة 3: الحصول على الرابط العام للملف الذي تم رفعه
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error("لم يتم العثور على الرابط العام للملف.");
      }

      toast.success("تم رفع الملف بنجاح!");
      return data.publicUrl;

    } catch (error: any) {
      toast.error(`فشل الرفع: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(100); // إكمال شريط التقدم
    }
  };

  return { uploadFile, isUploading, uploadProgress };
};