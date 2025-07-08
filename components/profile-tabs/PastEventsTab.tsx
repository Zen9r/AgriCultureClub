'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Award, UserCheck, UserX, Check } from 'lucide-react';

// --- تعريف أنواع البيانات لتتوافق مع ProfilePage ---
interface Event {
  id: number;
  title: string;
  start_time: string;
}

interface Registration {
  id: number;
  role: string;
  status: string; // 'attended', 'absent', 'registered'
  hours: number;
  events: Event | null;
}

// --- واجهة الخصائص (Props) التي يستقبلها المكون ---
interface PastEventsTabProps {
  registrations: Registration[];
  totalHours: number; // تأكد من وجود هذا السطر
  isLoading: boolean;
}

// --- خرائط لتحويل القيم الإنجليزية إلى نصوص عربية وأيقونات ---
const statusMap: { [key: string]: { text: string; icon: React.ReactNode; variant: 'success' | 'destructive' | 'secondary' } } = {
  attended: { text: 'حاضر', icon: <UserCheck size={14} />, variant: 'success' },
  absent: { text: 'غائب', icon: <UserX size={14} />, variant: 'destructive' },
  registered: { text: 'مسجل (لم يتم التحضير)', icon: <Check size={14} />, variant: 'secondary' },
};

const roleMap: { [key: string]: { text: string; } } = {
  attendee: { text: 'حضور' },
  organizer: { text: 'منظم' },
};

// --- المكون الرئيسي للتبويب ---
export default function PastEventsTab({ registrations }: PastEventsTabProps) {
  
  // استخدام useMemo لحساب مجموع الساعات فقط عند تغير قائمة الفعاليات
  const totalHours = useMemo(() => {
    if (!registrations) return 0;
    // يتم جمع الساعات من حقل 'hours' مباشرة كما هو محدد في ProfilePage
    return registrations.reduce((sum, reg) => sum + (reg.hours || 0), 0);
  }, [registrations]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>سجل النشاط</CardTitle>
          <CardDescription>نظرة على تاريخ مشاركاتك في فعاليات النادي ومجموع ساعاتك المكتسبة.</CardDescription>
        </CardHeader>
        <CardContent>
          {registrations && registrations.length > 0 ? (
            <div className="space-y-3">
              {registrations.map((reg) => {
                if (!reg.events) return null; // تجاهل أي تسجيل بدون فعالية مرتبطة

                const statusInfo = statusMap[reg.status] || { text: reg.status, icon: <Check />, variant: 'secondary' };
                const roleInfo = roleMap[reg.role] || { text: reg.role };
                
                return (
                   <div key={reg.id} className="border rounded-lg p-3 flex justify-between items-center bg-background">
                     <div>
                       <p className="font-semibold text-gray-800 dark:text-gray-100">{reg.events.title}</p>
                       <p className="text-sm text-muted-foreground">
                         بتاريخ: {new Date(reg.events.start_time).toLocaleDateString('ar-SA')}
                       </p>
                     </div>
                     <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant="outline">دورك: {roleInfo.text}</Badge>
                        <Badge variant="secondary" className="flex items-center gap-1.5">
  {statusInfo.icon}
  <span>{statusInfo.text}</span>
</Badge>
                     </div>
                   </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4">لم تشارك في أي فعاليات سابقة بعد.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
          <h3 className="font-bold text-lg">ملخص الساعات</h3>
          <div className="flex items-center gap-2 text-primary font-semibold text-2xl">
            <Award className="h-8 w-8 text-yellow-500" />
            <span className="text-gray-800 dark:text-gray-100">{totalHours.toFixed(1)}</span>
            <span className="text-base font-normal text-muted-foreground">ساعة مكتسبة</span>
          </div>
          <p className="text-xs text-muted-foreground">
            * يتم حساب الساعات فقط للفعاليات التي تم تأكيد حضورك فيها.
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
