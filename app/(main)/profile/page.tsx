"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaQuery } from 'react-responsive';
import { supabase } from "@/lib/supabaseClient";

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
import SubmitHoursTab from '@/components/profile-tabs/SubmitHoursTab';
import CreateEventTab from "@/components/admin/CreateEventTab";
import DesignRequestsReviewTab from "@/components/admin/DesignRequestsReviewTab";
import DesignRequestTab from "@/components/admin/DesignRequestTab";
import RecordHoursTab from "@/components/admin/RecordHoursTab";
import ReportsTab from "@/components/admin/ReportsTab";
import GalleryUploadTab from "@/components/admin/GalleryUploadTab";
import ContactMessagesTab from "@/components/admin/ContactMessagesTab";

// --- استيراد الـ Hook الموحد والأنواع ---
import { useAuth } from "@/context/AuthContext";
import { useUserProfileData } from "@/hooks/useUserProfileData";
import type { Profile } from "@/hooks/useProfile";
import type { Registration } from "@/hooks/useUserRegistrations";

// --- استيراد مكون تعديل الصورة الشخصية ---
import EditAvatarDialog from "@/components/EditAvatarDialog";

// --- الدوال المساعدة (Helper Functions) ---
const getInitials = (name: string): string => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getRoleLabel = (role: Profile['role'], committee: Profile['committee']): string => {
  const noCommitteeRoles = ['club_deputy', 'club_lead', 'club_supervisor', 'super_admin'];
  if (noCommitteeRoles.includes(role)) {
    const roleMap: Record<string, string> = {
      'club_deputy': 'نائب قائد النادي', 'club_lead': 'قائد النادي',
      'club_supervisor': 'مشرف النادي', 'super_admin': 'Tempest'
    };
    return roleMap[role] || 'عضو';
  }
  const committeeNames: Record<string, string> = {
    'hr': 'الموارد البشرية', 'pr': 'العلاقات العامة', 'media': 'الإعلام',
    'design': 'التصميم', 'logistics': 'اللوجستيات'
  };
  const arabicCommittee = committee ? committeeNames[committee] || committee : '';
  const roleMap: Record<string, string> = {
    'member': committee ? `عضو (${arabicCommittee})` : 'عضو',
    'committee_member': `عضو في ${arabicCommittee}`,
    'committee_deputy': `نائب قائد ${arabicCommittee}`,
    'committee_lead': `قائد ${arabicCommittee}`
  };
  return roleMap[role] || 'عضو';
};

// --- المكون الرئيسي للصفحة ---
export default function ProfilePage() {
  const router = useRouter();
  
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading: isDataLoading, isError, refetch } = useUserProfileData();
  
  const profile = data?.profile;
  const registrations = data?.registrations || [];
  const eventHours = data?.eventHours || 0;
  const extraHours = data?.extraHours || 0;
  
  const isLoading = isAuthLoading || isDataLoading;

  const [activeTab, setActiveTab] = useState('upcoming');
  const [isProfileVisible, setProfileVisible] = useState(true);
  const [isAvatarDialogOpen, setAvatarDialogOpen] = useState(false); // <-- حالة نافذة التعديل
  const isMobile = useMediaQuery({ maxWidth: 1024 });

  useEffect(() => { setProfileVisible(!isMobile); }, [isMobile]);
  
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [isAuthLoading, user, router]);

  const { upcomingRegistrations, pastRegistrations } = useMemo(() => {
    const now = new Date();
    const upcoming: Registration[] = [];
    const past: Registration[] = [];
    
    registrations.forEach(reg => {
      if (reg.events && new Date(reg.events.start_time) >= now) {
        upcoming.push(reg);
      } else if (reg.events) {
        past.push(reg);
      }
    });
    
    return { upcomingRegistrations: upcoming, pastRegistrations: past };
  }, [registrations]);

  const allTabs = useMemo(() => [
    { id: 'upcoming', label: 'الفعاليات القادمة', component: <UpcomingEventsTab registrations={upcomingRegistrations} isLoading={isLoading} />, permissionGroup: 'general' },
    { 
      id: 'past', 
      label: 'سجل النشاط', 
      component: <PastEventsTab 
                    registrations={pastRegistrations} 
                    eventHours={eventHours} 
                    extraHours={extraHours} 
                    isLoading={isLoading}
                 />, 
      permissionGroup: 'general' 
    },
    { id: 'submit_hours', label: 'طلب ساعات إضافية', component: <SubmitHoursTab />, permissionGroup: 'general' },
    { id: 'create_event', label: '➕ إنشاء فعالية', component: <CreateEventTab />, permissionGroup: 'leadership' },
    { id: 'design_requests_submit', label: '✉️ طلب تصميم', component: <DesignRequestTab />, permissionGroup: 'leadership' },
    { id: 'record_hours', label: '⏱️ تسجيل الساعات', component: <RecordHoursTab />, permissionGroup: 'hr' },
    { id: 'reports', label: '📊 رفع التقارير', component: <ReportsTab />, permissionGroup: 'hr_lead_only' },
    { id: 'view_design_requests', label: '🎨 مراجعة طلبات التصميم', component: <DesignRequestsReviewTab />, permissionGroup: 'design' },
    { id: 'upload_photos', label: '📷 رفع صور للمعرض', component: <GalleryUploadTab />, permissionGroup: 'media' },
    { id: 'view_contact_messages', label: '📨 رسائل التواصل', component: <ContactMessagesTab />, permissionGroup: 'pr' },
  ], [upcomingRegistrations, pastRegistrations, eventHours, extraHours, isLoading]);

  const visibleTabs = useMemo(() => allTabs.filter(tab => {
    if (!profile) return false;
    const userRole = profile.role;
    const userCommittee = profile.committee;
    if (['super_admin', 'club_lead', 'club_deputy'].includes(userRole)) return true;
    if (userRole === 'club_supervisor') return tab.permissionGroup !== 'general';
    switch (tab.permissionGroup) {
      case 'general': return true;
      case 'leadership': return ['committee_lead', 'committee_deputy'].includes(userRole);
      case 'hr': return userCommittee === 'hr' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      case 'hr_lead_only': return userCommittee === 'hr' && ['committee_deputy', 'committee_lead'].includes(userRole);
      case 'design': return userCommittee === 'design' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      case 'media': return userCommittee === 'media' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      case 'pr': return userCommittee === 'pr' && ['committee_member', 'committee_deputy', 'committee_lead'].includes(userRole);
      default: return false;
    }
  }), [profile, allTabs]);

  const handleRefresh = () => {
      refetch();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50/50">
        <Loader2 className="h-12 w-12 animate-spin text-[#4CAF50]" />
        <p className="mt-4 text-lg text-gray-600">جاري تحميل ملفك الشخصي...</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center p-4">
        <p className="mb-4 text-lg">لم نتمكن من العثور على ملفك الشخصي.</p>
        <p className="text-sm text-gray-600 mb-6">قد يكون السبب أنك لم تكمل عملية التسجيل بعد.</p>
        <Link href="/complete-profile">
            <Button>إكمال الملف الشخصي الآن</Button>
        </Link>
        <Button variant="link" className="mt-4" onClick={() => supabase.auth.signOut().then(() => router.push('/'))}>
          تسجيل الخروج والمحاولة مرة أخرى
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
                {/* --- بداية تعديل صورة الموبايل --- */}
                <div className="relative group">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                     className="object-cover"
                      src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`}
                      alt={profile.full_name || ''}
                    />
                    <AvatarFallback>{getInitials(profile.full_name || '')}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => setAvatarDialogOpen(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Edit className="h-6 w-6 text-white" />
                  </button>
                </div>
                {/* --- نهاية تعديل صورة الموبايل --- */}
                <div className="flex-1">
                  <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                  <CardDescription><Badge variant="outline" className="mt-1">{getRoleLabel(profile.role, profile.committee)}</Badge></CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Separator />
                <div className="space-y-4 pt-4 text-sm text-gray-700">
                  <div className="flex items-center"><UserIcon className="h-4 w-4 ml-3 text-gray-500" /><span>{profile.student_id}</span></div>
                  <div className="flex items-center"><School className="h-4 w-4 ml-3 text-gray-500" /><span>{profile.major}, {profile.college}</span></div>
                  <div className="flex items-center"><Mail className="h-4 w-4 ml-3 text-gray-500" /><span>{user?.email}</span></div>
                  <div className="flex items-center"><Phone className="h-4 w-4 ml-3 text-gray-500" /><span>{profile.phone_number}</span></div>
                  {profile.role !== 'club_supervisor' && (<div className="flex items-center"><Clock className="h-4 w-4 ml-3 text-gray-500" /><span>مجموع الساعات: {(eventHours + extraHours).toFixed(1)} ساعة</span></div>)}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-2 pt-6">
                {profile.role === 'member' && (
                  <Link href="/committee-application" className="w-full">
                    <Button variant="secondary" className="w-full"><Users className="h-4 w-4 ml-2" />الانضمام لإحدى اللجان</Button>
                  </Link>
                )}
              </CardFooter>
            </Card>
          </div>
        )}

        <div className="flex w-full gap-8 items-start">
          {!isMobile && (
             <AnimatePresence>
                {isProfileVisible && (
                    <motion.div layout initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }} className="hidden lg:block flex-shrink-0 w-1/3">
                        <Card className="shadow-sm w-full sticky top-24">
                            <CardHeader className="flex flex-row items-center space-x-4 pb-4 rtl:space-x-reverse">
                                {/* --- بداية تعديل صورة سطح المكتب --- */}
                                <div className="relative group">
                                  <Avatar className="h-16 w-16">
                                    <AvatarImage
                                     className="object-cover"
                                      src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`}
                                      alt={profile.full_name || ''}
                                    />
                                    <AvatarFallback>{getInitials(profile.full_name || '')}</AvatarFallback>
                                  </Avatar>
                                  <button
                                    onClick={() => setAvatarDialogOpen(true)}
                                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <Edit className="h-6 w-6 text-white" />
                                  </button>
                                </div>
                                {/* --- نهاية تعديل صورة سطح المكتب --- */}
                                <div className="flex-1">
                                    <CardTitle className="text-2xl">{profile.full_name}</CardTitle>
                                    <CardDescription><Badge variant="outline" className="mt-1">{getRoleLabel(profile.role, profile.committee)}</Badge></CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Separator />
                                <div className="space-y-4 pt-4 text-sm text-gray-700">
                                    <div className="flex items-center"><UserIcon className="h-4 w-4 ml-3 text-gray-500" /><span>{profile.student_id}</span></div>
                                    <div className="flex items-center"><School className="h-4 w-4 ml-3 text-gray-500" /><span>{profile.major}, {profile.college}</span></div>
                                    <div className="flex items-center"><Mail className="h-4 w-4 ml-3 text-gray-500" /><span>{user?.email}</span></div>
                                    <div className="flex items-center"><Phone className="h-4 w-4 ml-3 text-gray-500" /><span>{profile.phone_number}</span></div>
                                    {profile.role !== 'club_supervisor' && (<div className="flex items-center"><Clock className="h-4 w-4 ml-3 text-gray-500" /><span>مجموع الساعات: {(eventHours + extraHours).toFixed(1)} ساعة</span></div>)}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col space-y-2 pt-6">
                                {profile.role === 'member' && (
                                  <Link href="/committee-application" className="w-full">
                                    <Button variant="secondary" className="w-full"><Users className="h-4 w-4 ml-2" />عضوية اختيار لجنة</Button>
                                  </Link>
                                )}
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
             </AnimatePresence>
          )}

          <motion.div layout transition={{ duration: 0.3, type: "spring" }} className={`flex-grow ${!isProfileVisible ? 'w-full' : 'lg:w-2/3'}`}>
            <div className="flex items-center mb-6">
                {!isMobile && (
                    <motion.button onClick={() => setProfileVisible(!isProfileVisible)} className="group relative flex items-center justify-center h-10 w-10 rounded-lg bg-white border hover:bg-gray-100 mr-2 flex-shrink-0">
                        <motion.div initial={false} animate={{ rotate: isProfileVisible ? 0 : 180 }}>
                            {isProfileVisible ? <ChevronsLeft className="h-5 w-5" /> : <ChevronsRight className="h-5 w-5" />}
                        </motion.div>
                    </motion.button>
                )}

                <div className="flex-grow border border-gray-200 bg-gray-100/80 rounded-xl p-1 overflow-x-auto">
                    <div className="flex items-center" style={{ gap: '4px' }}>
                        {visibleTabs.map(tab => (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${visibleTabs.length <= 4 ? 'flex-1' : 'flex-shrink-0'} ${activeTab === tab.id ? 'text-white' : 'text-gray-700 hover:text-black'}`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div layoutId="active-profile-pill" className="absolute inset-0 bg-[#4CAF50] rounded-lg"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                                )}
                                <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {visibleTabs.find(tab => tab.id === activeTab)?.component}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* --- إضافة نافذة تعديل الصورة --- */}
      <EditAvatarDialog 
        profile={profile}
        isOpen={isAvatarDialogOpen}
        setIsOpen={setAvatarDialogOpen}
      />
    </div>
  );
}