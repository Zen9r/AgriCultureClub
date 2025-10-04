'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';

// --- UI Components ---
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Inbox, Check, X, Archive, ListChecks, User, Phone, Image as ImageIcon, Briefcase, Users, Hash, Clock, FileText, MessageSquare, Plus, Search } from 'lucide-react';
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
  const [showCustomHourInput, setShowCustomHourInput] = useState<{ [key: string]: boolean }>({});
  const [customHours, setCustomHours] = useState<{ [key: string]: string }>({});
  const [selectedHourOption, setSelectedHourOption] = useState<{ [key: string]: string }>({});
  const { register, handleSubmit, reset, setValue } = useForm<ReviewFormData>();
  
  // Manual Hours Dialog State
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState<ProfileRecord | null>(null);
  const [manualHours, setManualHours] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

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

  const handleHourSelection = (requestId: string, value: string) => {
    setSelectedHourOption(prev => ({ ...prev, [requestId]: value }));
    
    if (value === 'more') {
      setShowCustomHourInput(prev => ({ ...prev, [requestId]: true }));
      setValue('awarded_hours', '');
    } else {
      setShowCustomHourInput(prev => ({ ...prev, [requestId]: false }));
      setValue('awarded_hours', value);
    }
  };

  const handleCustomHoursChange = (requestId: string, value: string) => {
    setCustomHours(prev => ({ ...prev, [requestId]: value }));
    setValue('awarded_hours', value);
  };

  const handleReview = async (requestId: string, status: 'approved' | 'rejected', data: ReviewFormData) => {
    setIsSubmitting(true);
    
    // Get the awarded hours from either the select or custom input
    let finalAwardedHours = data.awarded_hours;
    if (showCustomHourInput[requestId]) {
      finalAwardedHours = customHours[requestId] || '';
    }
    
    if (status === 'approved' && (!finalAwardedHours || finalAwardedHours === '')) {
      toast.error("عند الموافقة، يجب تحديد عدد الساعات.");
      setIsSubmitting(false);
      return;
    }

    // Validate custom hours if using custom input
    if (showCustomHourInput[requestId]) {
      const hours = parseInt(finalAwardedHours, 10);
      if (isNaN(hours) || hours < 11 || hours > 99) {
        toast.error("يرجى إدخال عدد ساعات بين 11 و 99");
        setIsSubmitting(false);
        return;
      }
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("User not found"); setIsSubmitting(false); return; }

    const updateData = {
      status,
      notes: data.notes || null,
      awarded_hours: status === 'approved' ? parseInt(finalAwardedHours, 10) : null,
      reviewed_by: user.id,
    };
    
    const { error } = await supabase.from('extra_hours_requests').update(updateData).eq('id', requestId);
    
    if (error) { toast.error("فشل تحديث الطلب."); console.error("Update Error:", error); }
    else { 
      toast.success("تم تحديث حالة الطلب بنجاح."); 
      reset(); 
      // Clear state for this request
      setShowCustomHourInput(prev => ({ ...prev, [requestId]: false }));
      setCustomHours(prev => ({ ...prev, [requestId]: '' }));
      setSelectedHourOption(prev => ({ ...prev, [requestId]: '' }));
      fetchData(); 
    }
    setIsSubmitting(false);
  };

  // Manual Hours Functions
  const handleUserSearch = async () => {
    if (!userSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, student_id, role, committee, phone_number')
        .or(`full_name.ilike.%${userSearchQuery}%,student_id.ilike.%${userSearchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (e: any) {
      toast.error('فشل البحث عن المستخدم');
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualHoursSubmit = async () => {
    if (!selectedUser) {
      toast.error('الرجاء اختيار مستخدم');
      return;
    }
    if (!manualHours || parseInt(manualHours) <= 0) {
      toast.error('الرجاء إدخال عدد ساعات صحيح');
      return;
    }
    if (!manualDescription.trim()) {
      toast.error('الرجاء إدخال وصف للساعات المضافة');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('extra_hours_requests').insert({
        user_id: selectedUser.id,
        activity_title: 'ساعات مضافة يدوياً',
        task_description: manualDescription,
        task_type: 'أخرى',
        status: 'approved',
        awarded_hours: parseInt(manualHours),
        reviewed_by: user.id,
        notes: 'تمت الإضافة يدوياً من قبل إدارة الموارد البشرية'
      });

      if (error) throw error;

      toast.success(`تمت إضافة ${manualHours} ساعة بنجاح إلى ${selectedUser.full_name}`);
      
      // Reset form
      setIsManualDialogOpen(false);
      setSelectedUser(null);
      setUserSearchQuery('');
      setSearchResults([]);
      setManualHours('');
      setManualDescription('');
      
      // Refresh data
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'فشل إضافة الساعات');
      console.error(e);
    } finally {
      setIsSubmittingManual(false);
    }
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
      {/* Manual Hours Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <div className="max-w-4xl mx-auto mb-4">
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4"/>
              إضافة ساعات يدوياً لمستخدم
            </Button>
          </DialogTrigger>
        </div>
        
        <DialogContent className="sm:max-w-[600px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة ساعات يدوياً</DialogTitle>
            <DialogDescription>
              قم بإضافة ساعات مباشرة لأي مستخدم في النظام
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>البحث عن المستخدم</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="ابحث بالاسم أو الرقم الجامعي..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleUserSearch()}
                />
                <Button onClick={handleUserSearch} disabled={isSearching} variant="outline">
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchResults([]);
                      setUserSearchQuery('');
                    }}
                    className={`w-full text-right p-3 rounded border hover:bg-accent transition-colors ${
                      selectedUser?.id === user.id ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.student_id}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Selected User Display */}
            {selectedUser && (
              <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedUser.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.student_id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    <X className="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            )}

            {/* Hours Input */}
            <div className="space-y-2">
              <Label>عدد الساعات*</Label>
              <Input
                type="number"
                min="1"
                max="99"
                placeholder="مثال: 5"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>سبب إضافة الساعات*</Label>
              <Textarea
                placeholder="مثال: المساعدة في تنظيم الفعالية الخاصة..."
                rows={3}
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsManualDialogOpen(false);
                setSelectedUser(null);
                setUserSearchQuery('');
                setSearchResults([]);
                setManualHours('');
                setManualDescription('');
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleManualHoursSubmit}
              disabled={isSubmittingManual || !selectedUser || !manualHours || !manualDescription}
            >
              {isSubmittingManual ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2"/>
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-2"/>
                  إضافة الساعات
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                                        <div className="space-y-2">
                                            <Label>الساعات المعتمدة (عند الموافقة)</Label>
                                            <Select 
                                              value={selectedHourOption[req.id] || ''}
                                              onValueChange={(value) => handleHourSelection(req.id, value)}
                                            >
                                                <SelectTrigger><SelectValue placeholder="اختر عدد الساعات" /></SelectTrigger>
                                                <SelectContent>
                                                  {Array.from({ length: 10 }, (_, i) => i + 1).map(h => (
                                                    <SelectItem key={h} value={String(h)}>
                                                      {h} {h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : 'ساعات'}
                                                    </SelectItem>
                                                  ))}
                                                  <SelectItem value="more" className="font-semibold text-primary">
                                                    أكثر...
                                                  </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        
                                        {showCustomHourInput[req.id] && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-2"
                                          >
                                            <Label htmlFor={`custom-hours-${req.id}`}>أدخل عدد الساعات (11-99)*</Label>
                                            <Input
                                              id={`custom-hours-${req.id}`}
                                              type="number"
                                              min="11"
                                              max="99"
                                              placeholder="مثال: 15"
                                              value={customHours[req.id] || ''}
                                              onChange={(e) => handleCustomHoursChange(req.id, e.target.value)}
                                              className="h-11"
                                            />
                                            {customHours[req.id] && (
                                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                                سيتم اعتماد {customHours[req.id]} {parseInt(customHours[req.id]) === 1 ? 'ساعة' : parseInt(customHours[req.id]) === 2 ? 'ساعتان' : 'ساعات'}
                                              </p>
                                            )}
                                          </motion.div>
                                        )}

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