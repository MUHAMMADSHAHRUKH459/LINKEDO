'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.png" alt="LINKEDO" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-slate-400 mt-2">Sign in to LINKEDO</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          <form action={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Password</label>
                  <Link href="/reset-password" className="text-xs text-blue-400 hover:underline">
                    Forgot password?
                  </Link>
                </div>
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
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
              <p className="text-sm text-slate-400 text-center">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-blue-400 hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
