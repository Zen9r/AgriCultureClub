'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Activity, Award, UserCheck, UserX, Check, Briefcase, 
  Calendar, Loader2, TrendingUp, Zap, User, Edit2, Target, Save
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

// --- Types ---
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

interface PastEventsTabProps {
  registrations: Registration[];
  eventHours: number;
  extraHours: number;
  isLoading: boolean;
  userGoal?: number; // User's custom goal from database
  userId?: string; // User ID for updating goal
}

const statusConfig = {
  attended: { 
    text: 'حضر', 
    icon: UserCheck, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-r-green-500',
    dotColor: 'bg-green-500'
  },
  absent: { 
    text: 'غائب', 
    icon: UserX, 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-r-red-500',
    dotColor: 'bg-red-500'
  },
  registered: { 
    text: 'مسجل', 
    icon: Check, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-r-blue-500',
    dotColor: 'bg-blue-500'
  },
};

const roleConfig = {
  organizer: { 
    text: 'منظم', 
    icon: Zap,
    color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
  },
  attendee: { 
    text: 'حضور', 
    icon: User,
    color: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600'
  },
};

// --- Compact Timeline Event (Enhanced) ---
function CompactTimelineEvent({ registration, isLast }: { registration: Registration; isLast: boolean }) {
  if (!registration.events) return null;

  const statusInfo = statusConfig[registration.status as keyof typeof statusConfig] || statusConfig.registered;
  const StatusIcon = statusInfo.icon;
  
  const isOrganizer = registration.role?.toLowerCase() === 'organizer';
  const roleInfo = roleConfig[isOrganizer ? 'organizer' : 'attendee'];
  const RoleIcon = roleInfo.icon;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: date.toLocaleDateString('ar-SA', { day: 'numeric' }),
      month: date.toLocaleDateString('ar-SA', { month: 'short' }),
    };
  };

  const dateObj = formatDate(registration.events.start_time);

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Timeline Side */}
      <div className="flex flex-col items-center">
        {/* Date */}
        <div className="flex flex-col items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-sm">
          <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">{dateObj.day}</span>
          <span className="text-[9px] text-gray-600 dark:text-gray-400 font-medium">{dateObj.month}</span>
        </div>
        
        {/* Dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className={`w-3 h-3 ${statusInfo.dotColor} rounded-full shadow-md ring-2 ring-white dark:ring-gray-900 z-10 my-1`}
        />
        
        {/* Line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-800" />
        )}
      </div>

      {/* Content Card */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`flex-1 rounded-lg p-3 border-r-4 ${statusInfo.borderColor} ${statusInfo.bgColor} shadow-sm`}
      >
        {/* Title */}
        <h4 className="font-bold text-sm leading-tight mb-2">{registration.events.title}</h4>
        
        {/* Status and Role Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {/* Status Badge */}
          <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border-0 text-xs px-2 py-0.5 gap-1`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.text}
          </Badge>
          
          {/* Role Badge */}
          <Badge variant="outline" className={`text-xs px-2 py-0.5 gap-1 ${roleInfo.color}`}>
            <RoleIcon className="h-3 w-3" />
            {roleInfo.text}
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}

// --- Goal Setting Dialog ---
function GoalSettingDialog({ 
  isOpen, 
  onClose, 
  currentGoal, 
  userId,
  onGoalUpdated 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  currentGoal: number;
  userId?: string;
  onGoalUpdated: (newGoal: number) => void;
}) {
  const [goalValue, setGoalValue] = useState(currentGoal.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const newGoal = parseInt(goalValue, 10);
    
    if (isNaN(newGoal) || newGoal < 10 || newGoal > 500) {
      toast.error('يرجى إدخال هدف بين 10 و 500 ساعة');
      return;
    }

    if (!userId) {
      toast.error('خطأ: لم يتم العثور على معرف المستخدم');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ voluntary_hours_goal: newGoal })
        .eq('id', userId);

      if (error) throw error;

      toast.success('تم تحديث هدفك بنجاح! 🎯');
      onGoalUpdated(newGoal);
      onClose();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error('فشل تحديث الهدف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            حدد هدفك للساعات التطوعية
          </DialogTitle>
          <DialogDescription>
            اختر عدد الساعات التي تريد تحقيقها. سيساعدك هذا في تتبع تقدمك!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-base font-semibold">
              هدفك بالساعات
            </Label>
            <Input
              id="goal"
              type="number"
              min="10"
              max="500"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              className="h-12 text-lg font-bold text-center"
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground text-center">
              (الحد الأدنى: 10 ساعات | الحد الأقصى: 500 ساعة)
            </p>
          </div>

          {/* Preview */}
          {parseInt(goalValue, 10) > 0 && !isNaN(parseInt(goalValue, 10)) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center"
            >
              <p className="text-sm text-muted-foreground mb-1">هدفك الجديد</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                {goalValue} ساعة
              </p>
            </motion.div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            إلغاء
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                حفظ الهدف
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Hours Statistics Component (Enhanced) ---
function MobileHoursStats({ 
  eventHours, 
  extraHours, 
  userGoal, 
  userId,
  onGoalUpdated 
}: { 
  eventHours: number; 
  extraHours: number;
  userGoal: number;
  userId?: string;
  onGoalUpdated: (newGoal: number) => void;
}) {
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const totalHours = eventHours + extraHours;
  const targetHours = userGoal;
  const progressPercentage = Math.min((totalHours / targetHours) * 100, 100);

  // Data for bar chart
  const chartData = [
    { name: 'ساعات الفعاليات', value: eventHours, color: '#4CAF50' },
    { name: 'ساعات إضافية', value: extraHours, color: '#42A5F5' },
  ];

  return (
    <div className="space-y-6">
      {/* Circular Progress - Total Hours */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <div className="relative inline-flex">
          <svg className="w-40 h-40 transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="80"
              cy="80"
              r="72"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="80"
              cy="80"
              r="72"
              stroke="url(#gradient)"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 72}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 72 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 72 * (1 - progressPercentage / 100) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4CAF50" />
                <stop offset="100%" stopColor="#42A5F5" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Award className="h-6 w-6 text-amber-500 mb-1" />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent"
            >
              {totalHours.toFixed(1)}
            </motion.span>
            <span className="text-xs text-muted-foreground font-medium">إجمالي الساعات</span>
          </div>
        </div>

        {/* Progress Info */}
        <div className="flex items-center justify-center gap-1.5 text-xs mt-3">
          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
          <span className="text-muted-foreground">
            {progressPercentage.toFixed(0)}% من هدفك ({targetHours} ساعة)
          </span>
        </div>

        {/* Edit Goal Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsGoalDialogOpen(true)}
          className="mt-2 gap-1.5 h-8 text-xs"
        >
          <Edit2 className="h-3 w-3" />
          تعديل الهدف
        </Button>
      </motion.div>

      <Separator />

      {/* Bar Chart */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          توزيع الساعات
        </h4>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartData} layout="horizontal">
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={90}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '11px',
                padding: '8px'
              }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Separator />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calendar className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">فعاليات</span>
          </div>
          <span className="text-2xl font-bold text-green-900 dark:text-green-100 block">
            {eventHours.toFixed(1)}
          </span>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03 }}
          className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">إضافية</span>
          </div>
          <span className="text-2xl font-bold text-blue-900 dark:text-blue-100 block">
            {extraHours.toFixed(1)}
          </span>
        </motion.div>
      </div>

      {/* Goal Setting Dialog */}
      <GoalSettingDialog
        isOpen={isGoalDialogOpen}
        onClose={() => setIsGoalDialogOpen(false)}
        currentGoal={targetHours}
        userId={userId}
        onGoalUpdated={onGoalUpdated}
      />
    </div>
  );
}

// --- Main Component ---
export default function PastEventsTab({ 
  registrations, 
  eventHours, 
  extraHours, 
  isLoading,
  userGoal = 50, // Default to 50 if not provided
  userId
}: PastEventsTabProps) {
  const [currentGoal, setCurrentGoal] = useState(userGoal);

  // Sort by date (most recent first)
  const sortedRegistrations = [...registrations]
    .filter(reg => reg.events)
    .sort((a, b) => {
      if (!a.events || !b.events) return 0;
      return new Date(b.events.start_time).getTime() - new Date(a.events.start_time).getTime();
    });

  const handleGoalUpdated = (newGoal: number) => {
    setCurrentGoal(newGoal);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Hours Statistics Card (Top on Mobile) */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl shadow-md">
                <Award className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">إحصائيات الساعات</CardTitle>
                <CardDescription className="text-sm">إنجازاتك الرقمية</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <MobileHoursStats 
              eventHours={eventHours} 
              extraHours={extraHours}
              userGoal={currentGoal}
              userId={userId}
              onGoalUpdated={handleGoalUpdated}
            />
          )}
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">سجل النشاط</CardTitle>
              <CardDescription className="text-sm">رحلتك مع النادي</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : sortedRegistrations.length > 0 ? (
            <div className="pt-2">
              {sortedRegistrations.map((reg, index) => (
                <CompactTimelineEvent
                  key={reg.id}
                  registration={reg}
                  isLast={index === sortedRegistrations.length - 1}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="inline-flex p-6 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Activity className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">لم تبدأ رحلتك بعد</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                لم تشارك في أي فعاليات سابقة. ابدأ الآن واكتشف عالم النادي!
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
