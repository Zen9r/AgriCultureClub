'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox, Check, X, Archive, ListChecks, User, Phone, Image as ImageIcon, Briefcase, Users, Hash, Clock, FileText, MessageSquare } from 'lucide-react';
import { Label } from '@/components/ui/label';

// --- Types ---
type HourRequestRecord = {
  id: string; created_at: string; user_id: string; activity_title: string; task_description: string;
  task_type: string; image_url: string | null; status: string; awarded_hours: number | null;
  notes: string | null; reviewed_by: string | null;
};

type ProfileRecord = {
  id: string; full_name: string; student_id: string; role: string; committee: string; phone_number: string;
};

type CombinedRequest = HourRequestRecord & {
  requester_name?: string; requester_student_id?: string; requester_role?: string;
  requester_committee?: string; requester_phone?: string; reviewed_by_name?: string;
};

type ReviewFormData = { notes: string; awarded_hours: string; };

export default function RecordHoursTab() {
  const [allRequests, setAllRequests] = useState<CombinedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<ReviewFormData>();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    
    // 1. Fetch all requests from the table
    const { data: requests, error: requestsError } = await supabase
      .from('extra_hours_requests').select('*').order('created_at', { ascending: false });

    if (requestsError) {
      toast.error("فشل جلب طلبات الساعات.");
      setIsLoading(false);
      return;
    }
    
    // 2. Collect all unique user IDs
    const userIds = Array.from(new Set(
      requests.flatMap(r => [r.user_id, r.reviewed_by]).filter((id): id is string => id != null)
    ));

    if (userIds.length === 0) {
      setAllRequests(requests);
      setIsLoading(false);
      return;
    }

    // 3. Fetch all corresponding profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles').select('*').in('id', userIds);

    if (profilesError) {
      toast.error("فشل جلب بيانات المستخدمين.");
      setAllRequests(requests);
      setIsLoading(false);
      return;
    }
    
    // 4. Combine the data
    const profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
    const combinedData = requests.map((req): CombinedRequest => ({
      ...req,
      requester_name: profilesMap.get(req.user_id)?.full_name,
      requester_student_id: profilesMap.get(req.user_id)?.student_id,
      requester_role: profilesMap.get(req.user_id)?.role,
      requester_committee: profilesMap.get(req.user_id)?.committee,
      requester_phone: profilesMap.get(req.user_id)?.phone_number,
      reviewed_by_name: req.reviewed_by ? profilesMap.get(req.reviewed_by)?.full_name : undefined,
    }));

    setAllRequests(combinedData);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  const pendingRequests = allRequests.filter(r => r.status === 'pending');
  const archivedRequests = allRequests.filter(r => r.status === 'approved' || r.status === 'rejected');

  const handleReview = async (requestId: string, status: 'approved' | 'rejected', data: ReviewFormData) => {
    setIsSubmitting(true);
    if (status === 'approved' && (!data.awarded_hours || data.awarded_hours === '')) {
      toast.error("عند الموافقة، يجب تحديد عدد الساعات.");
      setIsSubmitting(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("User not found"); setIsSubmitting(false); return; }

    const updateData = {
      status,
      notes: data.notes || null,
      awarded_hours: status === 'approved' ? parseInt(data.awarded_hours, 10) : null,
      reviewed_by: user.id,
    };
    
    const { error } = await supabase.from('extra_hours_requests').update(updateData).eq('id', requestId);
    
    if (error) { toast.error("فشل تحديث الطلب."); console.error("Update Error:", error); }
    else { toast.success("تم تحديث حالة الطلب بنجاح."); reset(); fetchData(); }
    setIsSubmitting(false);
  };
    
  const renderRequesterDetails = (req: CombinedRequest) => (
    <Card className="bg-background shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><User className="ml-2 h-5 w-5 text-primary" />تفاصيل مقدم الطلب</CardTitle></CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div className="flex items-center"><strong>الاسم:</strong><span className="mr-2">{req.requester_name || 'غير متوفر'}</span></div>
                <div className="flex items-center"><Hash className="ml-2 h-4 w-4 text-muted-foreground" /><strong>الرقم الجامعي:</strong><span className="mr-2">{req.requester_student_id || 'N/A'}</span></div>
                <div className="flex items-center"><Users className="ml-2 h-4 w-4 text-muted-foreground" /><strong>اللجنة:</strong><Badge variant="secondary" className="mr-2">{req.requester_committee || 'N/A'}</Badge></div>
                <div className="flex items-center"><Briefcase className="ml-2 h-4 w-4 text-muted-foreground" /><strong>المنصب:</strong><Badge variant="secondary" className="mr-2">{req.requester_role || 'N/A'}</Badge></div>
                <div className="flex items-center col-span-full"><Phone className="ml-2 h-4 w-4 text-muted-foreground" /><strong>للتواصل:</strong><span className="mr-2">{req.requester_phone || 'لا يوجد'}</span></div>
            </div>
        </CardContent>
    </Card>
  );

  const renderTaskDetails = (req: CombinedRequest) => (
     <Card className="bg-background shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><FileText className="ml-2 h-5 w-5 text-primary" />تفاصيل المهمة</CardTitle></CardHeader>
        <CardContent>
            <div className="space-y-3">
                <div className="flex items-center text-sm"><strong>نوع المهمة:</strong><Badge variant="outline" className="mr-2">{req.task_type}</Badge></div>
                <p className="text-base text-foreground/80 leading-relaxed">{req.task_description}</p>
                {req.image_url && (
                    <div className="pt-2">
                        <h5 className="font-semibold text-sm mb-2">الإثبات المرفق:</h5>
                        <a href={req.image_url} target="_blank" rel="noopener noreferrer">
                            <img src={req.image_url} alt="Proof" className="max-h-64 rounded-lg border shadow-md"/>
                        </a>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
  );

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  
  return (
    <div dir="rtl" className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 min-h-screen">
      <Tabs defaultValue="pending" className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending"><ListChecks className="ml-2 h-4 w-4"/> طلبات معلقة ({pendingRequests.length})</TabsTrigger>
          <TabsTrigger value="archive"><Archive className="ml-2 h-4 w-4"/> الأرشيف ({archivedRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
            {pendingRequests.length > 0 ? (
                <Accordion type="single" collapsible className="w-full space-y-4">
                  {pendingRequests.map((req) => (
                    <AccordionItem value={req.id} key={req.id} className="border-b-0">
                      <Card><AccordionTrigger className="p-4 hover:no-underline text-right w-full">
                           <div className="flex justify-between items-center w-full">
                              <h3 className="font-semibold text-lg text-primary">{req.activity_title}</h3>
                              <p className="text-sm text-muted-foreground">{req.requester_name}</p>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-0 pb-4">
                          <div className="space-y-4">
                            {renderRequesterDetails(req)}
                            {renderTaskDetails(req)}
                             <Card className="bg-background shadow-sm">
                                <CardHeader className="pb-3"><CardTitle className="text-lg">الإجراء</CardTitle></CardHeader>
                                <CardContent>
                                    <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                                        <div className="space-y-2"><Label>الساعات المعتمدة (عند الموافقة)</Label>
                                            <Select onValueChange={(value) => register('awarded_hours').onChange({ target: { name: 'awarded_hours', value } })}>
                                                <SelectTrigger><SelectValue placeholder="اختر عدد الساعات" /></SelectTrigger>
                                                <SelectContent>{Array.from({ length: 10 }, (_, i) => i + 1).map(h => <SelectItem key={h} value={String(h)}>{h} ساعات</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2"><Label>ملاحظات</Label><Textarea placeholder="اكتب ملاحظاتك هنا..." {...register('notes')} /></div>
                                        <div className="flex gap-2 pt-2">
                                            <Button size="sm" variant="success" onClick={handleSubmit(data => handleReview(req.id, 'approved', data))} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="ml-2 h-4 w-4" />} موافقة</Button>
                                            <Button size="sm" variant="destructive" onClick={handleSubmit(data => handleReview(req.id, 'rejected', data))} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="ml-2 h-4 w-4" />} رفض</Button>
                                        </div>
                                    </form>
                                </CardContent>
                             </Card>
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  ))}
                </Accordion>
            ) : <div className="text-center py-16 text-muted-foreground"><Inbox className="mx-auto h-16 w-16" /><p className="mt-4 text-lg">لا توجد طلبات معلقة حاليًا.</p></div>}
        </TabsContent>
        
        <TabsContent value="archive" className="mt-6">
          {archivedRequests.length > 0 ? (
                 <Accordion type="single" collapsible className="w-full space-y-4">
                  {archivedRequests.map((req) => (
                    <AccordionItem value={req.id} key={req.id} className="border-b-0">
                      <Card>
                        <AccordionTrigger className="p-4 hover:no-underline text-right w-full">
                           <div className="flex justify-between items-center w-full">
                              <h3 className="font-semibold text-lg">{req.activity_title}</h3>
                              <Badge variant={req.status === 'approved' ? 'success' : 'destructive'}>{req.status === 'approved' ? 'مقبول' : 'مرفوض'}</Badge>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pt-0 pb-4">
                            <div className="space-y-4">
                                {renderRequesterDetails(req)}
                                {renderTaskDetails(req)}
                                <Card className="bg-background shadow-sm">
                                    <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center"><Check className="ml-2 h-5 w-5"/> تفاصيل المراجعة</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-3 text-sm">
                                            <div><strong>تمت المراجعة بواسطة:</strong><span className="mr-2">{req.reviewed_by_name || 'غير محدد'}</span></div>
                                            {req.status === 'approved' && <div><Clock className="inline ml-1 h-4 w-4"/><strong>الساعات المعتمدة:</strong><span className="mr-2">{req.awarded_hours || 'N/A'}</span></div>}
                                            {req.notes && <div className="pt-3 border-t"><p className="flex items-start"><MessageSquare className="ml-2 h-4 w-4 mt-1"/><strong>ملاحظات المراجع:</strong><span className="mr-2">{req.notes}</span></p></div>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  ))}
                 </Accordion>
          ) : <div className="text-center py-16 text-muted-foreground"><Inbox className="mx-auto h-16 w-16" /><p className="mt-4 text-lg">الأرشيف فارغ.</p></div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}