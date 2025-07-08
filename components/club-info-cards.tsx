// src/components/club-info-cards.tsx (الكود الجديد)

export default function ClubInfoCards() {
  return (
    <section className="py-12 md:py-20 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            تعرف على نادينا
          </h2>
        </div>
        <div className="mt-8 max-w-3xl mx-auto">
          <p className="text-lg text-center leading-relaxed text-gray-700 dark:text-gray-300">
            تأسس نادينا في عام [سنة التأسيس] كمنصة طلابية تهدف إلى إثراء البيئة الجامعية في مجال [مجال النادي]. نسعى لتمكين الطلاب من خلال توفير فرص فريدة للتعلم والتطوير المهني والشخصي. من خلال مجموعة متنوعة من الفعاليات وورش العمل والندوات، نبني جسوراً بين المعرفة الأكاديمية والتطبيق العملي، ونخلق مجتمعاً نابضاً بالحياة يجمع بين الشغف والابتكار والعمل الجماعي.
          </p>
        </div>
      </div>
    </section>
  )
}