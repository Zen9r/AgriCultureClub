// src/hooks/useFileUpload.ts

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * دالة لرفع ملف إلى Supabase Storage مع ضغط الصور تلقائياً.
   * @param file الملف المُراد رفعه.
   * @param bucket اسم الـ Bucket في Supabase.
   * @param customPath (اختياري) مسار مخصص للملف، مثل "user-id/avatar.png".
   * @returns رابط الملف العام أو null في حالة الفشل.
   */
  const uploadFile = async (file: File, bucket: string, customPath?: string): Promise<string | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileToUpload = file;
      // الخطوة 1: ضغط الصورة إذا كانت من نوع صورة
      if (file.type.startsWith('image/')) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          onProgress: (p: number) => setUploadProgress(p * 0.5),
        };
        fileToUpload = await imageCompression(file, options);
      }
      
      // -- التعديل هنا --
      // استخدم المسار المخصص إذا تم توفيره، وإلا قم بإنشاء اسم ملف عشوائي.
      // هذا يجعل الهوك مرناً وقابلاً لإعادة الاستخدام في أماكن أخرى.
      const filePath = customPath || `${Date.now()}_${fileToUpload.name}`;

      // الخطوة 2: رفع الملف إلى Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
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
      setUploadProgress(100);
    }
  };

  return { uploadFile, isUploading, uploadProgress };
};