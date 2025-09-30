"use client"

import { useState, useEffect } from "react"; // << أضفنا useEffect هنا
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast from 'react-hot-toast';

// --- استيراد المكونات ---
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function CommitteeApplicationPage() {
    const router = useRouter();
    
    // --- التعديل الرئيسي يبدأ هنا ---
    const [user, setUser] = useState<any>(null); // 1. متغير لحفظ بيانات المستخدم
    const [loadingUser, setLoadingUser] = useState(true); // 2. متغير حالة للتحميل

    // 3. هذا الـ Hook سيجلب بيانات المستخدم عند تحميل الصفحة
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoadingUser(false);
        };
        fetchUser();
    }, []);
    // --- نهاية التعديل الرئيسي ---

    const [formData, setFormData] = useState({
        skills: "",
        previousExperience: "",
        preferredCommittee: "",
        eventIdea: "",
        interestedInSpecificEvent: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
        setError("يجب عليك تسجيل الدخول أولاً.");
        setLoading(false);
        return;
    }
    if (!formData.preferredCommittee) {
        setError("يرجى اختيار لجنة للانضمام إليها.");
        setLoading(false);
        return;
    }

    // سنستخدم toast.promise لجعل التجربة أفضل
    toast.promise(
        (async () => {
            const submissionData = {
                user_id: user.id,
                skills: formData.skills,
                previous_experience: formData.previousExperience,
                preferred_committee: formData.preferredCommittee,
                event_idea: formData.eventIdea,
                interested_in_specific_event: formData.interestedInSpecificEvent,
            };

            const { error: applicationError } = await supabase
                .from("club_applications")
                .upsert(submissionData, { onConflict: 'user_id' });
            if (applicationError) throw applicationError;

            const { error: profileUpdateError } = await supabase
                .from('profiles')
                .update({
                    role: 'committee_member',
                    committee: formData.preferredCommittee as any,
                })
                .eq('id', user.id);
            if (profileUpdateError) throw profileUpdateError;
        })(),
        {
            loading: 'جارٍ تحديث طلبك...',
            success: () => {
                // عند النجاح، يتم توجيه المستخدم بعد ظهور الرسالة
                setTimeout(() => router.push("/profile"), 1000);
                return "تم تحديث طلبك بنجاح!";
            },
            error: (err) => {
                // عرض رسالة الخطأ للمستخدم
                setError(err.message || "حدث خطأ غير متوقع.");
                return err.message || "حدث خطأ غير متوقع.";
            }
        }
    ).finally(() => {
        setLoading(false);
    });
};

    // عرض رسالة تحميل بينما يتم جلب بيانات المستخدم
    if (loadingUser) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p>جارٍ التحقق من جلسة المستخدم...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen animated-background flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-green-700">الانضمام للجان النادي</CardTitle>
                    <CardDescription>بمجرد اختيارك للجنة، سيتغير منصبك في ملفك الشخصي.</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <p className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <Label htmlFor="preferredCommittee">اختر لجنتك المفضلة *</Label>
                            <Select onValueChange={(value) => handleChange("preferredCommittee", value)}>
                                <SelectTrigger id="preferredCommittee">
                                    <SelectValue placeholder="اختر لجنة..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hr">الموارد البشرية</SelectItem>
                                    <SelectItem value="pr">العلاقات العامة والإعلام</SelectItem>
                                    <SelectItem value="design">التصميم</SelectItem>
                                    <SelectItem value="logistics">اللوجستيات</SelectItem>
                                    <SelectItem value="media">الإعلام الرقمي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="skills">ما هي المهارات التي تمتلكها وتود تطويرها؟</Label>
                            <Textarea id="skills" value={formData.skills} onChange={(e) => handleChange("skills", e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="previousExperience">هل لديك خبرة سابقة في الأندية أو الأعمال التطوعية؟</Label>
                            <Textarea id="previousExperience" value={formData.previousExperience} onChange={(e) => handleChange("previousExperience", e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="eventIdea">هل لديك فكرة لفعالية تود أن يقيمها النادي؟</Label>
                            <Textarea id="eventIdea" value={formData.eventIdea} onChange={(e) => handleChange("eventIdea", e.target.value)} />
                        </div>
                         <div>
                            <Label htmlFor="interestedInSpecificEvent">هل هناك فعالية معينة من فعالياتنا السابقة أثارت اهتمامك؟</Label>
                            <Textarea id="interestedInSpecificEvent" value={formData.interestedInSpecificEvent} onChange={(e) => handleChange("interestedInSpecificEvent", e.target.value)} />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                            {loading ? "جارٍ الإرسال..." : "تأكيد الانضمام للجنة"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}