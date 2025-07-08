//app/(main)/events/page.tsx



"use client"



import { useState, useEffect, useCallback } from "react";

import { supabase } from "@/lib/supabaseClient";

import toast, { Toaster } from "react-hot-toast"; // قمت بإعادة Toaster هنا فقط للتأكيد

import { Button } from "@/components/ui/button";

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

import { Calendar, MapPin, Users, Clock } from "lucide-react";

import Link from "next/link";

import { EventFilterTabs } from "@/components/EventFilterTabs";



// ... (واجهات البيانات و EventCardSkeleton تبقى كما هي)

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

const categoryMap: { [key: string]: string } = { "ورش عمل": "Workshop", "ندوات": "Seminar", "معارض": "Exhibition", "زيارات": "Visit", "دورات تدريبية": "Course", "اعمال تطوعية": "Volunteering", "حفلات": "Ceremony", "مبادرات": "Initiative" };

function EventCardSkeleton() { return (<Card className="overflow-hidden"><div className="w-full h-48 bg-gray-200 animate-pulse"></div><CardHeader><div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div><div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div></CardHeader><CardContent><div className="space-y-2"><div className="h-4 bg-gray-200 rounded animate-pulse"></div><div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div></div></CardContent><CardFooter><div className="h-10 bg-gray-200 rounded animate-pulse w-full"></div></CardFooter></Card>); }





export default function EventsPage() {

  const [events, setEvents] = useState<Event[]>([]);

  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all");

  const [user, setUser] = useState<any>(null);



  const fetchEvents = useCallback(async () => {

    try {

      // --- بدأ التعديل هنا ---

      // 1. حساب الوقت الحالي ناقص ساعة

      const oneHourInMs = 60 * 60 * 1000;

      const filterTime = new Date(Date.now() - oneHourInMs).toISOString();



      // 2. جلب الفعاليات التي لم تنتهِ بعد (مع مهلة ساعة)

      const { data: eventsData, error: eventsError } = await supabase

        .from('events')

        .select('*')

        .gt('end_time', filterTime) // <-- الشرط الجديد

        .order('start_time', { ascending: true });



      if (eventsError) throw eventsError;

      // --- انتهى التعديل هنا ---



      if (!eventsData || eventsData.length === 0) {

        setEvents([]);

        return;

      }



      // ... (بقية منطق حساب عدد المسجلين يبقى كما هو)

      const eventIds = eventsData.map(e => e.id);

      const { data: registrations, error: registrationsError } = await supabase.from('event_registrations').select('event_id').in('event_id', eventIds);

      if (registrationsError) throw registrationsError;

      const countsMap = new Map<number, number>();

      registrations.forEach(reg => {

        countsMap.set(reg.event_id, (countsMap.get(reg.event_id) || 0) + 1);

      });

      const eventsWithCounts = eventsData.map(event => ({

        ...event,

        registered_attendees: countsMap.get(event.id) || 0,

      }));

      setEvents(eventsWithCounts);

    } catch (error: any) {

      console.error("Error fetching events:", error);

      toast.error("فشل في جلب الفعاليات.");

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



  // app/events/page.tsx



  const handleAttendEvent = async (eventId: number) => {

    if (!user) {

      toast.error("يجب تسجيل الدخول أولاً.");

      return;

    }

    const toastId = toast.loading('جارٍ تسجيلك...');

    try {

      const { data: existingRegistration } = await supabase.from('event_registrations').select().eq('user_id', user.id).eq('event_id', eventId).maybeSingle();

      if (existingRegistration) {

        return toast.error('لقد سجلت في هذه الفعالية مسبقاً', { id: toastId });

      }



      // نجد الفعالية من القائمة للتحقق من المقاعد

      const currentEvent = events.find(e => e.id === eventId);

      if (currentEvent?.max_attendees && (currentEvent.registered_attendees ?? 0) >= currentEvent.max_attendees) {

        return toast.error('لا توجد مقاعد متاحة', { id: toastId });

      }



      const { error } = await supabase.from('event_registrations').insert([{ user_id: user.id, event_id: eventId, status: 'registered' }]);

      if (error) throw error;

      

      toast.success('تم تسجيلك بنجاح!', { id: toastId });

      await fetchEvents(); // إعادة جلب البيانات لتحديث العداد بشكل دقيق

    } catch (error) {

      toast.error('حدث خطأ أثناء التسجيل.', { id: toastId });

    }

  };



  const categories = ["all", "ورش عمل", "ندوات", "معارض", "زيارات", "دورات تدريبية", "اعمال تطوعية", "حفلات", "مبادرات"];

  const filteredEvents = filter === "all" ? events : events.filter(event => event.category === filter);



  return (

    <main className="relative overflow-hidden">

      {/* لاحظ أنني أعدت Toaster هنا مؤقتاً للتأكد، ولكن المكان الأفضل له هو في layout.tsx */}

      <Toaster position="bottom-center" />

      

      {/* ... بقية الواجهة كما هي ... */}

       <section className="bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] text-white py-16">

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

    <motion.h1 

      initial={{ opacity: 0, y: 20 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.5 }}

      className="text-4xl md:text-5xl font-bold mb-4"

    >

      الفعاليات

    </motion.h1>

    

    <motion.p

      initial={{ opacity: 0, y: 20 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.5, delay: 0.2 }}

      className="text-xl opacity-90 max-w-2xl mx-auto"

    >

      اكتشف جميع الفعاليات والأنشطة المتاحة وسجل حضورك الآن

    </motion.p>

  </div>

</section>



      <section className="py-8 bg-white border-b">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <EventFilterTabs categories={categories} activeFilter={filter} setFilter={setFilter} />

        </div>

      </section>

      

      <section className="py-16">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {loading ? (

              Array.from({ length: 6 }).map((_, index) => <EventCardSkeleton key={index} />)

            ) : filteredEvents.length > 0 ? (

              filteredEvents.map(event => (

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

                    <Link href={`/${event.id}`} className="flex-1">

  <Button variant="outline" className="w-full border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white">

    التفاصيل

  </Button>

</Link>

                  </CardFooter>

                </Card>

              ))

            ) : (

              <div className="col-span-full text-center py-12">

                <p className="text-gray-500 text-lg">لا توجد فعاليات متاحة حالياً.</p>

              </div>

            )}

          </div>

        </div>

      </section>

        

    </main>

  );

}