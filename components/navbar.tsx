// components/navbar.tsx

"use client"

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0); // قيمة ابتدائية 0
    const lastScrollDirection = useRef<'up' | 'down'>('up'); // نوع محدد وقيمة ابتدائية 'up'
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null); // نوع محدد وقيمة ابتدائية null
    const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDirection = currentScrollY > lastScrollY.current ? 'down' : 'up';
      const scrollSpeed = Math.abs(currentScrollY - lastScrollY.current);

      // تحديث حالة scrolled بناء على موضع الصفحة
      const isScrolled = currentScrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }

      // التحكم في ظهور/اختفاء النافبار بناء على سرعة واتجاه التمرير
      if (scrollDirection !== lastScrollDirection.current) {
        lastScrollDirection.current = scrollDirection;
      }

      if (scrollDirection === 'down' && scrollSpeed > 10) {
        // إذا كان التمرير للأسفل بسرعة، أخفي النافبار فوراً
        setIsVisible(false);
      } else if (scrollDirection === 'up') {
        if (scrollSpeed > 10) {
          // إذا كان التمرير للأعلى بسرعة، أظهر النافبار فوراً
          setIsVisible(true);
        } else if (currentScrollY < 10) {
          // إذا كان في أعلى الصفحة، أظهر النافبار
          setIsVisible(true);
        }
      }

      lastScrollY.current = currentScrollY;

      // إلغاء المهلة السابقة إذا وجدت
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // إذا توقف التمرير، تأكد من ظهور النافبار
      scrollTimeout.current = setTimeout(() => {
        if (scrollDirection === 'up' || currentScrollY < 10) {
          setIsVisible(true);
        }
      }, 100);
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [scrolled]);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/events", label: "الفعاليات" },
    { href: "/gallery", label: "معرض الصور" },
    { href: "/contact", label: "تواصل" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push('/');
    router.refresh();
  };

  return (
    <nav 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'h-20 shadow-md bg-white/95 backdrop-blur-lg' : 'h-24 shadow-lg bg-white'
      } ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      {/* بقية الكود بدون تغيير */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="relative flex items-center justify-center h-full">
          {/* الجزء الأيمن */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 sm:pr-6 lg:pr-8">
            <div className="flex-shrink-0 flex items-center space-x-4 rtl:space-x-reverse">
              <Link href="/"><Image src="/university-logo.png" alt="شعار الجامعة" width={150} height={150} className="object-contain" /></Link>
              <div className="h-12 w-px bg-gray-200"></div>
              <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse">
                <Image src="/club-logo.png" alt="شعار النادي" width={50} height={50} className="object-contain" />
                <span className="hidden lg:block text-xl font-bold text-gray-800">النادي الثقافي الاجتماعي</span>
              </Link>
            </div>
          </div>

          {/* الجزء الأوسط */}
          <div className="hidden md:block">
            <div className="flex items-baseline space-x-4 rtl:space-x-reverse">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-gray-700 hover:text-[#4CAF50] px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* الجزء الأيسر */}
          <div className="absolute inset-y-0 left-0 hidden md:flex items-center pl-4 sm:pl-6 lg:pl-8">
            {user ? (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4 ml-2" />تسجيل الخروج</Button>
                <Link href="/profile"><Button size="sm" className="bg-[#4CAF50] hover:bg-[#45a049] text-white"><User className="w-4 h-4 ml-2" />ملفي الشخصي</Button></Link>
              </div>
            ) : (
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Link href="/login"><Button variant="outline" size="sm" className="text-gray-700 border-gray-300 hover:bg-gray-50"><User className="w-4 h-4 ml-2" />تسجيل الدخول</Button></Link>
                <Link href="/register"><Button size="sm" className="bg-[#4CAF50] hover:bg-[#45a049] text-white"><UserPlus className="w-4 h-4 ml-2" />التسجيل في النادي</Button></Link>
              </div>
            )}
          </div>

          {/* زر قائمة الجوال */}
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-black focus:outline-none">
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* قائمة الجوال المنسدلة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden absolute w-full bg-white shadow-lg border-t">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-gray-700 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsOpen(false)}>
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex flex-col space-y-3 px-3">
                  {user ? (
                    <>
                      <Link href="/profile" onClick={() => setIsOpen(false)}><Button className="w-full justify-center bg-[#4CAF50] hover:bg-[#45a049] text-white"><User className="w-4 h-4 ml-2" />ملفي الشخصي</Button></Link>
                      <Button variant="outline" className="w-full justify-center" onClick={handleLogout}><LogOut className="w-4 h-4 ml-2" />تسجيل الخروج</Button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setIsOpen(false)}><Button variant="outline" className="w-full justify-center"><User className="w-4 h-4 ml-2" />تسجيل الدخول</Button></Link>
                      <Link href="/register" onClick={() => setIsOpen(false)}><Button className="w-full justify-center bg-[#4CAF50] hover:bg-[#45a049] text-white"><UserPlus className="w-4 h-4 ml-2" />التسجيل في النادي</Button></Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}