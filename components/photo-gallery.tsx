"use client"

import { useState } from "react"
import { X } from "lucide-react"

const galleryImages = [
  {
    id: 1,
    src: "/placeholder.svg?height=300&width=400",
    alt: "فعالية ثقافية - ندوة علمية",
    title: "ندوة علمية حول التكنولوجيا الحيوية",
  },
  {
    id: 2,
    src: "/placeholder.svg?height=300&width=400",
    alt: "ورشة عمل زراعية",
    title: "ورشة عمل حول الزراعة المستدامة",
  },
  {
    id: 3,
    src: "/placeholder.svg?height=300&width=400",
    alt: "معرض طلابي",
    title: "معرض الابتكارات الطلابية",
  },
  {
    id: 4,
    src: "/placeholder.svg?height=300&width=400",
    alt: "نشاط اجتماعي",
    title: "يوم التطوع المجتمعي",
  },
  {
    id: 5,
    src: "/placeholder.svg?height=300&width=400",
    alt: "مؤتمر علمي",
    title: "المؤتمر السنوي للكلية",
  },
  {
    id: 6,
    src: "/placeholder.svg?height=300&width=400",
    alt: "رحلة علمية",
    title: "رحلة استكشافية للمزارع النموذجية",
  },
]

export default function PhotoGallery() {
  const [selectedImage, setSelectedImage] = useState<(typeof galleryImages)[0] | null>(null)

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">معرض الصور</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">لحظات مميزة من فعالياتنا وأنشطتنا المتنوعة</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryImages.map((image) => (
            <div
              key={image.id}
              className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.src || "/placeholder.svg"}
                alt={image.alt}
                className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-end">
                <div className="p-4 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="font-semibold text-lg">{image.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for enlarged image */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedImage.src || "/placeholder.svg"}
                alt={selectedImage.alt}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4 rounded-b-lg">
                <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
