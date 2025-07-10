//app/register/page.tsx


"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: "", password: "", fullName: "", studentId: "",
    college: "", major: "", phoneNumber: "", self_introduction: "", joiningReason: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleNextStep = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.fullName || !formData.studentId || !formData.college || !formData.major || !formData.phoneNumber) {
      setError("يرجى ملء جميع الحقول الإجبارية (*)");
      return;
    }
    setError(null);
    setStep(2);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("لم يتم إنشاء المستخدم، يرجى المحاولة مرة أخرى.");
      
      const userId = authData.user.id;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: formData.fullName,
        student_id: formData.studentId,
        college: formData.college,
        major: formData.major,
        phone_number: formData.phoneNumber,
        role: 'member',
      });

      if (profileError) throw profileError;

      const { error: applicationError } = await supabase.from("club_applications").insert({
        user_id: userId,
        self_introduction: formData.self_introduction,
        joining_reason: formData.joiningReason,
      });
      
      if (applicationError) throw applicationError;

      alert("تم إنشاء حسابك بنجاح! سيتم توجيهك لصفحة تسجيل الدخول.");
      router.push("/login");

    } catch (error: any) {
      setError(error.message || "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // <-- التعديل هنا
    <div className="min-h-screen animated-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-green-700">طلب الانضمام إلى النادي</CardTitle>
          <CardDescription className="text-center">
            {step === 1 ? "الخطوة 1 من 2: المعلومات الأساسية" : "الخطوة 2 من 2: عرفنا عنك"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><Label htmlFor="fullName">الاسم الكامل *</Label><Input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
                    <div><Label htmlFor="studentId">الرقم الجامعي *</Label><Input id="studentId" name="studentId" value={formData.studentId} onChange={handleChange} required /></div>
                    <div><Label htmlFor="phoneNumber">رقم الجوال *</Label><Input id="phoneNumber" name="phoneNumber" type="tel" value={formData.phoneNumber} onChange={handleChange} required /></div>
                    <div><Label htmlFor="college">الكلية *</Label><Input id="college" name="college" value={formData.college} onChange={handleChange} required /></div>
                    <div><Label htmlFor="major">التخصص *</Label><Input id="major" name="major" value={formData.major} onChange={handleChange} required /></div>
                </div>
                <div className="border-t pt-4 space-y-4"><h3 className="font-semibold">معلومات الحساب</h3><div><Label htmlFor="email">البريد الإلكتروني *</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required className="force-ltr" /></div><div><Label htmlFor="password">كلمة المرور * (6 أحرف على الأقل)</Label><Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required /></div></div>
                <Button type="button" onClick={handleNextStep} className="w-full bg-green-600 hover:bg-green-700 text-white">التالي</Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <div><Label htmlFor="self_introduction">عرفنا عن نفسك (نبذة بسيطة، اهتماماتك)</Label><Textarea id="self_introduction" name="self_introduction" value={formData.self_introduction} onChange={handleChange}/></div>
                <div><Label htmlFor="joiningReason">لماذا ترغب بالانضمام تحديداً لنادينا؟</Label><Textarea id="joiningReason" name="joiningReason" value={formData.joiningReason} onChange={handleChange} /></div>
                <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setError(null); setStep(1); }} className="w-full">السابق</Button>
                  <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">{loading ? "جارٍ الإرسال..." : "إنهاء التسجيل"}</Button>
                </div>
              </div>
            )}
          </form>
          <div className="mt-6 space-y-4">
            <Link href="/" className="w-full block">
                <Button variant="secondary" className="w-full">
                    <ArrowRight className="h-4 w-4 ml-2" />
                    العودة إلى الصفحة الرئيسية
                </Button>
            </Link>
            <div className="text-center text-sm">
                لديك حساب بالفعل؟{' '}
                <Link href="/login" className="underline text-blue-600 hover:text-blue-800">
                  تسجيل الدخول
                </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}