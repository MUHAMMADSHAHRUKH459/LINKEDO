"use client";

import { useState, useEffect } from "react";
import { Key, Check, Loader2, AlertCircle, User as LinkedinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveIntegrationSecret } from "@/lib/actions/secrets";
import { getLinkedInAuthUrl, checkLinkedInConnection } from "@/lib/actions/linkedin";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const { connected } = await checkLinkedInConnection();
      setLinkedInConnected(connected);
      setChecking(false);
    }
    check();
  }, []);

  async function handleSave(formData: FormData) {
    setLoading(true);
    await saveIntegrationSecret(formData);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  async function handleLinkedInConnect() {
    window.location.href = '/api/auth/linkedin';
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1 text-sm">Configure API credentials and social platform integrations.</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkedinIcon className="h-4 w-4 text-blue-500" /> LinkedIn Account
            </CardTitle>
            <CardDescription>Connect your LinkedIn account to enable post publishing and analytics.</CardDescription>
          </CardHeader>
          <CardContent>
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : linkedInConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Check className="h-4 w-4" /> Account Connected
                </div>
                <p className="text-xs text-slate-400">
                  Reconnect to request LinkedIn comment read and publish permissions. These permissions must also be approved for your LinkedIn app.
                </p>
                <Button onClick={handleLinkedInConnect} variant="outline" className="gap-2">
                  <LinkedinIcon className="h-4 w-4" /> Reconnect LinkedIn
                </Button>
              </div>
            ) : (
              <Button onClick={handleLinkedInConnect} variant="outline" className="gap-2">
                <LinkedinIcon className="h-4 w-4" /> Connect LinkedIn Account
              </Button>
            )}
          </CardContent>
        </Card>

        <form action={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-400" /> OpenRouter API Configuration
              </CardTitle>
              <CardDescription>Enter your OpenRouter API key for AI post generation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">OpenRouter API Key</label>
                <Input name="apiKey" type="password" placeholder="sk-or-v1-..." required />
              </div>
              <Button variant="glow" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <Check className="h-4 w-4" /> : "Save API Key"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
