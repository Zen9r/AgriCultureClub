// app/gallery/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { X } from 'lucide-react';


type GalleryImage = {
  id: number;
  image_url: string;
  alt_text: string;
  category: string;
  created_at: string;
};

// خريطة التصنيفات الكاملة
const allCategories = [
  "كل الفعاليات",
  "ورش عمل",
  "ندوات",
  "معارض",
  "زيارات",
  "دورات تدريبية",
  "أعمال تطوعية",
  "حفلات",
  "مبادرات",
  "مؤتمرات",
  "رحلات",
  "مسابقات"
];

const GalleryPage = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('كل الفعاليات');
  const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const { data, error } = await supabase
          .from('gallery_images')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setImages(data || []);
        setFilteredImages(data || []);
        setLoading(false);
      } catch (error) {
        console.error('حدث خطأ في جلب بيانات الصور:', error);
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'كل الفعاليات') {
      setFilteredImages(images);
    } else {
      const filtered = images.filter(img => img.category === selectedCategory);
      setFilteredImages(filtered);
    }
  }, [selectedCategory, images]);

  const closeModal = () => {
    setSelectedImage(null);
  };

  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedImage]);

  return (
    <main className="relative overflow-hidden">
      {/* Header */}
      <section className="bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            معرض الصور
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl opacity-90 max-w-2xl mx-auto"
          >
            استعرض لحظات مميزة من فعالياتنا وأنشطتنا المتنوعة
          </motion.p>
        </div>
      </section>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Filters */}
        <section className="py-4 bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex overflow-x-auto pb-2 space-x-2">
              {allCategories.map((category) => (
                <motion.button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                    selectedCategory === category 
                      ? "text-white" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {selectedCategory === category && (
                    <motion.div
                      layoutId="activeFilterPill"
                      className="absolute inset-0 bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] rounded-full z-0"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {category}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 12 }).map((_, index) => (
                  <Skeleton key={index} className="h-64 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">لا توجد صور متاحة لهذا التصنيف</p>
              </div>
            ) : (
              <LayoutGroup>
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08,
                        delayChildren: 0.2
                      },
                    },
                  }}
                >
                  {filteredImages.map((image) => (
                    <motion.div
                      key={image.id}
                      layoutId={`image-${image.id}`}
                      variants={{
                        hidden: { y: 30, opacity: 0 },
                        visible: { 
                          y: 0, 
                          opacity: 1, 
                          transition: { 
                            type: "spring", 
                            stiffness: 400,
                            damping: 20,
                            duration: 0.5
                          } 
                        },
                      }}
                      className="relative group cursor-pointer overflow-hidden rounded-lg shadow-md bg-white"
                      onClick={() => setSelectedImage(image)}
                      whileHover={{ 
                        scale: 1.03,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400,
                        damping: 15
                      }}
                    >
                      <motion.div
                        className="w-full h-64 bg-gray-200 relative"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                      
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100"
                        initial={{ opacity: 0, y: 20 }}
                        whileHover={{ 
                          opacity: 1, 
                          y: 0,
                          transition: { duration: 0.3 }
                        }}
                      >
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="font-semibold text-sm mb-1 line-clamp-2">{image.alt_text}</h3>
                          <div className="flex justify-between items-center text-xs">
                            <span className="bg-[#4CAF50] px-2 py-1 rounded-full">
                              {image.category}
                            </span>
                            <span>
                              {new Date(image.created_at).toLocaleDateString("ar-SA")}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              </LayoutGroup>
            )}
          </div>
        </section>
      </motion.div>

      {/* Modal for enlarged image */}
        {selectedImage && (
          <motion.div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeModal}
          >
            <motion.div
              className="relative max-w-4xl w-full max-h-[90vh]"
              layoutId={`image-${selectedImage.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                transition: {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.5
                }
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.9,
                transition: { duration: 0.2 }
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <motion.button
                onClick={closeModal}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-8 h-8" />
              </motion.button>

              {/* Image */}
              <div className="overflow-hidden rounded-lg bg-black">
                <motion.img
                  src={selectedImage.image_url}
                  alt={selectedImage.alt_text}
                  className="w-full max-h-[70vh] object-contain mx-auto"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: 1,
                    transition: { delay: 0.2 }
                  }}
                />
              </div>
              
              {/* Image info */}
              <motion.div
                className="bg-white dark:bg-gray-800 p-4 rounded-b-lg mt-1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: { 
                    delay: 0.3,
                    duration: 0.3
                  }
                }}
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  {selectedImage.alt_text}
                </h3>
                <div className="flex justify-between items-center">
                  <span className="bg-[#4CAF50] text-white px-3 py-1 rounded-full text-sm">
                    {selectedImage.category}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {new Date(selectedImage.created_at).toLocaleDateString("ar-SA")}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
    </main>
  );
};

export default GalleryPage;