// components/HeroSection.tsx
"use client"

import { motion } from 'framer-motion'
import { Calendar, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from './ui/button'

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-[#4CAF50] to-[#42A5F5] text-white py-20 lg:py-32">
      <div className="absolute inset-0 bg-black opacity-10"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
          >
            نادي يزرع الثقافة،
            <br />
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-yellow-300 inline-block"
            >
              يحصد مجتمع
            </motion.span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed"
          >
            أنضم لأكبر نادي طلابي في كلية علوم الأغذية والزراعة
            <br />
            واكتشف عالماً من الأنشطة الثقافية والاجتماعية المميزة
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Link href="/events">
              <Button size="lg" className="bg-white text-[#4CAF50] hover:bg-gray-100 font-semibold px-8 py-3 text-lg">
                <Calendar className="w-5 h-5 ml-2" />
                تصفح الفعاليات
              </Button>
            </Link>
            
            <Link href="/register">
              <Button
                size="lg"
                className="bg-[#4CAF50] text-white hover:bg-white hover:text-[#4CAF50] font-semibold px-8 py-3 text-lg"
              >
                <Users className="w-5 h-5 ml-2" />
                الإنضمام للنادي
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}