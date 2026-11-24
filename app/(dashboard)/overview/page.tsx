"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  FileText,
  MessageSquare,
  ArrowUpRight,
  Plus,
  Sparkles,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getDashboardStats } from "@/lib/actions/posts";
import { getRecentActivity } from "@/lib/actions/activity";

export default function OverviewPage() {
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; type: string; title: string; time: string; status: string; likes: number; comments: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverviewData() {
      try {
        setLoading(true);
        setError(null);
        const [statsData, activityData] = await Promise.all([
          getDashboardStats(),
          getRecentActivity()
        ]);
        setStats(statsData);
        setRecentActivity(activityData);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard metrics");
      } finally {
        setLoading(false);
      }
    }
    loadOverviewData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Overview</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Welcome back. Real-time metrics for your connected LINKEDO dashboard.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/content-studio">
            <Button variant="glow" size="md">
              <Plus className="h-4 w-4" /> Create New Post
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Posts", value: loading ? "..." : stats.total.toString(), change: "All created posts", icon: FileText },
          { title: "Published Posts", value: loading ? "..." : stats.published.toString(), change: "Live on platform", icon: TrendingUp },
          { title: "Draft Posts", value: loading ? "..." : stats.drafts.toString(), change: "In development", icon: MessageSquare },
          { title: "Active Network", value: "Connected", change: "Supabase RLS Enforced", icon: Users },
        ].map((stat, i) => (
          <Card key={i} hoverEffect className="relative overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-400">{stat.title}</p>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <h3 className="text-2xl font-bold text-slate-100">{stat.value}</h3>
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> {stat.change}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Recent Activity Stream</CardTitle>
                <CardDescription>Latest automated actions and published content from database audit logs</CardDescription>
              </div>
              <Link href="/analytics" className="text-xs text-blue-400 hover:underline">
                View all analytics →
              </Link>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {loading ? (
                <div className="text-sm text-slate-500 text-center py-6">Loading recent activity...</div>
              ) : recentActivity.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-6">No recent activity recorded yet.</div>
              ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start justify-between p-3.5 rounded-lg border border-slate-800/60 bg-slate-950/40 hover:border-slate-700 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-7 w-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-200">{act.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {act.time}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="info">
                        {act.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Studio Tip / Side Info */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-indigo-950/40 border-blue-800/40">
            <CardHeader>
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">AI Studio Tip</span>
              </div>
              <CardTitle className="text-base">Maximize Post Reach</CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Posts published between 8:30 AM and 10:00 AM on Tuesdays receive higher engagement in your industry sector.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
