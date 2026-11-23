'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await signUp(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-slate-400 mt-2">Start your LinkedIn growth journey</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          {success ? (
            <CardContent className="pt-6 space-y-4 text-center">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-slate-100">Check your email</h2>
              <p className="text-slate-400 text-sm">
                We&apos;ve sent a confirmation link to your email address. Please click it to activate your account.
              </p>
              <Link
                href="/login"
                className="w-full h-10 inline-flex items-center justify-center font-medium transition-all duration-200 border border-slate-800 bg-slate-950/50 hover:bg-slate-800/80 hover:border-slate-700 text-slate-200 rounded-lg text-sm"
              >
                Back to Login
              </Link>
            </CardContent>
          ) : (
            <form action={handleSubmit}>
              <CardContent className="space-y-4 pt-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Full Name</label>
                  <Input
                    name="fullName"
                    placeholder="John Doe"
                    required
                    className="bg-slate-950/50 border-slate-800 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Email Address</label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    className="bg-slate-950/50 border-slate-800 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="bg-slate-950/50 border-slate-800 focus:border-blue-500"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button variant="glow" className="w-full" disabled={loading} type="submit">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Create Account'}
                </Button>
                <p className="text-sm text-slate-400 text-center">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-400 hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
