//app/[id]/page.tsx (صفحة التفاصيل)


"use client"

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Calendar, Clock, MapPin, Users, Tag, ArrowRight, CheckCircle, XCircle, Clock as ClockIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import Link from 'next/link';

interface Event {
  id: number;
  title: string;
  description: string;
  details: string | null;
  start_time: string;
  end_time: string;
  location: string;
  image_url: string | null;
  category: string | null;
  max_attendees: number | null;
  check_in_code: string | null;
  organizer_whatsapp_link: string | null;
  registered_attendees?: number;
}

const CheckInForm = ({ onConfirm }: { onConfirm: (code: string) => void }) => {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (code.length < 6) return;
    setIsSubmitting(true);
    await onConfirm(code);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-5 sm:space-y-7 text-center w-full max-w-[95%] sm:max-w-md mx-auto px-3 sm:px-4">
      {/* العنوان الرئيسي مع تأثيرات بصرية */}
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            تأكيد الحضور
          </h3>
          <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-14 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
        </motion.div>
        
        {/* بطاقة تعليمات أنيقة */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2 mb-2.5">
            <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-base">🔐</span>
            </div>
            <h4 className="text-base sm:text-lg font-semibold text-gray-800">كود التحقق</h4>
          </div>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            أدخل الكود المكون من 6 أرقام الذي تم إعطاؤه لك في بداية الفعالية
          </p>
        </motion.div>
      </div>

      {/* عرض الكود المدخل بتصميم أنيق */}
      {code.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-5 shadow-inner"
        >
          <p className="text-sm font-medium text-gray-600 mb-2.5">الكود المدخل:</p>
          <div className="text-2xl sm:text-3xl font-mono font-bold text-gray-800 tracking-widest mb-2.5">
            {code.split('').map((char, index) => (
              <motion.span
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="inline-block mx-0.5 sm:mx-1"
              >
                {char}
              </motion.span>
            ))}
            {code.length < 6 && (
              <span className="text-gray-400">
                {Array(6 - code.length).fill('•').join('')}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-gray-500">
              {code.length}/6 أرقام
            </p>
          </div>
        </motion.div>
      )}

      {/* حقل إدخال الكود بتصميم احترافي */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-4"
      >
        {/* إشارة البداية بتصميم أنيق */}
        <div className="flex justify-center px-1">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 sm:px-4 py-2 rounded-full shadow-lg flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-2 h-2 bg-white rounded-full"
            ></motion.div>
            <span className="text-sm font-semibold">ابدأ من هنا ←</span>
          </motion.div>
        </div>
        
        {/* سهم متحرك أنيق */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex justify-center"
        >
          <div className="text-xl text-emerald-500">↓</div>
        </motion.div>
        
        {/* خانات إدخال الكود */}
        <div className="relative px-1 sm:px-2">
          <div dir="ltr" className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => setCode(value)}
              className="gap-1.5 sm:gap-2.5"
            >
              <InputOTPGroup className="flex gap-1.5 sm:gap-2.5 justify-center items-center">
                {Array.from({ length: 6 }).map((_, index) => {
                  const isActive = index === code.length;
                  const isCompleted = index < code.length;
                  const isNext = index === code.length + 1;
                  
                  return (
                    <motion.div
                      key={index}
                      className="relative"
                      animate={{
                        scale: isActive ? 1.08 : 1,
                        y: isActive ? -2 : 0,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <InputOTPSlot
                        index={index}
                        className={`
                          w-11 h-11 sm:w-14 sm:h-14 text-lg sm:text-xl font-bold 
                          border-2 transition-all duration-300 flex items-center justify-center
                          ${isActive 
                            ? 'bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-500 shadow-xl ring-3 ring-emerald-200' 
                            : isCompleted
                            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-md'
                            : isNext
                            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm'
                            : 'bg-white border-gray-300 hover:border-emerald-300'
                          }
                          focus:border-emerald-500 focus:ring-3 focus:ring-emerald-200
                          hover:shadow-lg hover:scale-105
                          rounded-xl
                        `}
                      />
                      
                      {/* هالة متحركة للخانة النشطة */}
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          animate={{
                            boxShadow: [
                              '0 0 0 0 rgba(16, 185, 129, 0.4)',
                              '0 0 0 6px rgba(16, 185, 129, 0.1)',
                              '0 0 0 0 rgba(16, 185, 129, 0.4)',
                            ],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                      
                      {/* تأثير النبض للخانة التالية */}
                      {isNext && (
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        {/* إشارة النهاية */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex justify-center px-2"
        >
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <span>انتهى هنا</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          </div>
        </motion.div>
      </motion.div>

      {/* زر التأكيد بتصميم احترافي */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="pt-2"
      >
        <Button 
          className={`
            w-full h-12 sm:h-14 text-base sm:text-lg font-bold rounded-xl
            transition-all duration-300 transform
            ${code.length < 6 || isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed scale-95'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl hover:shadow-2xl hover:scale-105'
            }
          `}
          onClick={handleSubmit}
          disabled={code.length < 6 || isSubmitting}
        >
          {isSubmitting ? (
            <motion.div
              className="flex items-center gap-2.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              ></motion.div>
              <span>جاري التحقق...</span>
            </motion.div>
          ) : (
            <motion.div
              className="flex items-center gap-2.5"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <CheckCircle className="w-5 h-5" />
              <span>تأكيد الحضور</span>
            </motion.div>
          )}
        </Button>
        
        {/* رسالة تحذيرية أنيقة */}
        {code.length > 0 && code.length < 6 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center justify-center gap-2 text-amber-600"
          >
            <div className="w-4 h-4 bg-amber-100 rounded-full flex items-center justify-center">
              <span className="text-xs">⚠️</span>
            </div>
            <span className="text-xs font-medium">
              يرجى إدخال جميع الأرقام الستة
            </span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default function EventDetailPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [registrationStatus, setRegistrationStatus] = useState<
    'not_registered' | 'registered' | 'attended'
  >('not_registered');
  
  const [isOrganizerModalOpen, setOrganizerModalOpen] = useState(false); 
  
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      setLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError || !eventData) {
          setLoading(false);
          setEvent(null);
          return;
        }

        const { count: attendeesCount } = await supabase
          .from('event_registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', id);

        if (user) {
          const { data: registration } = await supabase
            .from('event_registrations')
            .select('status')
            .eq('user_id', user.id)
            .eq('event_id', id)
            .maybeSingle();

          setRegistrationStatus(registration?.status === 'attended' ? 'attended' : registration ? 'registered' : 'not_registered');
        }

        setEvent({ ...eventData, registered_attendees: attendeesCount ?? 0 });
        setLoading(false);
      } catch (error) {
        setLoading(false);
        toast.error('حدث خطأ في جلب بيانات الفعالية');
      }
    };

    fetchEvent();
  }, [id]);

  const handleAttendEvent = async (eventId: number, role: 'attendee' | 'organizer') => {
  if (!user || !event) return;

  const toastId = toast.loading('جارٍ تسجيلك...');
  try {
    const { data: existingRegistration } = await supabase.from('event_registrations').select().eq('user_id', user.id).eq('event_id', eventId).maybeSingle();
    if (existingRegistration) {
      return toast.error('لقد سجلت في هذه الفعالية مسبقاً', { id: toastId });
    }

    if (event.max_attendees && (event.registered_attendees ?? 0) >= event.max_attendees) {
      return toast.error('لا توجد مقاعد متاحة', { id: toastId });
    }

    // التعديل الرئيسي: نمرر الدور الذي تم اختياره عند إضافة سجل جديد
    const { error } = await supabase.from('event_registrations').insert({
      user_id: user.id,
      event_id: eventId,
      status: 'registered',
      role: role // << تم إضافة الدور هنا
    });

    if (error) throw error;
    
    setEvent(prev => prev ? { ...prev, registered_attendees: (prev.registered_attendees || 0) + 1 } : null);
    setRegistrationStatus('registered');
    
    if (role === 'organizer') {
      toast.dismiss(toastId); // إخفاء رسالة "جارٍ التسجيل"
      setOrganizerModalOpen(true); // إظهار الرسالة المنبثقة للمنظم
    } else {
      toast.success('تم التسجيل في الفعالية بنجاح!', { id: toastId }); // إظهار رسالة النجاح العادية للحضور
    }
  } catch (error: any) {
    toast.error(error.message || 'حدث خطأ أثناء التسجيل', { id: toastId });
  }
};
  const handleCheckIn = async (verificationCode: string) => {
    try {
      if (verificationCode.toLowerCase() !== event!.check_in_code?.toLowerCase()) {
        throw new Error("كود التحقق غير صحيح");
      }

      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'attended' })
        .eq('user_id', user.id)
        .eq('event_id', event!.id);

      if (error) throw error;

      setRegistrationStatus('attended');
      toast.success('تم التحقق من حضورك بنجاح!');
    } catch (error) {
      toast.error('فشل في التحقق من الحضور: ' + (error as Error).message);
    }
  };
  
 const renderActionSection = () => {
  if (!user) {
    return (
      <Button 
        className="w-full h-12 text-lg" 
        onClick={() => router.push('/login')}
      >
        سجل دخولك للتسجيل
      </Button>
    );
  }

  const now = new Date();
  const startTime = new Date(event!.start_time);
  const endTime = new Date(event!.end_time);
  const checkInDeadline = new Date(endTime.getTime() + 60 * 60 * 1000);

  const isCheckInWindow = now >= startTime && now <= checkInDeadline;
  const hasCheckInEnded = now > checkInDeadline;
  const isEventEnded = now > endTime;

  switch (registrationStatus) {
    case 'attended':
      return (
        <div className="flex items-center justify-center p-3 rounded-lg bg-green-100 text-green-800 font-semibold">
          <CheckCircle className="ml-2" /> تم تأكيد حضورك
        </div>
      );
    
    case 'registered':
      if (isCheckInWindow) {
        return <CheckInForm onConfirm={handleCheckIn} />;
      } else if (hasCheckInEnded) {
        return (
          <div className="text-center p-3 rounded-lg bg-red-100 text-red-700">
            <XCircle className="inline mr-2" />
            انتهى وقت التحقق من الحضور
          </div>
        );
      } else {
        return (
          <div className="text-center p-3 rounded-lg bg-blue-100 text-blue-700">
            <ClockIcon className="inline mr-2" />
            التحقق من الحضور لم يبدأ بعد
          </div>
        );
      }

    default:
      if (isEventEnded) return <Button className="w-full h-12 text-lg" disabled>انتهت الفعالية</Button>;
      
      const isFull = event!.max_attendees !== null && (event!.registered_attendees ?? 0) >= event!.max_attendees;
      
      // التعديل الرئيسي: عرض زرين للتسجيل
      return (
        <div className="flex flex-col sm:flex-row gap-2">
          {/* زر التسجيل كحضور (باللون الأخضر) */}
          <Button 
            className="flex-1 h-12 text-lg bg-green-600 hover:bg-green-700" 
            onClick={() => handleAttendEvent(event!.id, 'attendee')} 
            disabled={isFull}
          >
            {isFull ? 'المقاعد ممتلئة' : 'تسجيل كحضور'}
          </Button>

          {/* زر التسجيل كمنظم (باللون الأساسي - الأزرق عادةً) */}
          <Button 
            className="flex-1 h-12 text-lg"
            variant="default" // << يمكنك تغيير هذا لـ "outline" إذا أردت
            onClick={() => handleAttendEvent(event!.id, 'organizer')} 
          >
            تسجيل كمنظم
          </Button>
        </div>
      );
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">الفعالية غير موجودة</h1>
        <Link href="/events">
          <Button variant="outline">
            <ArrowRight className="ml-2 h-4 w-4"/>
            العودة لجميع الفعاليات
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Toaster position="bottom-center"/>
      
      {/* صورة الخلفية الثابتة */}
      <div className="fixed inset-0 -z-10">
        <img 
          src={event.image_url || `https://placehold.co/1200x800/e8f5e9/4caf50?text=${encodeURIComponent(event.title)}`} 
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* المحتوى الرئيسي */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* قسم التفاصيل على اليسار - ثابت لا يتغير */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="sticky top-24"
            >
              <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">معلومات الفعالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Calendar className="mt-1 text-green-600" />
                    <div>
                      <h4 className="font-semibold">التاريخ</h4>
                      <p className="text-gray-600">
                        {new Date(event.start_time).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <Clock className="mt-1 text-green-600" />
                    <div>
                      <h4 className="font-semibold">الوقت</h4>
                      <p className="text-gray-600">
                        {new Date(event.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(event.end_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <MapPin className="mt-1 text-green-600" />
                    <div>
                      <h4 className="font-semibold">المكان</h4>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>
                  
                  {event.category && (
                    <div className="flex items-start gap-4">
                      <Tag className="mt-1 text-green-600" />
                      <div>
                        <h4 className="font-semibold">الفئة</h4>
                        <p className="text-gray-600">{event.category}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    <Users className="mt-1 text-green-600" />
                    <div>
                      <h4 className="font-semibold">الحضور</h4>
                      <p className="text-gray-600">
                        {event.registered_attendees || 0}
                        {event.max_attendees ? ` / ${event.max_attendees}` : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4">
                  {renderActionSection()}
                </CardFooter>
              </Card>
            </motion.div>
          </div>

          {/* قسم النص على اليمين - ثابت لا يتغير */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">
                    {event.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">وصف الفعالية</h3>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {event.description}
                    </p>
                  </div>
                  
                  {event.details && (
                    <div className="pt-6 border-t">
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">تفاصيل إضافية</h3>
                      <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                        {event.details}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* زر العودة - تم تعديل المسار */}
        <div className="mt-12 text-center">
          <Link href="/events" legacyBehavior>
            <Button variant="outline" size="lg">
              <ArrowRight className="ml-2 h-4 w-4"/>
              العودة لجميع الفعاليات
            </Button>
          </Link>
        </div>
      </div>
      <Dialog open={isOrganizerModalOpen} onOpenChange={setOrganizerModalOpen}>
  <DialogContent className="sm:max-w-md text-center p-6 bg-white">
    <DialogHeader>
      <DialogTitle className="text-2xl text-green-600">تهانينا! لقد انضممت كمنظم</DialogTitle>
      <DialogDescription className="pt-2 text-gray-600">
        نشكر لك تطوعك للمساعدة. خطوتك التالية هي الانضمام لمجموعة الواتساب الخاصة بالمنظمين لمتابعة آخر التحديثات.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="sm:justify-center pt-4">
      <a 
        href={event?.organizer_whatsapp_link || '#'} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="w-full"
        onClick={() => setOrganizerModalOpen(false)}
      >
        <Button type="button" className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
          الانضمام لمجموعة الواتساب
        </Button>
      </a>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}