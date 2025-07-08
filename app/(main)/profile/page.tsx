"use client"

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import type { User } from '@supabase/supabase-js';
import { useMediaQuery } from 'react-responsive';

// --- استيراد المكونات والأيقونات ---
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, School, User as UserIcon, Edit, Loader2, ChevronsRight, ChevronsLeft, Users, RefreshCw, Clock } from 'lucide-react';
import Link from 'next/link';

// --- استيراد مكونات التبويبات المنفصلة ---
import UpcomingEventsTab from "@/components/profile-tabs/UpcomingEventsTab";
import PastEventsTab from "@/components/profile-tabs/PastEventsTab";
import SubmitHoursTab from "@/components/profile-tabs/SubmitHoursTab";
import CreateEventTab from "@/components/admin/CreateEventTab";
import DesignRequestsReviewTab from "@/components/admin/DesignRequestsReviewTab";
import DesignRequestTab from "@/components/admin/DesignRequestTab";
import RecordHoursTab from "@/components/admin/RecordHoursTab";
import ReportsTab from "@/components/admin/ReportsTab";
import GalleryUploadTab from "@/components/admin/GalleryUploadTab";
import ContactMessagesTab from "@/components/admin/ContactMessagesTab";

// --- تعريف أنواع البيانات ---
interface Profile {
  id: string;
  full_name: string;
  student_id: string;
  college: string;
  major: string;
  phone_number: string;
  role: 'member' | 'committee_member' | 'committee_lead' | 'committee_deputy' | 'club_deputy' | 'club_lead' | 'club_supervisor' | 'super_admin';
  committee: 'hr' | 'pr' | 'media' | 'design' | 'logistics' | null;
}

interface Event {
  id: number;
  title: string;
  start_time: string;
  location: string;
}

interface Registration {
  id: number;
  role: string;
  status: string;
  hours: number;
  events: Event | null;
}

const getInitials = (name: string) => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const getRoleLabel = (role: string, committee: string | null) => {
  // الأدوار التي لا تحتاج إلى اسم اللجنة
  const noCommitteeRoles = ['club_deputy', 'club_lead', 'club_supervisor', 'super_admin'];
  
  if (noCommitteeRoles.includes(role)) {
    switch(role) {
      case 'club_deputy': return 'نائب قائد النادي';
      case 'club_lead': return 'قائد النادي';
      case 'club_supervisor': return 'مشرف النادي';
      case 'super_admin': return 'سوبر أدمن';
      default: return 'عضو';
    }
  }
  
  // الأدوار التي تحتاج إلى اسم اللجنة
  const committeeNames: Record<string, string> = {
    'hr': 'الموارد البشرية',
    'pr': 'العلاقات العامة',
    'media': 'الإعلام',
    'design': 'التصميم',
    'logistics': 'اللوجستيات'
  };
  
  const arabicCommittee = committee ? committeeNames[committee] || committee : '';

  switch(role) {
    case 'member': return committee ? `عضو (${arabicCommittee})` : 'عضو';
    case 'committee_member': return `عضو في ${arabicCommittee}`;
    case 'committee_deputy': return `نائب قائد ${arabicCommittee}`;
    case 'committee_lead': return `قائد ${arabicCommittee}`;
    default: return 'عضو';
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [upcomingRegistrations, setUpcomingRegistrations] = useState<Registration[]>([]);
  const [pastRegistrations, setPastRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isProfileVisible, setProfileVisible] = useState(true);
  const [totalHours, setTotalHours] = useState(0);
  
  const isMobile = useMediaQuery({ maxWidth: 1024 });

  useEffect(() => {
    setProfileVisible(!isMobile);
  }, [isMobile]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileData) {
        throw new Error("الملف الشخصي غير موجود.");
      }
      setProfile(profileData as Profile);

      const { data: registrationData } = await supabase
        .from('event_registrations')
        .select(`
          id,
          role,
          status,
          hours,
          events:events (
            id,
            title,
            start_time,
            location
          )
        `)
        .eq('user_id', user.id);
      
      if (registrationData) {
        setRegistrations(registrationData as unknown as Registration[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (registrations.length > 0) {
      const now = new Date();
      const upcoming = registrations.filter(reg => 
        reg.events && new Date(reg.events.start_time) >= now
      );
      const past = registrations.filter(reg => 
        reg.events && new Date(reg.events.start_time) < now
      );
      
      setUpcomingRegistrations(upcoming);
      setPastRegistrations(past);
      
      const hoursSum = past.reduce((sum, reg) => sum + (reg.hours || 0), 0);
      setTotalHours(hoursSum);
    } else {
      setTotalHours(0);
    }
  }, [registrations]);

  // --- مصفوفة الصلاحيات الكاملة والجديدة ---
  const allTabs = [
   // التبويبات العامة
    { 
        id: 'upcoming', 
        label: 'الفعاليات القادمة', 
        // **تصحيح: تمرير البيانات وحالة التحميل**
        component: <UpcomingEventsTab 
                        registrations={upcomingRegistrations} 
                        isLoading={loading} 
                   />, 
        permissionGroup: 'general' 
    },
    { 
        id: 'past', 
        label: 'سجل الفعاليات', 
        // **تصحيح: تمرير البيانات والساعات وحالة التحميل**
        component: <PastEventsTab 
                        registrations={pastRegistrations} 
                        totalHours={totalHours} 
                        isLoading={loading}
                   />, 
        permissionGroup: 'general' 
    },
    { id: 'submit_hours', label: 'طلب ساعات إضافية', component: <SubmitHoursTab />, permissionGroup: 'general' },

    // التبويبات الإدارية
    { id: 'create_event', label: '➕ إنشاء فعالية', component: <CreateEventTab />, permissionGroup: 'leadership' },
    { id: 'design_requests_submit', label: '✉️ طلب تصميم', component: <DesignRequestTab />, permissionGroup: 'leadership' },

    // تبويبات اللجان
    { id: 'record_hours', label: '⏱️ تسجيل الساعات', component: <RecordHoursTab />, permissionGroup: 'hr' },
    { id: 'reports', label: '📊 رفع التقارير', component: <ReportsTab />, permissionGroup: 'hr_lead_only' },
    { id: 'view_design_requests', label: '🎨 مراجعة طلبات التصميم', component: <DesignRequestsReviewTab />, permissionGroup: 'design' },
    { id: 'upload_photos', label: '📷 رفع صور للمعرض', component: <GalleryUploadTab />, permissionGroup: 'media' },
    { id: 'view_contact_messages', label: '📨 رسائل التواصل', component: <ContactMessagesTab />, permissionGroup: 'pr' },
  ];

  // --- منطق الفلترة الذكي الجديد ---
  const visibleTabs = allTabs.filter(tab => {
    if (!profile) return false;

    const userRole = profile.role;
    const userCommittee = profile.committee;

    // القاعدة 1: القادة والسوبر أدمن يرون كل شيء
    if (['super_admin', 'club_lead', 'club_deputy'].includes(userRole)) {
      return true;
    }

    // القاعدة 2: المشرف يرى كل شيء عدا التبويبات العامة
    if (userRole === 'club_supervisor') {
      return tab.permissionGroup !== 'general';
    }

    // القاعدة 3: التحقق لبقية الأدوار
    switch (tab.permissionGroup) {
      case 'general':
        return true; // الأعضاء العاديين وأعضاء اللجان يرون التبويبات العامة
      case 'leadership':
        return ['committee_lead', 'committee_deputy'].includes(userRole);
      case 'hr':
        return userCommittee === 'hr' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      case 'hr_lead_only':
        return userCommittee === 'hr' && ['committee_deputy', 'committee_lead'].includes(userRole);
      case 'design':
        return userCommittee === 'design' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      case 'media':
        return userCommittee === 'media' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      case 'pr':
        return userCommittee === 'pr' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      default:
        return false;
    }
  });

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50/50">
        <Loader2 className="h-12 w-12 animate-spin text-[#4CAF50]" />
        <p className="mt-4 text-lg text-gray-600">جاري تحميل ملفك الشخصي...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="mb-4">لم نتمكن من العثور على ملفك الشخصي.</p>
        <Button onClick={() => supabase.auth.signOut().then(() => router.push('/'))}>
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {isMobile && (
          <div className="mb-6">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center space-x-4 pb-4 rtl:space-x-reverse">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={`https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`} 
                    alt={profile.full_name} 
                  />
                  <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                  <CardDescription>
                    <Badge variant="outline" className="mt-1">
                      {getRoleLabel(profile.role, profile.committee)}
                    </Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Separator />
                <div className="space-y-4 pt-4 text-sm text-gray-700">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 ml-3 text-gray-500" />
                    <span>{profile.student_id}</span>
                  </div>
                  <div className="flex items-center">
                    <School className="h-4 w-4 ml-3 text-gray-500" />
                    <span>{profile.major}, {profile.college}</span>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 ml-3 text-gray-500" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 ml-3 text-gray-500" />
                    <span>{profile.phone_number}</span>
                  </div>
                  {profile.role !== 'club_supervisor' && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 ml-3 text-gray-500" />
                      <span>مجموع الساعات: {totalHours} ساعة</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2 pt-6">
                <Button variant="outline" className="w-full">
                  <Edit className="h-4 w-4 ml-2" />
                  تعديل الملف الشخصي
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={fetchData}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 ml-2" />
                  )}
                  تحديث البيانات
                </Button>
                <Link href="/committee-application" className="w-full">
                  <Button variant="secondary" className="w-full">
                    <Users className="h-4 w-4 ml-2" />
                    الانضمام لإحدى اللجان
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        )}

        <div className="flex w-full gap-8 items-start">
          {!isMobile && (
            <AnimatePresence>
              {isProfileVisible && (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: { 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      duration: 0.3
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: 50,
                    transition: { 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25,
                      duration: 0.3
                    }
                  }}
                  className="hidden lg:block flex-shrink-0 w-1/3"
                >
                  <Card className="shadow-sm w-full">
                    <CardHeader className="flex flex-row items-center space-x-4 pb-4 rtl:space-x-reverse">
                      <Avatar className="h-16 w-16">
                        <AvatarImage 
                          src={`https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`} 
                          alt={profile.full_name} 
                        />
                        <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className="mt-1">
                            {getRoleLabel(profile.role, profile.committee)}
                          </Badge>
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Separator />
                      <div className="space-y-4 pt-4 text-sm text-gray-700">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 ml-3 text-gray-500" />
                          <span>{profile.student_id}</span>
                        </div>
                        <div className="flex items-center">
                          <School className="h-4 w-4 ml-3 text-gray-500" />
                          <span>{profile.major}, {profile.college}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 ml-3 text-gray-500" />
                          <span>{user?.email}</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 ml-3 text-gray-500" />
                          <span>{profile.phone_number}</span>
                        </div>
                        {profile.role !== 'club_supervisor' && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 ml-3 text-gray-500" />
                            <span>مجموع الساعات: {totalHours} ساعة</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-2 pt-6">
                      <Button variant="outline" className="w-full">
                        <Edit className="h-4 w-4 ml-2" />
                        تعديل الملف الشخصي
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={fetchData}
                        disabled={refreshing}
                      >
                        {refreshing ? (
                          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 ml-2" />
                        )}
                        تحديث البيانات
                      </Button>
                      <Link href="/committee-application" className="w-full">
                        <Button variant="secondary" className="w-full">
                          <Users className="h-4 w-4 ml-2" />
                          عضوية اختيار لجنة
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <motion.div 
            layout 
            className={`flex-grow ${!isMobile && isProfileVisible ? 'w-2/3' : 'w-full'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-6">
              {!isMobile && (
                <motion.button
                  onClick={() => setProfileVisible(!isProfileVisible)}
                  className="group relative flex items-center justify-center h-10 w-10 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-sm mr-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotate: isProfileVisible ? 0 : 180 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="text-gray-500 group-hover:text-gray-900"
                  >
                    {isProfileVisible ? (
                      <ChevronsLeft className="h-5 w-5" />
                    ) : (
                      <ChevronsRight className="h-5 w-5" />
                    )}
                  </motion.div>
                </motion.button>
              )}
              
              <motion.div 
                layout
                className="flex flex-grow border border-gray-200 bg-gray-100/80 rounded-xl p-1 hide-horizontal-scrollbar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
               <div className="flex w-full" style={{ gap: '4px' }}>
  {visibleTabs.map(tab => (
    <motion.button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`relative flex-1 min-w-[120px] rounded-lg px-3 py-2 text-sm font-medium transition-colors
        ${activeTab === tab.id ? 'text-white' : 'text-gray-700 hover:text-black'}`}
      style={{ 
        flex: `1 0 calc(${100 / visibleTabs.length}% - ${4 * (visibleTabs.length - 1)}px)`,
        maxWidth: visibleTabs.length > 4 ? '200px' : 'none'
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {activeTab === tab.id && (
        <motion.div
          layoutId="active-profile-pill"
          className="absolute inset-0 bg-[#4CAF50] rounded-lg"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
    </motion.button>
  ))}
</div>
              </motion.div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                transition={{ duration: 0.2 }}
              >
                {visibleTabs.find(tab => tab.id === activeTab)?.component}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}