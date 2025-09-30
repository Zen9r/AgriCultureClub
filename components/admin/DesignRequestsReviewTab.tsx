// src/components/admin/DesignRequestsReviewTab.tsx

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Inbox, ListTodo, Link as LinkIcon, Upload, X, Archive } from 'lucide-react';

type DesignRequest = {
  id: string; created_at: string; title: string; description: string; deadline: string | null;
  status: 'new' | 'in_progress' | 'awaiting_review' | 'completed' | 'rejected';
  design_url: string | null; feedback_notes: string | null; assigned_to: string | null;
  requester_name: string | null; assignee_name: string | null;
};

function RequestDetailsView({ request, myId, onUpdate, onClose }: { request: DesignRequest; myId: string | null; onUpdate: () => void; onClose: () => void; }) {
  const [isUploading, setIsUploading] = useState(false);
  const [designUrl, setDesignUrl] = useState(request.design_url || '');

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920 });
      const filePath = `designs/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('design-files').upload(filePath, compressedFile);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('design-files').getPublicUrl(filePath);
      setDesignUrl(publicUrl);
      toast.success("تم رفع الملف بنجاح.");
    } catch (e: any) {
      toast.error("فشل رفع الملف. تأكد من صلاحيات التخزين.");
      console.error("Upload Error:", e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitDesign = async () => {
    if (!designUrl) { toast.error("الرجاء رفع ملف أو وضع رابط أولاً."); return; }
    // عند التسليم، سواء كان جديداً أو بعد الرفض، تعود الحالة إلى "بانتظار المراجعة"
    const { error } = await supabase.from('design_requests').update({ status: 'awaiting_review', design_url: designUrl }).eq('id', request.id);
    if (error) { toast.error("فشل تسليم التصميم."); } 
    else { toast.success("تم تسليم التصميم للمراجعة."); onUpdate(); }
  };

  // تغيير: إظهار نموذج الرفع إذا كانت الحالة "قيد التنفيذ" أو "مرفوض"
  const canSubmit = (request.status === 'in_progress' || request.status === 'rejected') && request.assigned_to === myId;

  return (
    <Card className="sticky top-24 text-right">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{request.title}</CardTitle>
            <CardDescription>طلب من: {request.requester_name || 'غير معروف'}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p><strong className="ml-2">الوصف:</strong>{request.description}</p>
        {request.deadline && <p><strong className="ml-2">الموعد النهائي:</strong>{new Date(request.deadline).toLocaleDateString('ar-SA')}</p>}
        {request.status === 'rejected' && request.feedback_notes && (
          <Alert variant="destructive" className="text-right">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ملاحظات الرفض</AlertTitle>
            <AlertDescription>{request.feedback_notes}</AlertDescription>
          </Alert>
        )}
        {canSubmit && (
          <div className="space-y-2 pt-4 border-t">
            <label className="text-sm font-medium">{request.status === 'rejected' ? 'إعادة تسليم التصميم' : 'تسليم التصميم'}</label>
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload"><Upload className="ml-2 h-4 w-4"/>رفع ملف</TabsTrigger>
                <TabsTrigger value="link"><LinkIcon className="ml-2 h-4 w-4"/>وضع رابط</TabsTrigger>
              </TabsList>
              <TabsContent value="upload"><Input type="file" accept="image/*,video/*,.pdf,.psd,.ai" onChange={e => e.target.files && handleImageUpload(e.target.files[0])} disabled={isUploading}/></TabsContent>
              <TabsContent value="link"><Input placeholder="https://..." value={designUrl} onChange={e => setDesignUrl(e.target.value)}/></TabsContent>
            </Tabs>
            {isUploading && <div className="flex items-center justify-center gap-2 pt-2"><Loader2 className="h-4 w-4 animate-spin"/><span>جاري الرفع...</span></div>}
            <Button onClick={handleSubmitDesign} disabled={!designUrl || isUploading} className="w-full">تسليم للمراجعة</Button>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {request.status === 'new' && <Button onClick={async () => {
             const { error } = await supabase.from('design_requests').update({ status: 'in_progress', assigned_to: myId }).eq('id', request.id);
             if (error) { toast.error("فشل إسناد الطلب."); } else { toast.success("تم إسناد الطلب إليك."); onUpdate(); }
        }} className="w-full">إسناد الطلب لي والبدء بالعمل</Button>}
      </CardFooter>
    </Card>
  );
}

export default function DesignRequestsReviewTab() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DesignRequest | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setIsLoading(false); return; }
    setMyId(authData.user.id);
    const { data, error } = await supabase.rpc('get_all_design_requests');
    if (error) { toast.error("فشل جلب الطلبات."); console.error('Supabase RPC error:', error); } 
    else { setRequests(data as DesignRequest[]); }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const newRequests = requests.filter(r => r.status === 'new');
  const myQueue = requests.filter(r => r.assigned_to === myId && (r.status === 'in_progress' || r.status === 'rejected'));
  const myArchive = requests.filter(r => r.assigned_to === myId && r.status === 'completed'); // إضافة: قائمة الأرشيف

  return (
    <div dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 space-y-6">
          {/* ... بطاقات الطلبات الجديدة ومهامي الحالية ... */}
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Inbox className="ml-2 h-5 w-5"/>طلبات جديدة</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> : newRequests.length > 0 ? (
                <div className="space-y-2">
                  {newRequests.map(req => (
                    <button key={req.id} onClick={() => setSelectedRequest(req)} className={cn("w-full text-right p-3 rounded-lg border", selectedRequest?.id === req.id ? "bg-primary/10 border-primary" : "hover:bg-accent")}>
                      <p className="font-semibold">{req.title}</p>
                      <p className="text-sm text-muted-foreground">طلب من: {req.requester_name || 'غير معروف'}</p>
                    </button>
                  ))}
                </div>
              ) : <p className="text-center text-sm text-muted-foreground py-4">لا توجد طلبات جديدة.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center"><ListTodo className="ml-2 h-5 w-5"/>مهامي الحالية</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> : myQueue.length > 0 ? (
                <div className="space-y-2">
                  {myQueue.map(req => (
                    <button key={req.id} onClick={() => setSelectedRequest(req)} className={cn("w-full text-right p-3 rounded-lg border", selectedRequest?.id === req.id ? "bg-primary/10 border-primary" : "hover:bg-accent")}>
                      <p className="font-semibold">{req.title}</p>
                      <Badge variant={req.status === 'rejected' ? 'destructive' : 'default'}>{req.status === 'rejected' ? 'مرفوض (يحتاج تعديل)' : 'قيد التنفيذ'}</Badge>
                    </button>
                  ))}
                </div>
              ) : <p className="text-center text-sm text-muted-foreground py-4">لا توجد مهام في قائمتك.</p>}
            </CardContent>
          </Card>
          {/* إضافة: بطاقة الأرشيف الجديدة */}
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Archive className="ml-2 h-5 w-5"/>أرشيفي</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div> : myArchive.length > 0 ? (
                <div className="space-y-2">
                  {myArchive.map(req => (
                    <button key={req.id} onClick={() => setSelectedRequest(req)} className={cn("w-full text-right p-3 rounded-lg border", selectedRequest?.id === req.id ? "bg-primary/10 border-primary" : "hover:bg-accent")}>
                      <p className="font-semibold">{req.title}</p>
                      <Badge variant="success">مكتمل</Badge>
                    </button>
                  ))}
                </div>
              ) : <p className="text-center text-sm text-muted-foreground py-4">لا توجد تصميمات مكتملة في أرشيفك.</p>}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <AnimatePresence>
            {selectedRequest ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <RequestDetailsView key={selectedRequest.id} request={selectedRequest} myId={myId} onUpdate={() => { fetchRequests(); setSelectedRequest(null); }} onClose={() => setSelectedRequest(null)} />
              </motion.div>
            ) : (
              <Card className="flex items-center justify-center h-96 sticky top-24">
                <p className="text-muted-foreground">الرجاء اختيار طلب من القائمة لعرض تفاصيله.</p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}