'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, PenSquare, Link as LinkIcon, Check, X } from 'lucide-react';

// --- Types ---
// This type should be in a shared file, e.g., src/types/database.ts
// src/types/database.ts or in your component file
type DesignRequestWithProfile = {
  id: string;
  created_at: string;
  title: string;
  design_type: string;
  description: string;
  deadline: string | null;
  status: 'new' | 'in_progress' | 'completed' | 'rejected';
  design_url: string | null;
  // التعديل هنا: profiles الآن عبارة عن مصفوفة أو null
  profiles: {
    full_name: string;
  }[] | null; 
};
// --- Helper Components ---
function StatusBadge({ status }: { status: DesignRequestWithProfile['status'] }) {
    const statusStyles = {
        new: 'bg-blue-100 text-blue-800 border-blue-300',
        in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        completed: 'bg-green-100 text-green-800 border-green-300',
        rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    const statusText = {
        new: 'جديد',
        in_progress: 'قيد التنفيذ',
        completed: 'مكتمل',
        rejected: 'مرفوض',
    };
    return (
      <Badge variant="outline" className={`border ${statusStyles[status]}`}>
        {statusText[status]}
      </Badge>
    );
}

// --- Main Component ---
export default function DesignRequestsReviewTab() {
  const [requests, setRequests] = useState<DesignRequestWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DesignRequestWithProfile | null>(null);
  const [designUrlInput, setDesignUrlInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all design requests and join with the requester's profile
      const { data, error: fetchError } = await supabase
        .from('design_requests')
        .select(`
          id, created_at, title, design_type, description, deadline, status, design_url,
          profiles (full_name)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data as DesignRequestWithProfile[]);
    } catch (e: any) {
      setError("فشل في جلب طلبات التصميم.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenDialog = (request: DesignRequestWithProfile) => {
    setSelectedRequest(request);
    setDesignUrlInput(request.design_url || '');
  };

  const handleUpdate = async (updateData: Partial<DesignRequestWithProfile>) => {
    if (!selectedRequest) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('design_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);
        
      if (error) throw error;
      
      toast.success("تم تحديث الطلب بنجاح.");
      await fetchRequests(); // Refresh the list with updated data
      setSelectedRequest(null); // Close dialog
    } catch (e: any) {
      toast.error("فشل تحديث الطلب.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveDesignUrl = () => {
    handleUpdate({ design_url: designUrlInput, status: 'completed' });
  };

  const handleUpdateStatus = (status: DesignRequestWithProfile['status']) => {
    handleUpdate({ status });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">
        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
        {error}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>مراجعة طلبات التصميم</CardTitle>
          <CardDescription>لوحة تحكم لجنة التصميم لمتابعة الطلبات وتحديث حالتها.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان الطلب</TableHead>
                <TableHead className="hidden md:table-cell">مقدم الطلب</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="hidden sm:table-cell">تاريخ الطلب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} onClick={() => handleOpenDialog(req)} className="cursor-pointer">
                  <TableCell className="font-medium">{req.title}</TableCell>
                  <TableCell className="hidden md:table-cell">{req.profiles?.[0]?.full_name || 'غير معروف'}</TableCell>
                  <TableCell><StatusBadge status={req.status} /></TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {new Date(req.created_at).toLocaleDateString('ar-SA')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={(isOpen) => !isOpen && setSelectedRequest(null)}>
        {selectedRequest && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedRequest.title}</DialogTitle>
              <DialogDescription>
                طلب من: {selectedRequest.profiles?.[0]?.full_name} | النوع: {selectedRequest.design_type}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4 py-4 border-y">
              <p><strong>الوصف الكامل:</strong> {selectedRequest.description}</p>
              {selectedRequest.deadline && <p><strong>الموعد النهائي:</strong> {new Date(selectedRequest.deadline).toLocaleDateString('ar-SA')}</p>}
              <div className="space-y-2">
                <Label htmlFor="design_url">رابط التصميم النهائي</Label>
                <div className="flex gap-2">
                    <Input id="design_url" value={designUrlInput} onChange={e => setDesignUrlInput(e.target.value)} placeholder="https://example.com/final_design.png" />
                    <Button onClick={handleSaveDesignUrl} disabled={isUpdating || !designUrlInput}>
                       {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                       <span className="mr-2">حفظ الرابط</span>
                    </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <p className="text-sm text-muted-foreground flex-1">تغيير حالة الطلب:</p>
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('in_progress')} disabled={isUpdating}>
                 <PenSquare className="h-4 w-4 ml-2" />
                 قيد التنفيذ
              </Button>
               <Button size="sm" variant="success" onClick={() => handleUpdateStatus('completed')} disabled={isUpdating}>
                 <Check className="h-4 w-4 ml-2" />
                 مكتمل
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus('rejected')} disabled={isUpdating}>
                <X className="h-4 w-4 ml-2" />
                مرفوض
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </motion.div>
  );
}
