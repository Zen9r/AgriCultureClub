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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, AlertTriangle, Inbox, ListTodo, Link as LinkIcon, 
  Upload, X, Archive, ChevronLeft, CheckCircle, Clock, 
  FileText, ZoomIn, Send
} from 'lucide-react';

type DesignRequest = {
  id: string; 
  created_at: string; 
  title: string; 
  description: string; 
  deadline: string | null;
  design_type: string;
  status: 'new' | 'in_progress' | 'awaiting_review' | 'completed' | 'rejected';
  design_url: string | null; 
  feedback_notes: string | null; 
  assigned_to: string | null;
  requester_name: string | null; 
  assignee_name: string | null;
};

function RequestDetailsView({ 
  request, 
  myId, 
  onUpdate, 
  onClose,
  isMobile = false
}: { 
  request: DesignRequest; 
  myId: string | null; 
  onUpdate: () => void; 
  onClose: () => void;
  isMobile?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [designUrl, setDesignUrl] = useState(request.design_url || '');
  const [isImageZoomed, setIsImageZoomed] = useState(false);

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
    if (!designUrl) { 
      toast.error("الرجاء رفع ملف أو وضع رابط أولاً."); 
      return; 
    }
    const { error } = await supabase
      .from('design_requests')
      .update({ status: 'awaiting_review', design_url: designUrl })
      .eq('id', request.id);
    
    if (error) { 
      toast.error("فشل تسليم التصميم."); 
    } else { 
      toast.success("تم تسليم التصميم للمراجعة."); 
      onUpdate(); 
    }
  };

  const canSubmit = (request.status === 'in_progress' || request.status === 'rejected') && request.assigned_to === myId;

  return (
    <motion.div
      initial={{ opacity: 0, x: isMobile ? 100 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isMobile ? 100 : 20 }}
      className="h-full flex flex-col"
    >
      {/* Mobile Header with Back Button */}
      {isMobile && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            العودة للقائمة
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* Request Header */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{request.title}</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{request.design_type}</Badge>
                  <span>•</span>
                  <span>طلب من: {request.requester_name || 'غير معروف'}</span>
                </div>
              </div>
              {!isMobile && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Separator />
          </div>

          {/* Request Details */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">الوصف:</p>
              <p className="text-base leading-relaxed">{request.description}</p>
            </div>
            
            {request.deadline && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-1">الموعد النهائي:</p>
                <p className="text-base">{new Date(request.deadline).toLocaleDateString('ar-SA')}</p>
              </div>
            )}
          </div>

          {/* Rejection Notes Alert */}
          {request.status === 'rejected' && request.feedback_notes && (
            <Alert variant="destructive" className="text-right">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-bold">ملاحظات الرفض</AlertTitle>
              <AlertDescription className="mt-2">{request.feedback_notes}</AlertDescription>
            </Alert>
          )}

          {/* Design Submission Section */}
          {canSubmit && (
            <Card className="border-2 border-dashed border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {request.status === 'rejected' ? 'إعادة تسليم التصميم' : 'تسليم التصميم'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="upload">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload" className="gap-2">
                      <Upload className="h-4 w-4"/>
                      رفع ملف
                    </TabsTrigger>
                    <TabsTrigger value="link" className="gap-2">
                      <LinkIcon className="h-4 w-4"/>
                      وضع رابط
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="space-y-3">
                    <Input 
                      type="file" 
                      accept="image/*,video/*,.pdf,.psd,.ai" 
                      onChange={e => e.target.files && handleImageUpload(e.target.files[0])} 
                      disabled={isUploading}
                      className="h-11"
                    />
                    {designUrl && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-400">تم رفع الملف بنجاح</span>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="link" className="space-y-3">
                    <Input 
                      placeholder="https://..." 
                      value={designUrl} 
                      onChange={e => setDesignUrl(e.target.value)}
                      className="h-11"
                      dir="ltr"
                    />
                  </TabsContent>
                </Tabs>

                {isUploading && (
                  <div className="flex items-center justify-center gap-2 p-4">
                    <Loader2 className="h-5 w-5 animate-spin"/>
                    <span className="text-sm">جاري الرفع...</span>
                  </div>
                )}

                <Button 
                  onClick={handleSubmitDesign} 
                  disabled={!designUrl || isUploading} 
                  className="w-full h-12 gap-2"
                >
                  <Send className="h-4 w-4" />
                  تسليم للمراجعة
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Current Design Preview */}
          {request.design_url && request.status === 'awaiting_review' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">التصميم المقدم</CardTitle>
              </CardHeader>
              <CardContent>
                {request.design_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                  <div className="relative group">
                    <img 
                      src={request.design_url} 
                      alt="Design Preview" 
                      className="rounded-lg border max-h-80 w-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setIsImageZoomed(true)}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black/50 p-3 rounded-full">
                        <ZoomIn className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <a 
                    href={request.design_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <FileText className="h-5 w-5" />
                    <span>عرض الملف/الفيديو</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assign to Me Button */}
          {request.status === 'new' && (
            <Button 
              onClick={async () => {
                const { error } = await supabase
                  .from('design_requests')
                  .update({ status: 'in_progress', assigned_to: myId })
                  .eq('id', request.id);
                
                if (error) { 
                  toast.error("فشل إسناد الطلب."); 
                } else { 
                  toast.success("تم إسناد الطلب إليك."); 
                  onUpdate(); 
                }
              }} 
              className="w-full h-12 gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <CheckCircle className="h-4 w-4" />
              إسناد الطلب لي والبدء بالعمل
            </Button>
          )}
        </div>
      </ScrollArea>

      {/* Image Zoom Modal */}
      <Dialog open={isImageZoomed} onOpenChange={setIsImageZoomed}>
        <DialogContent className="max-w-5xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>عرض مكبر للتصميم</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <img 
              src={request.design_url!} 
              alt="Zoomed Design" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default function DesignRequestsReviewTab() {
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DesignRequest | null>(null);
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { 
      setIsLoading(false); 
      return; 
    }
    setMyId(authData.user.id);
    
    const { data, error } = await supabase.rpc('get_all_design_requests');
    if (error) { 
      toast.error("فشل جلب الطلبات."); 
      console.error('Supabase RPC error:', error); 
    } else { 
      setRequests(data as DesignRequest[]); 
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { 
    fetchRequests(); 
  }, [fetchRequests]);

  const handleSelectRequest = (request: DesignRequest) => {
    setSelectedRequest(request);
    if (window.innerWidth < 1024) {
      setIsMobileDetailView(true);
    }
  };

  const handleCloseDetail = () => {
    if (window.innerWidth < 1024) {
      setIsMobileDetailView(false);
    }
    setSelectedRequest(null);
  };

  const newRequests = requests.filter(r => r.status === 'new');
  const myQueue = requests.filter(r => r.assigned_to === myId && (r.status === 'in_progress' || r.status === 'rejected'));
  const myArchive = requests.filter(r => r.assigned_to === myId && r.status === 'completed');

  // Request List Component
  const RequestList = () => (
    <div className="space-y-6">
      {/* New Requests */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Inbox className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg">طلبات جديدة</CardTitle>
              <CardDescription>{newRequests.length} طلب</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
          ) : newRequests.length > 0 ? (
            <div className="space-y-2">
              {newRequests.map((req, index) => (
                <motion.button
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectRequest(req)}
                  className={cn(
                    "w-full text-right p-4 rounded-xl transition-all touch-manipulation",
                    "border-2 hover:shadow-md active:scale-[0.98]",
                    selectedRequest?.id === req.id
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-400 shadow-md"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300"
                  )}
                >
                  <p className="font-bold text-base mb-1">{req.title}</p>
                  <p className="text-sm text-muted-foreground">
                    طلب من: {req.requester_name || 'غير معروف'}
                  </p>
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">لا توجد طلبات جديدة.</p>
          )}
        </CardContent>
      </Card>

      {/* My Current Tasks */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ListTodo className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">مهامي الحالية</CardTitle>
              <CardDescription>{myQueue.length} مهمة</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
          ) : myQueue.length > 0 ? (
            <div className="space-y-2">
              {myQueue.map((req, index) => (
                <motion.button
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectRequest(req)}
                  className={cn(
                    "w-full text-right p-4 rounded-xl transition-all touch-manipulation",
                    "border-2 hover:shadow-md active:scale-[0.98]",
                    selectedRequest?.id === req.id
                      ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-400 shadow-md"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-bold text-base">{req.title}</p>
                    <Badge 
                      variant={req.status === 'rejected' ? 'destructive' : 'default'}
                      className="gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      {req.status === 'rejected' ? 'مرفوض (يحتاج تعديل)' : 'قيد التنفيذ'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.design_type}
                  </p>
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">لا توجد مهام في قائمتك.</p>
          )}
        </CardContent>
      </Card>

      {/* My Archive */}
      <Card>
        <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Archive className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-lg">أرشيفي</CardTitle>
              <CardDescription>{myArchive.length} تصميم مكتمل</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
          ) : myArchive.length > 0 ? (
            <div className="space-y-2">
              {myArchive.map((req, index) => (
                <motion.button
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectRequest(req)}
                  className={cn(
                    "w-full text-right p-4 rounded-xl transition-all touch-manipulation",
                    "border-2 hover:shadow-md active:scale-[0.98]",
                    selectedRequest?.id === req.id
                      ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400 shadow-md"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-300"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-bold text-base">{req.title}</p>
                    <Badge variant="default" className="bg-green-600 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      مكتمل
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.design_type}
                  </p>
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">لا توجد تصميمات مكتملة في أرشيفك.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div dir="rtl" className="h-[calc(100vh-8rem)]">
      {/* Mobile View: Either list or detail */}
      <div className="lg:hidden h-full">
        <AnimatePresence mode="wait">
          {isMobileDetailView && selectedRequest ? (
            <Card key="detail" className="h-full overflow-hidden">
              <RequestDetailsView
                request={selectedRequest}
                myId={myId}
                onUpdate={() => {
                  fetchRequests();
                  setIsMobileDetailView(false);
                  setSelectedRequest(null);
                }}
                onClose={handleCloseDetail}
                isMobile
              />
            </Card>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto p-4"
            >
              <RequestList />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop View: Two-column layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6 h-full items-start">
        <ScrollArea className="col-span-1 h-full pr-4">
          <RequestList />
        </ScrollArea>

        <div className="col-span-2 h-full">
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <Card key={selectedRequest.id} className="h-full overflow-hidden">
                <RequestDetailsView
                  request={selectedRequest}
                  myId={myId}
                  onUpdate={() => {
                    fetchRequests();
                    setSelectedRequest(null);
                  }}
                  onClose={handleCloseDetail}
                />
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <Inbox className="h-20 w-20 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    الرجاء اختيار طلب من القائمة لعرض تفاصيله
                  </p>
                </div>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
