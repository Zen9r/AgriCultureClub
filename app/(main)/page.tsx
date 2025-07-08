// src/app/page.tsx (الكود المعدل)
import Navbar from "@/components/navbar"
import HeroSection from "@/components/hero-section"
import ClubInfoCards from "@/components/club-info-cards"       // <-- سيتم إنشاؤه
import AchievementsSection from "@/components/achievements-section" // <-- سيتم إنشاؤه
import EventsPreview from "@/components/events-preview"


export default function HomePage() {
  return (
    
    <main className="relative overflow-hidden">
      <HeroSection />
      <ClubInfoCards />
      <AchievementsSection />
      <EventsPreview />
    </main>
  )
}