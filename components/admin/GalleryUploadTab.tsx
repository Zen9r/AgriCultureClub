// src/components/admin/GalleryUploadTab.tsx

"use client"

import { useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload'; // <-- 1. استيراد المحرك
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload } from 'lucide-react';

export default function GalleryUploadTab() {
  const { uploadFile, isUploading, uploadProgress } = useFileUpload(); // <-- 2. استدعاء المحرك
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [category, setCategory] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("الرجاء اختيار صورة أولاً.");
      return;
    }

    // 3. استخدام دالة الرفع
    const imageUrl = await uploadFile(selectedFile, 'gallery_images'); // 'gallery_images' هو اسم الـ Bucket

    if (imageUrl) {
      // 4. حفظ رابط الصورة في قاعدة البيانات
      const { error } = await supabase.from('gallery_images').insert({
        image_url: imageUrl,
        alt_text: altText,
        category: category,
      });

      if (error) {
        toast.error("فشل حفظ معلومات الصورة في قاعدة البيانات.");
      } else {
        toast.success("تمت إضافة الصورة للمعرض بنجاح!");
        // إعادة تعيين النموذج
        setSelectedFile(null);
        setAltText('');
        setCategory('');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>رفع صور للمعرض</CardTitle>
        <CardDescription>هنا يمكن للجنة الإعلام إضافة صور جديدة لمعرض الموقع.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="file-upload">اختر صورة</Label>
            <Input id="file-upload" type="file" accept="image/*" onChange={handleFileChange} required />
          </div>
          {selectedFile && (
            <div className="text-sm text-gray-500">
              الملف المختار: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
          <div>
            <Label htmlFor="altText">وصف الصورة (العنوان)</Label>
            <Input id="altText" value={altText} onChange={(e) => setAltText(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="category">فئة الصورة</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          
          {isUploading && <Progress value={uploadProgress} className="w-full" />}

          <Button type="submit" disabled={isUploading || !selectedFile} className="w-full">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? 'جارٍ الرفع...' : 'رفع الصورة'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}