"use client";

import { BarChart3, TrendingUp, Users, Eye, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">Comprehensive performance metrics for your LinkedIn content and network growth.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-400">Total Reach</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-2 text-3xl font-bold text-slate-100">68,420</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            <ArrowUpRight className="h-3 w-3" /> +15.4% this month
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-400">Total Engagements</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-2 text-3xl font-bold text-slate-100">4,120</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            <ArrowUpRight className="h-3 w-3" /> +8.2% this month
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-400">Profile Conversion</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <h3 className="mt-2 text-3xl font-bold text-slate-100">4.2%</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            <ArrowUpRight className="h-3 w-3" /> +0.5% this month
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-300" />
            Content Performance Breakdown
          </CardTitle>
          <CardDescription>Impressions and likes per published post</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { title: "Why AI-Driven Workflows are Transforming SaaS", impressions: "14.2K", likes: "310", comments: "45", rate: "8.8%" },
            { title: "The Future of Next.js App Router Architecture", impressions: "12.8K", likes: "285", comments: "38", rate: "7.9%" },
            { title: "Building High-Performance Engineering Teams", impressions: "9.4K", likes: "192", comments: "21", rate: "6.4%" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-xl border border-slate-700/60 bg-slate-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h4 className="text-sm font-medium text-slate-200">{item.title}</h4>
                <p className="text-xs text-slate-400">Impressions: {item.impressions} • Comments: {item.comments}</p>
              </div>
              <div className="w-full shrink-0 sm:w-40">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-500">Engagement rate</span>
                  <span className="text-sm font-semibold text-blue-300">{item.rate}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-slate-800"
                  role="img"
                  aria-label={`${item.rate} engagement rate`}
                >
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${Number.parseFloat(item.rate) * 10}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
