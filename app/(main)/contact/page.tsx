"use client"

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { motion } from 'framer-motion';


export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { error } = await supabase.from('contact_messages').insert({
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message_body: formData.message,
      });

      if (error) throw error;
      
      setSuccessMessage('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError('حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative overflow-hidden">
      
      <section className="bg-gradient-to-r from-[#4CAF50] to-[#42A5F5] text-white py-16">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <motion.h1 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-4xl md:text-5xl font-bold mb-4"
    >
      تواصل معنا
    </motion.h1>
    
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="text-xl opacity-90 max-w-2xl mx-auto"
    >
      نحن هنا للإجابة على استفساراتك واقتراحاتك
    </motion.p>
  </div>
</section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            <div className="lg:col-span-1 space-y-8">
              <Card>
                <CardHeader><CardTitle className="flex items-center text-[#4CAF50] dark:text-[#66BB6A]"><Mail className="w-6 h-6 ml-3" />البريد الإلكتروني</CardTitle></CardHeader>
                <CardContent><a href="mailto:club@example.com" className="text-gray-600 dark:text-gray-300 hover:underline">club@example.com</a></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center text-[#4CAF50] dark:text-[#66BB6A]"><Phone className="w-6 h-6 ml-3" />الهاتف</CardTitle></CardHeader>
                <CardContent><a href="tel:+966550965879" className="text-gray-600 dark:text-gray-300 hover:underline" dir="ltr">+966 55 096 5879</a></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center text-[#4CAF50] dark:text-[#66BB6A]"><MapPin className="w-6 h-6 ml-3" />العنوان</CardTitle></CardHeader>
                <CardContent className="text-gray-600 dark:text-gray-300">
                  <a href="https://maps.app.goo.gl/hvgFiMt1RAo3gL4bA" target="_blank" rel="noopener noreferrer" className="hover:underline">كلية علوم الأغذية والزراعة</a>
                  <br />
                  <a href="https://ksu.edu.sa" target="_blank" rel="noopener noreferrer" className="hover:underline">جامعة الملك سعود</a>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center text-[#4CAF50] dark:text-[#66BB6A]"><Clock className="w-6 h-6 ml-3" />ساعات العمل</CardTitle></CardHeader>
                <CardContent><p className="text-gray-600 dark:text-gray-300">الأحد - الخميس: 8ص - 4م</p></CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl text-[#4CAF50] dark:text-[#66BB6A]">أرسل لنا رسالة</CardTitle>
                  <p className="text-gray-600 dark:text-gray-400">املأ النموذج أدناه وسنتواصل معك في أقرب وقت ممكن</p>
                </CardHeader>
                <CardContent>
                  {error && <p className="text-center text-red-500 bg-red-100 p-2 rounded-md">{error}</p>}
                  {successMessage && <p className="text-center text-green-600 bg-green-100 p-2 rounded-md">{successMessage}</p>}
                  <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الاسم الكامل *</label>
                        <Input id="name" name="name" type="text" required value={formData.name} onChange={handleInputChange} placeholder="أدخل اسمك الكامل" className="w-full"/>
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البريد الإلكتروني *</label>
                        <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} placeholder="you@example.com" className="w-full force-ltr"/>
                      </div>
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الهاتف (اختياري)</label>
                        <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="05xxxxxxxx" className="w-full force-ltr"/>
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الموضوع *</label>
                        <Input id="subject" name="subject" type="text" required value={formData.subject} onChange={handleInputChange} placeholder="اقتراح فعالية، استفسار..." className="w-full"/>
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الرسالة *</label>
                        <Textarea id="message" name="message" required value={formData.message} onChange={handleInputChange} placeholder="اكتب تفاصيل رسالتك هنا..." className="w-full" rows={5}/>
                    </div>
                    <div>
                        <Button type="submit" className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white" disabled={isSubmitting}>
                            {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
                        </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
        
    </main>
  );
}