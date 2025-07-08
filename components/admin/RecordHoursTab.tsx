'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, User, Mail, Link as LinkIcon, AlertTriangle, Loader2, Phone, Briefcase, Hash } from 'lucide-react';

// --- Types ---
// This represents the joined data from `extra_hours_requests` and `profiles`
type HourRequestWithProfile = {
  id: string;
  activity_title: string;
  task_description: string;
  task_type: string;
  image_url: string | null;
  estimated_hours: number;
  // Supabase returns the related record as an array, even for one-to-one
  profiles: {
    full_name: string;
    student_id: string;
    email: string;
    phone_number: string;
  }[] | null;
};

// --- Main Component ---
export default function RecordHoursTab() {
  const [requests, setRequests] = useState<HourRequestWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Store ID of updating request
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch pending requests and join with the requester's profile
      const { data, error: fetchError } = await supabase
        .from('extra_hours_requests')
        .select(`
          id, activity_title, task_description, task_type, image_url, estimated_hours,
          profiles (full_name, student_id, email, phone_number)
        `)
        .eq('status', 'pending');

      if (fetchError) throw fetchError;
      setRequests(data as HourRequestWithProfile[]);
    } catch (e: any) {
      console.error(e);
      setError('فشل في جلب طلبات الساعات.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateRequest = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdating(id);
    try {
      const { error } = await supabase
        .from('extra_hours_requests')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;

      toast.success(`تم ${status === 'approved' ? 'الموافقة على' : 'رفض'} الطلب بنجاح.`);
      // Remove the handled request from the list for immediate UI feedback
      setRequests(prev => prev.filter(req => req.id !== id));
    } catch (e: any) {
      toast.error('فشل تحديث حالة الطلب.');
      console.error(e);
    } finally {
      setIsUpdating(null);
    }
  };
  
  const requesterProfile = (request: HourRequestWithProfile) => request.profiles?.[0];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>مراجعة طلبات الساعات الإضافية</CardTitle>
          <CardDescription>مراجعة الطلبات المعلقة المقدمة من الأعضاء واتخاذ الإجراء المناسب.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : error ? (
            <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />{error}</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 font-semibold">لا توجد طلبات معلقة حالياً.</p>
              <p className="text-sm">عمل رائع!</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {requests.map((req) => (
                <AccordionItem value={req.id} key={req.id}>
                  <AccordionTrigger>
                    <div>
                      <p className="font-semibold text-right">{req.activity_title}</p>
                      <p className="text-sm text-muted-foreground text-right">
                        بواسطة: {requesterProfile(req)?.full_name || 'غير معروف'}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3 text-sm">
                          <h4 className="font-semibold mb-2">تفاصيل الطلب</h4>
                          <p className="flex items-center gap-2"><Briefcase size={14} /> <strong>نوع المهمة:</strong> {req.task_type}</p>
                           <p className="flex items-center gap-2"><strong>الساعات المقترحة:</strong> {req.estimated_hours} ساعات</p>
                          <p><strong>وصف المهمة:</strong> {req.task_description}</p>
                          {req.image_url && (
                            <p><strong>رابط الإثبات:</strong> <a href={req.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1"><LinkIcon size={14}/> اضغط هنا للمشاهدة</a></p>
                          )}
                      </div>
                      {requesterProfile(req) && (
                        <div className="p-4 border dark:border-gray-700 rounded-lg space-y-3 text-sm">
                            <h4 className="font-semibold mb-2">معلومات مقدم الطلب</h4>
                            <p className="flex items-center gap-2"><User size={14} /> {requesterProfile(req)!.full_name}</p>
                            <p className="flex items-center gap-2"><Hash size={14} /> {requesterProfile(req)!.student_id}</p>
                             <p className="flex items-center gap-2"><Mail size={14} /> {requesterProfile(req)!.email}</p>
                            <p className="flex items-center gap-2"><Phone size={14} /> {requesterProfile(req)!.phone_number}</p>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                          <Button variant="destructive" size="sm" onClick={() => handleUpdateRequest(req.id, 'rejected')} disabled={isUpdating === req.id}>
                              {isUpdating === req.id ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <XCircle className="ml-2 h-4 w-4" />}
                              رفض
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleUpdateRequest(req.id, 'approved')} disabled={isUpdating === req.id}>
                              {isUpdating === req.id ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle className="ml-2 h-4 w-4" />}
                              موافقة
                          </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
