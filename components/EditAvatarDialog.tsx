// src/components/EditAvatarDialog.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useFileUpload } from '@/hooks/useFileUpload';
import type { Profile } from '@/hooks/useProfile';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Link as LinkIcon } from 'lucide-react';

interface EditAvatarDialogProps {
  profile: Profile;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function EditAvatarDialog({ profile, isOpen, setIsOpen }: EditAvatarDialogProps) {
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { uploadFile, isUploading } = useFileUpload();
  const queryClient = useQueryClient();

  // دالة لتحديث الصورة في قاعدة البيانات
  const updateProfileAvatar = async (newUrl: string | null) => {
    if (!newUrl) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: newUrl })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('تم تحديث صورتك الشخصية!');
      // تحديث البيانات في الواجهة فوراً
      queryClient.invalidateQueries({ queryKey: ['userProfileData', profile.id] });
      setIsOpen(false);
    } catch (error: any) {
      toast.error(`فشل تحديث الصورة: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة لمعالجة رفع الملف
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // --- بداية التعديل المهم ---
    // أنشئ مسارًا فريدًا وآمنًا داخل مجلد خاص بالمستخدم
     
    const filePath = `${profile.id}/${Date.now()}-${file.name}`;
    
    // --- نهاية التعديل المهم ---

    // استخدم bucket الأفاتار
    const publicUrl = await uploadFile(file, 'avatars', filePath); // أرسل المسار الجديد للدالة
    if (publicUrl) {
      await updateProfileAvatar(publicUrl);
    }
  };


  // دالة لمعالجة إرسال الرابط
  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileAvatar(link);
  };

  const isLoading = isUploading || isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تغيير الصورة الشخصية</DialogTitle>
          <DialogDescription>
            ارفع صورة جديدة من جهازك أو أدخل رابطًا مباشرًا لصورة.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-2"/>رفع صورة</TabsTrigger>
            <TabsTrigger value="link"><LinkIcon className="h-4 w-4 mr-2"/>استخدام رابط</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="pt-4">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
                disabled={isLoading}
              />
              {isUploading && <Loader2 className="h-5 w-5 animate-spin"/>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">سيتم ضغط الصورة تلقائياً.</p>
          </TabsContent>
          <TabsContent value="link" className="pt-4">
            <form onSubmit={handleLinkSubmit} className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="https://example.com/image.png"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !link}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : 'حفظ'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}