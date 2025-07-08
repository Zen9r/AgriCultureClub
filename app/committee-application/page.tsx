"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ArrowRight, Users } from "lucide-react" // تم تنظيف الأيقونات غير المستخدمة

export default function CommitteeApplicationPage() {
  const [formData, setFormData] = useState({
    skills: "",
    previousExperience: "",
    preferredCommittee: "",
    eventIdea: "",
    interested_in_specific_event: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!formData.preferredCommittee) {
        setError("يرجى اختيار لجنة للانضمام إليها.");
        setLoading(false);
        return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("يجب عليك تسجيل الدخول أولاً.");
      }
      
      // الخطوة 1: استخدام upsert لضمان وجود الصف وتحديثه
      const { error: applicationError } = await supabase
        .from("club_applications")
        .upsert({
            user_id: user.id,
            skills: formData.skills,
            previous_experience: formData.previousExperience,
            preferred_committee: formData.preferredCommittee,
            event_idea: formData.eventIdea,
            interested_in_specific_event: formData.interested_in_specific_event,
        }, {
            onConflict: 'user_id' // هذا يخبر supabase أن يتحقق من user_id
        });

      if (applicationError) throw applicationError;

      // الخطوة 2: تحديث جدول profiles لتغيير الدور واللجنة
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          role: 'committee_member',
          committee: formData.preferredCommittee as any,
        })
        .eq('id', user.id);

      if (profileUpdateError) throw profileUpdateError;

      setMessage("تم تحديث منصبك بنجاح! أصبحت الآن عضواً في اللجنة التي اخترتها.");
      setTimeout(() => router.push('/profile'), 2500);

    } catch (error: any) {
      console.error("Submission Error:", error);
      setError(error.message || "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-green-700">
            <Users className="inline-block ml-2" />
            الانضمام للجان النادي
          </CardTitle>
          <CardDescription className="text-center">
            بمجرد اختيارك للجنة، سيتغير منصبك في ملفك الشخصي.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
          {message && <p className="mb-4 text-center text-green-600 bg-green-100 p-3 rounded-md">{message}</p>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <Label>اختر اللجنة التي ترغب بالانضمام إليها *</Label>
                <Select required onValueChange={(value) => handleSelectChange('preferredCommittee', value)} value={formData.preferredCommittee}>
                    <SelectTrigger><SelectValue placeholder="اختر لجنة..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="media">اللجنة الإعلامية</SelectItem>
                        <SelectItem value="design">لجنة التصميم والمونتاج</SelectItem>
                        <SelectItem value="hr">لجنة الموارد البشرية</SelectItem>
                        <SelectItem value="pr">لجنة العلاقات العامة</SelectItem>
                        <SelectItem value="logistics">لجنة الدعم اللوجستي</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div><Label htmlFor="skills">ما هي أبرز المهارات التي تتقنها؟</Label><Textarea id="skills" name="skills" value={formData.skills} onChange={handleChange} placeholder="مثال: تصميم، تنظيم، برمجة..." /></div>
            <div><Label htmlFor="previousExperience">هل لديك خبرات سابقة في الأندية؟</Label><Textarea id="previousExperience" name="previousExperience" value={formData.previousExperience} onChange={handleChange} placeholder="اذكر أي أندية أو أعمال تطوعية سابقة..."/></div>
            
            <div className="border-t pt-6 space-y-6">
                <div><Label htmlFor="eventIdea">هل لديك فكرة لفعالية تود رؤيتها في النادي؟</Label><Textarea id="eventIdea" name="eventIdea" value={formData.eventIdea} onChange={handleChange} /></div>
                <div><Label htmlFor="interested_in_specific_event">هل هناك فعالية محددة قادمة أنت مهتم بالمشاركة في تنظيمها؟</Label><Textarea id="interested_in_specific_event" name="interested_in_specific_event" value={formData.interested_in_specific_event} onChange={handleChange} placeholder="اذكر اسم الفعالية إن وجدت..."/></div>
            </div>
            
            <Button type="submit" disabled={loading || !!message} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {loading ? "جارٍ التحديث..." : "تأكيد الانضمام للجنة"}
            </Button>
          </form>

          <div className="mt-6">
            <Link href="/profile" className="w-full block">
                <Button variant="secondary" className="w-full">
                    <ArrowRight className="h-4 w-4 ml-2" />
                    العودة إلى الملف الشخصي
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}