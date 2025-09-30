// app/(main)/events/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, Variants } from 'framer-motion'; // Import Variants type
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock, AlertCircle } from "lucide-react";
import { EventFilterTabs } from "@/components/EventFilterTabs";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

// --- Corrected Import Paths ---
import { useAuth } from "@/context/AuthContext";
import { useEvents, Event } from "@/hooks/useEvents";
import { useEventRegistration } from "@/hooks/useUserRegistrations";

// --- Implemented Helper Components ---
function EventCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col">
      <Skeleton className="w-full h-48" />
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-2 flex-grow">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

function ErrorDisplay({ message }: { message: string }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-8 rounded-lg">
            <AlertCircle className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">حدث خطأ</h3>
            <p>{message}</p>
        </div>
    );
}

// --- Corrected Variants Type ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  },
};

export default function EventsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { data: events = [], isLoading: areEventsLoading, isError, error } = useEvents();
  const { mutate: register, isPending: isRegistering } = useEventRegistration();
  const [filter, setFilter] = useState("all");

  const isLoading = isAuthLoading || areEventsLoading;

  const handleAttendEvent = (event: Event) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً للمشاركة في الفعاليات.");
      return;
    }
    register({ eventId: event.id, userId: user.id, event });
  };

  const categories = ["all", "ورش عمل", "ندوات", "معارض", "زيارات", "دورات تدريبية", "اعمال تطوعية", "حفلات", "مبادرات"];
  const filteredEvents = filter === "all" ? events : events.filter(event => event.category === filter);
  const categoryMap: { [key: string]: string } = { "ورش عمل": "Workshop", "ندوات": "Seminar", "معارض": "Exhibition", "زيارات": "Visit", "دورات تدريبية": "Course", "اعمال تطوعية": "Volunteering", "حفلات": "Ceremony", "مبادرات": "Initiative" };

  return (
    <main className="relative overflow-hidden bg-gray-50 dark:bg-gray-900">
      <section className="bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5 }} 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
            >
                الفعاليات القادمة
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.2 }} 
              className="text-lg sm:text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed px-4"
            >
                اكتشف جميع الفعاليات والأنشطة المتاحة وسجل حضورك الآن
            </motion.p>
        </div>
      </section>
      <section className="py-4 bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <EventFilterTabs categories={categories} activeFilter={filter} setFilter={setFilter} />
        </div>
      </section>
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => <EventCardSkeleton key={index} />)
            ) : isError ? (
              <ErrorDisplay message={error?.message || "فشل في جلب الفعاليات."} />
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <motion.div key={event.id} variants={itemVariants}>
                  <Card className="overflow-hidden h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-gray-100 dark:border-gray-700">
                    <div className="relative">
                        <img 
                          src={event.image_url || `https://placehold.co/600x400/e8f5e9/4caf50?text=${encodeURIComponent(categoryMap[event.category || ''] || 'Event')}`} 
                          alt={event.title} 
                          className="w-full h-40 sm:h-48 object-cover"
                        />
                        <div className="absolute top-3 right-3 bg-[#4CAF50] text-white px-2 py-1 rounded-full text-xs sm:text-sm font-semibold shadow-md">
                          {event.category || 'فعالية'}
                        </div>
                    </div>
                    <CardHeader className="flex-grow p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                          {event.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 h-10">
                          {event.description}
                        </p>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-green-500 flex-shrink-0" />
                            <span className="truncate">
                              {new Date(event.start_time).toLocaleDateString('ar-SA', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-green-500 flex-shrink-0" />
                            <span>
                              {new Date(event.start_time).toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-green-500 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-green-500 flex-shrink-0" />
                            <span>
                              {event.registered_attendees} / {event.max_attendees || '∞'} مشارك
                            </span>
                          </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-2 p-4 sm:p-6 pt-0 bg-gray-50 dark:bg-gray-800/50">
                        <Button 
                          className="w-full sm:flex-1 bg-[#4CAF50] hover:bg-[#45a049] text-white h-10 sm:h-11 text-sm font-medium" 
                          onClick={() => handleAttendEvent(event)} 
                          disabled={isRegistering}
                        >
                          {isRegistering ? 'جارٍ التسجيل...' : 'تسجيل في الفعالية'}
                        </Button>
                        <Link href={`/${event.id}`} className="w-full sm:flex-1">
                          <Button 
                            variant="outline" 
                            className="w-full border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white h-10 sm:h-11 text-sm font-medium"
                          >
                            التفاصيل
                          </Button>
                        </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">لا توجد فعاليات متاحة ضمن هذا التصنيف حالياً.</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
}