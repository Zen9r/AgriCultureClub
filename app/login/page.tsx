"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) throw error

      router.push('/')
      router.refresh()

    } catch (error: any) {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  }

  return (
    // <-- التعديل هنا
    <div className="min-h-screen animated-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-green-700">تسجيل الدخول</CardTitle>
          <CardDescription className="text-center">
            أهلاً بعودتك! يرجى إدخال بياناتك للدخول.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && <p className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyPress}
                className="force-ltr" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
              />
            </div>
            
            <Button 
              type="button" 
              onClick={handleLogin}
              disabled={loading} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <Link href="/" className="w-full block">
                <Button variant="secondary" className="w-full">
                    <ArrowRight className="h-4 w-4 ml-2" />
                    العودة إلى الصفحة الرئيسية
                </Button>
            </Link>
            <div className="text-center text-sm">
                ليس لديك حساب؟{' '}
                <Link href="/register" className="underline text-blue-600 hover:text-blue-800">
                  انضم للنادي الآن
                </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}