"use client"

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

// استيراد المكونات والأيقونات
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Calendar, MapPin, Users, Clock } from "lucide-react";

// واجهة بيانات مطابقة لصفحة الفعاليات الرئيسية
interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  image_url: string | null;
  category: string | null;
  max_attendees: number | null;
  registered_attendees?: number;
}

const categoryMap: { [key: string]: string } = {
  "ورش عمل": "Workshop", "ندوات": "Seminar", "معارض": "Exhibition", "زيارات": "Visit",
  "دورات تدريبية": "Course", "اعمال تطوعية": "Volunteering", "حفلات": "Ceremony", "مبادرات": "Initiative",
};

// مكون التحميل يبقى كما هو
function EventCardSkeleton() {
  return (<Card className="overflow-hidden"><div className="w-full h-48 bg-gray-200 animate-pulse"></div><CardHeader><div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div><div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div><div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div></div></CardContent><CardFooter><div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div></CardFooter></Card>);
}

export default function EventsPreview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // --- 1. جلب البيانات بنفس طريقة صفحة الفعاليات ---
  const fetchEvents = useCallback(async () => {
    try {
      // --- 1. جلب أحدث 10 فعاليات لم تبدأ بعد ---
      const now = new Date().toISOString(); // التوقيت الحالي
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gt('start_time', now) // << الشرط: تاريخ البدء أكبر من الآن
        .order('start_time', { ascending: true }) // << الترتيب: الأقرب أولاً
        .limit(10); // << جلب 10 فعاليات لإضافة تنوع

      if (eventsError) throw eventsError;
      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      // --- 2. خلط الفعاليات التي تم جلبها عشوائيًا (للتنويع) ---
      // هذه الخوارزمية تضمن توزيعًا عشوائيًا جيدًا
      for (let i = eventsData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eventsData[i], eventsData[j]] = [eventsData[j], eventsData[i]];
      }

      // --- 3. أخذ أول 3 فعاليات فقط من القائمة المخلوطة ---
      const previewEvents = eventsData.slice(0, 3);
      const eventIds = previewEvents.map(e => e.id);

      if (eventIds.length === 0) {
        setEvents([]);
        return;
      }

      // --- 4. جلب عدد المسجلين لهذه الفعاليات الثلاث ---
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds);

      if (registrationsError) throw registrationsError;

      const countsMap = new Map<number, number>();
      registrations.forEach(reg => {
        countsMap.set(reg.event_id, (countsMap.get(reg.event_id) || 0) + 1);
      });
      
      const eventsWithCounts = previewEvents.map(event => ({
        ...event,
        registered_attendees: countsMap.get(event.id) || 0,
      }));

      // --- 5. تحديث الحالة النهائية ---
      setEvents(eventsWithCounts);

    } catch (error) {
      console.error("Error fetching preview events:", error);
      toast.error("فشل في تحميل الفعاليات القادمة.");
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await fetchEvents();
      setLoading(false);
    };
    fetchInitialData();
  }, [fetchEvents]);

  // --- 2. إضافة دالة تسجيل الحضور لكي يعمل الزر ---
  const handleAttendEvent = async (eventId: number) => {
    if (!user) {
      toast.error("يجب عليك تسجيل الدخول أولاً.");
      return;
    }
    const toastId = toast.loading('جارٍ تسجيلك...');
    try {
      const { error } = await supabase.from('event_registrations').insert({ event_id: eventId, user_id: user.id });
      if (error) {
        if (error.code === '23505') {
          toast.error('أنت مسجل مسبقاً في هذه الفعالية.', { id: toastId });
        } else { throw error; }
      } else {
        toast.success('تم تسجيلك بنجاح!', { id: toastId });
        await fetchEvents();
      }
    } catch (error: any) {
      toast.error('حدث خطأ أثناء التسجيل.', { id: toastId });
    }
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">الفعاليات القادمة</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            اكتشف مجموعة متنوعة من الأنشطة والفعاليات التي ننظمها لإثراء تجربتك الجامعية
          </p>
        </div>

        {/* --- 3. استخدام نفس تصميم البطاقة من صفحة الفعاليات --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => <EventCardSkeleton key={index} />)
            : events.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  <div className="relative">
                    <img src={event.image_url || `https://placehold.co/600x400/e8f5e9/4caf50?text=${encodeURIComponent(categoryMap[event.category || ''] || 'Event')}`} alt={event.title} className="w-full h-48 object-cover"/>
                    <div className="absolute top-4 right-4 bg-[#4CAF50] text-white px-3 py-1 rounded-full text-sm font-semibold">{event.category || 'فعالية'}</div>
                  </div>
                  <CardHeader className="flex-grow">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">{event.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2 h-10">{event.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center"><Calendar className="w-4 h-4 ml-2" />{new Date(event.start_time).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                      <div className="flex items-center"><Clock className="w-4 h-4 ml-2" />{new Date(event.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="flex items-center"><MapPin className="w-4 h-4 ml-2" />{event.location}</div>
                      <div className="flex items-center"><Users className="w-4 h-4 ml-2" />{event.registered_attendees ?? 0} / {event.max_attendees || '∞'} مشارك</div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button className="flex-1 bg-[#4CAF50] hover:bg-[#45a049] text-white" onClick={() => handleAttendEvent(event.id)}>تسجيل</Button>
                    <Link href={`/events/${event.id}`} className="flex-1"><Button variant="outline" className="w-full border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white">التفاصيل</Button></Link>
                  </CardFooter>
                </Card>
              ))}
        </div>

        <div className="text-center">
          <Link href="/events">
            <Button size="lg" variant="outline" className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white">
              عرض جميع الفعاليات
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}