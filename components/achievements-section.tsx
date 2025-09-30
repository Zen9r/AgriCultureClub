// src/components/achievements-section.tsx (الكود الجديد)

import { Trophy, Users, Award, Handshake } from "lucide-react"

const achievements = [
  {
    icon: <Trophy className="h-10 w-10 text-yellow-500" />,
    title: "المركز الأول",
    description: "الفوز بمسابقة الجامعات لأفضل نادي طلابي لعام 2024.",
  },
  {
    icon: <Users className="h-10 w-10 text-blue-500" />,
    title: "+500 عضو",
    description: "تنظيم أكثر من 30 ورشة عمل ناجحة حضرها مئات الطلاب.",
  },
  {
    icon: <Handshake className="h-10 w-10 text-green-500" />,
    title: "شراكة استراتيجية",
    description: "عقد شراكة مع شركة [اسم وهمي] لدعم وتدريب الأعضاء.",
  },
  {
    icon: <Award className="h-10 w-10 text-red-500" />,
    title: "مبادرة تطوعية",
    description: "إطلاق مبادرة تطوعية ناجحة لخدمة المجتمع المحلي.",
  },
]

export default function AchievementsSection() {
  return (
    <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            أبرز إنجازاتنا
          </h2>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((item) => (
            <div key={item.title} className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-center transition-transform duration-300 hover:scale-105">
              <div className="flex items-center justify-center h-20 w-20 mx-auto rounded-full">
                {item.icon}
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}