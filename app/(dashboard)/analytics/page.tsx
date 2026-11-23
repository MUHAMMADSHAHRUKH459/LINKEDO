"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, Users, Eye, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Analytics</h1>
          <p className="text-slate-400 mt-1 text-sm">Comprehensive performance metrics for your LinkedIn content and network growth.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Total Reach</p>
          <h3 className="text-3xl font-bold mt-2 text-slate-100">68,420</h3>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" /> +15.4% this month
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Total Engagements</p>
          <h3 className="text-3xl font-bold mt-2 text-slate-100">4,120</h3>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" /> +8.2% this month
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium text-slate-400">Profile Conversion</p>
          <h3 className="text-3xl font-bold mt-2 text-slate-100">4.2%</h3>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" /> +0.5% this month
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content Performance Breakdown</CardTitle>
          <CardDescription>Impressions and likes per published post</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { title: "Why AI-Driven Workflows are Transforming SaaS", impressions: "14.2K", likes: "310", comments: "45", rate: "8.8%" },
            { title: "The Future of Next.js App Router Architecture", impressions: "12.8K", likes: "285", comments: "38", rate: "7.9%" },
            { title: "Building High-Performance Engineering Teams", impressions: "9.4K", likes: "192", comments: "21", rate: "6.4%" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-slate-200">{item.title}</h4>
                <p className="text-xs text-slate-400">Impressions: {item.impressions} • Comments: {item.comments}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-400">{item.rate}</span>
                <span className="text-[10px] text-slate-500 block">Engagement Rate</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
