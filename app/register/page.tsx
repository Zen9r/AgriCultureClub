//app/register/page.tsx

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"
import { ArrowRight, Eye, EyeOff, CheckCircle, Home, LogIn } from "lucide-react"

// Zod schema for form validation
const registerSchema = z.object({
  email: z.string().email("الايميل الجامعي غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  fullName: z.string().min(1, "الاسم الكامل مطلوب"),
  studentId: z.string().min(1, "الرقم الجامعي مطلوب"),
  college: z.string().min(1, "الكلية مطلوبة"),
  major: z.string().min(1, "التخصص مطلوب"),
  otherMajor: z.string().optional(),
  phoneNumber: z.string().min(1, "رقم الجوال مطلوب"),
  self_introduction: z.string().optional(),
  joiningReason: z.string().optional(),
}).refine((data) => {
  // If major is "اخرى", otherMajor is required
  if (data.major === "اخرى") {
    return data.otherMajor && data.otherMajor.trim() !== "";
  }
  return true;
}, {
  message: "تخصص آخر مطلوب",
  path: ["otherMajor"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    watch,
    control,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  })

  // Watch all required fields for step 1
  const watchedFields = watch(['fullName', 'studentId', 'phoneNumber', 'college', 'major', 'email', 'password'])
  const watchedOtherMajor = watch('otherMajor')
  
  // Calculate progress using useEffect
  useEffect(() => {
    if (step === 1) {
      const requiredFields: (keyof RegisterFormData)[] = ['fullName', 'studentId', 'phoneNumber', 'college', 'major', 'email', 'password']
      
      // If major is "اخرى", also include otherMajor
      if (watchedFields[4] === "اخرى") { // major is at index 4
        requiredFields.push("otherMajor")
      }
      
      // Count fields that are validly filled (not empty and no errors)
      let validFields = 0
      requiredFields.forEach((field, index) => {
        if (field === 'otherMajor') {
          // Check otherMajor field
          if (watchedOtherMajor && watchedOtherMajor.trim() !== '' && !errors.otherMajor) {
            validFields++
          }
        } else {
          // Check regular fields
          const fieldValue = watchedFields[index]
          if (fieldValue && fieldValue.trim() !== '' && !errors[field]) {
            validFields++
          }
        }
      })
      
      const totalFields = requiredFields.length
      const progressValue = Math.round((validFields / totalFields) * 50) // 50% for step 1
      setProgress(progressValue)
    } else {
      // Step 2 - set progress to 100%
      setProgress(100)
    }
  }, [watchedFields, watchedOtherMajor, errors, step])

  const handleNextStep = async () => {
    const fieldsToValidate: (keyof RegisterFormData)[] = ['email', 'password', 'fullName', 'studentId', 'college', 'major', 'phoneNumber']
    
    // If major is "اخرى", also validate otherMajor
    if (watch("major") === "اخرى") {
      fieldsToValidate.push("otherMajor")
    }
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setError(null)
      setStep(2)
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("لم يتم إنشاء المستخدم، يرجى المحاولة مرة أخرى.");
      
      const userId = authData.user.id;

      // Determine the final major value
      const finalMajor = data.major === "اخرى" ? data.otherMajor : data.major;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: data.fullName,
        student_id: data.studentId,
        college: data.college,
        major: finalMajor,
        phone_number: data.phoneNumber,
        role: 'member',
      });

      if (profileError) throw profileError;

      const { error: applicationError } = await supabase.from("club_applications").insert({
        user_id: userId,
        self_introduction: data.self_introduction || "",
        joining_reason: data.joiningReason || "",
      });
      
      if (applicationError) throw applicationError;

      setIsSuccessDialogOpen(true);

    } catch (error: any) {
      setError(error.message || "حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen animated-background flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-3xl mx-2 sm:mx-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-green-700">طلب الانضمام إلى النادي</CardTitle>
          <CardDescription className="text-center">
            {step === 1 ? "الخطوة 1 من 2: المعلومات الأساسية" : "الخطوة 2 من 2: عرفنا عنك"}
          </CardDescription>
          <div className="mt-4">
            <Progress value={progress} className="h-2 transition-all duration-300" />
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="fullName">الاسم الكامل *</Label>
                      <Input 
                        id="fullName" 
                        {...register("fullName")} 
                        className={errors.fullName ? "border-red-500" : ""}
                      />
                      {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="studentId">الرقم الجامعي *</Label>
                      <Input 
                        id="studentId" 
                        {...register("studentId")} 
                        className={errors.studentId ? "border-red-500" : ""}
                      />
                      {errors.studentId && <p className="text-red-500 text-sm mt-1">{errors.studentId.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phoneNumber">رقم الجوال *</Label>
                      <Input 
                        id="phoneNumber" 
                        type="tel" 
                        {...register("phoneNumber")} 
                        className={errors.phoneNumber ? "border-red-500" : ""}
                      />
                      {errors.phoneNumber && <p className="text-red-500 text-sm mt-1">{errors.phoneNumber.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="college">الكلية *</Label>
                      <Controller
                        name="college"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={errors.college ? "border-red-500" : ""}>
                              <SelectValue placeholder="اختر الكلية" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="كلية علوم الاغذية والزراعة">كلية علوم الاغذية والزراعة</SelectItem>
                              <SelectItem value="اخرى">اخرى</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.college && <p className="text-red-500 text-sm mt-1">{errors.college.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="major">التخصص *</Label>
                      <Controller
                        name="major"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className={errors.major ? "border-red-500" : ""}>
                              <SelectValue placeholder="اختر التخصص" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="علوم الانتاج النباتي">علوم الانتاج النباتي</SelectItem>
                              <SelectItem value="الهندسة الزراعية">الهندسة الزراعية</SelectItem>
                              <SelectItem value="وقاية النبات">وقاية النبات</SelectItem>
                              <SelectItem value="الاقتصاد الزراعي">الاقتصاد الزراعي</SelectItem>
                              <SelectItem value="علوم الأغذية التغذية">علوم الأغذية والتغذية</SelectItem>
                              <SelectItem value="اخرى">اخرى</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.major && <p className="text-red-500 text-sm mt-1">{errors.major.message}</p>}
                      
                      {/* Conditional input for "other" major */}
                      {watch("major") === "اخرى" && (
                        <div className="mt-2">
                          <Label htmlFor="otherMajor">تخصص آخر *</Label>
                          <Input 
                            id="otherMajor" 
                            {...register("otherMajor")} 
                            placeholder="اكتب تخصصك"
                            className={errors.otherMajor ? "border-red-500" : ""}
                          />
                          {errors.otherMajor && <p className="text-red-500 text-sm mt-1">{errors.otherMajor.message}</p>}
                        </div>
                      )}
                    </div>
                </div>
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">معلومات الحساب</h3>
                  <div>
                    <Label htmlFor="email">الايميل الجامعي *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      {...register("email")} 
                      className={`force-ltr ${errors.email ? "border-red-500" : ""}`}
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="password">كلمة المرور * (6 أحرف على الأقل)</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        {...register("password")} 
                        className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
                  </div>
                </div>
                <Button type="button" onClick={handleNextStep} className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-4 h-14">التالي</Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="self_introduction">عرفنا عن نفسك (نبذة بسيطة، اهتماماتك)</Label>
                  <Textarea 
                    id="self_introduction" 
                    {...register("self_introduction")} 
                    className={errors.self_introduction ? "border-red-500" : ""}
                  />
                  {errors.self_introduction && <p className="text-red-500 text-sm mt-1">{errors.self_introduction.message}</p>}
                </div>
                <div>
                  <Label htmlFor="joiningReason">لماذا ترغب بالانضمام تحديداً لنادينا؟</Label>
                  <Textarea 
                    id="joiningReason" 
                    {...register("joiningReason")} 
                    className={errors.joiningReason ? "border-red-500" : ""}
                  />
                  {errors.joiningReason && <p className="text-red-500 text-sm mt-1">{errors.joiningReason.message}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setError(null); setStep(1); }} className="w-full text-sm py-3 h-12">السابق</Button>
                  <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-4 h-14">{loading ? "جارٍ الإرسال..." : "إنهاء التسجيل"}</Button>
                </div>
              </div>
            )}
          </form>
          <div className="mt-6 space-y-4">
            <Link href="/" className="w-full block">
                <Button variant="secondary" className="w-full text-sm py-3 h-12">
                    <ArrowRight className="h-4 w-4 mr-2" />
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
      
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-lg text-center p-4 sm:p-8 mx-4 sm:mx-0">
          <DialogHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-3xl font-bold text-green-700 mb-3">🎉 مرحباً بك!</DialogTitle>
            <DialogDescription className="pt-2 text-lg text-gray-700 leading-relaxed">
              تم إنشاء حسابك بنجاح في نادي علوم الأغذية والزراعة.<br/>
              يمكنك الآن تسجيل الدخول والاستمتاع بجميع الفعاليات والأنشطة.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 w-full">
            <Link href="/login" className="w-full">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-semibold py-4 h-14">
                <LogIn className="mr-2 h-5 w-5" />
                الانتقال لتسجيل الدخول
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full text-sm py-3 h-12">
                <Home className="mr-2 h-4 w-4" />
                العودة إلى الرئيسية
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}