// app/gallery/page.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { X, AlertCircle } from 'lucide-react';
import { useGalleryImages, GalleryImage } from '@/hooks/useGalleryImages';

function ImageSkeleton() {
    return <Skeleton className="h-64 w-full rounded-lg" />;
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

const allStaticCategories = [
  "كل الفعاليات", "ورش عمل", "ندوات", "معارض", "زيارات", 
  "دورات تدريبية", "اعمال تطوعية", "حفلات", "مبادرات", 
  "مؤتمرات", "رحلات", "مسابقات"
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 120 }
  },
};

// أنيميشن النافذة المنبثقة الجديد
const modalVariants: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0] } },
};


export default function GalleryPage() {
  const { data: images = [], isLoading, isError, error } = useGalleryImages();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('كل الفعاليات');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  const filteredImages = useMemo(() => {
    if (selectedCategory === 'كل الفعاليات') return images;
    return images.filter(img => img.category === selectedCategory);
  }, [selectedCategory, images]);

  const closeModal = () => setSelectedImage(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = selectedImage ? 'hidden' : 'auto';

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [selectedImage]);

  return (
    <main className="bg-gray-50 dark:bg-gray-900">
      <section className="bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] text-white py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5 }} 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight"
            >
                معرض الصور
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, delay: 0.2 }} 
              className="text-lg sm:text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed px-4"
            >
                استعرض لحظات مميزة من فعالياتنا وأنشطتنا المتنوعة
            </motion.p>
        </div>
      </section>
      <section className="py-4 bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto pb-2 space-x-2 space-x-reverse">
            {allStaticCategories.map((category) => (
                <motion.button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category ? "text-white" : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
                >
                {selectedCategory === category && (
                    <motion.div layoutId="activeFilterPill" className="absolute inset-0 bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] rounded-full z-0" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                )}
                <span className="relative z-10">{category}</span>
                </motion.button>
            ))}
            </div>
        </div>
      </section>
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {isLoading ? (
                    Array.from({ length: 12 }).map((_, index) => <ImageSkeleton key={index} />)
                ) : isError ? (
                    <ErrorDisplay message={error?.message || "فشل في تحميل الصور."} />
                ) : filteredImages.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">لا توجد صور متاحة لهذا التصنيف.</p>
                    </div>
                ) : (
                    filteredImages.map((image) => (
                        <motion.div
                            key={image.id}
                            variants={itemVariants}
                            className="group cursor-pointer overflow-hidden rounded-lg shadow-md bg-white dark:bg-gray-800 aspect-square"
                            onClick={() => setSelectedImage(image)}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                            <img 
                              src={image.image_url} 
                              alt={image.alt_text} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <h3 className="text-white font-semibold text-xs sm:text-sm line-clamp-2 leading-tight">
                                      {image.alt_text}
                                    </h3>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </motion.div>
        </div>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center"
                variants={modalVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={selectedImage.image_url} 
                alt={selectedImage.alt_text} 
                className="object-contain rounded-lg w-auto h-auto max-w-full max-h-[calc(90vh-80px)] shadow-2xl"
              />
              <div className="w-full max-w-full text-white mt-4 text-center">
                <h3 className="text-lg font-bold">{selectedImage.alt_text}</h3>
                <div className="flex justify-center items-center gap-4 mt-2 text-sm">
                  <span className="bg-[#4CAF50] text-white px-3 py-1 rounded-full">{selectedImage.category}</span>
                  <span className="text-gray-300">{new Date(selectedImage.created_at).toLocaleDateString("ar-SA")}</span>
                </div>
              </div>
            </motion.div>
            
            <motion.button 
              onClick={closeModal} 
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <X className="w-6 h-6" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};