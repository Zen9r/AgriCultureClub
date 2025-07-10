'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Award, UserCheck, UserX, Check, Briefcase, Calendar, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// --- تعريف أنواع البيانات
interface EventDetails {
  id: number;
  title: string;
  start_time: string;
}

interface Registration {
  id: number;
  role: string;
  status: string;
  events: EventDetails | null;
}

// --- واجهة الخصائص (Props) التي يستقبلها المكون
interface PastEventsTabProps {
  registrations: Registration[];
  eventHours: number;
  extraHours: number;
  isLoading: boolean;
}

const statusMap: { [key: string]: { text: string; icon: React.ReactNode; } } = {
  attended: { text: 'حاضر', icon: <UserCheck size={14} /> },
  absent: { text: 'غائب', icon: <UserX size={14} /> },
  registered: { text: 'مسجل', icon: <Check size={14} /> },
};

const roleMap: { [key: string]: { text: string; } } = {
  attendee: { text: 'حضور' },
  organizer: { text: 'منظم' },
};

export default function PastEventsTab({ registrations, eventHours, extraHours, isLoading }: PastEventsTabProps) {
  
  const grandTotalHours = eventHours + extraHours;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardHeader>
          <CardTitle>سجل النشاط</CardTitle>
          <CardDescription>نظرة على تاريخ مشاركاتك في فعاليات النادي ومجموع ساعاتك المكتسبة.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : registrations && registrations.length > 0 ? (
            <div className="space-y-3">
              {registrations.map((reg) => {
                if (!reg.events) return null;
                const statusInfo = statusMap[reg.status] || { text: reg.status, icon: <Check /> };
               // نستخدم trim() لإزالة المسافات، و toLowerCase() لتوحيد حالة الأحرف
                const roleInfo = roleMap[reg.role?.replace(/'/g, '').trim().toLowerCase()] || { text: reg.role };
                
                return (
                   <div key={reg.id} className="border rounded-lg p-3 flex justify-between items-center bg-background">
                     <div>
                       <p className="font-semibold">{reg.events.title}</p>
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
        <CardFooter className="flex-col items-start gap-3 pt-4 border-t">
          <h3 className="font-bold text-lg">ملخص الساعات</h3>
          {isLoading ? <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="ml-2 h-4 w-4 animate-spin" />جاري حساب الساعات...</div> : (
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-muted-foreground"><Calendar className="ml-2 h-4 w-4" /><span>ساعات الفعاليات</span></div>
                <span className="font-semibold">{eventHours.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center text-muted-foreground"><Briefcase className="ml-2 h-4 w-4" /><span>ساعات إضافية معتمدة</span></div>
                <span className="font-semibold">{extraHours.toFixed(1)}</span>
              </div>
              <Separator className="my-3"/>
              <div className="flex w-full justify-between items-center text-primary font-semibold">
                <div className="flex items-center text-xl gap-2">
                    <Award className="h-7 w-7 text-yellow-500" />
                    <span>المجموع الكلي</span>
                </div>
                <span className="text-3xl font-bold">{grandTotalHours.toFixed(1)}</span>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
