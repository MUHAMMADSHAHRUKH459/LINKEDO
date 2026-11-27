"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  MessageSquare,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
  Clock3,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { getNetworkingProfiles, generateNetworkingMessage, saveConnectionRequest, getNetworkingStats } from "@/lib/actions/networking";

export default function NetworkingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string; role: string; industry: string; mutual: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isGeneratingAiMessage, setIsGeneratingAiMessage] = useState(false);
  const [stats, setStats] = useState({ total: 0, suggested: 0, requested: 0, connected: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [profilesData, statsData] = await Promise.all([
          getNetworkingProfiles(),
          getNetworkingStats()
        ]);
        setProfiles(profilesData);
        setStats(statsData);
      } catch (err: any) {
        setFetchError(err.message || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleConnect = async (profile: any) => {
    setSelectedLead(profile);
    setIsModalOpen(true);
    // Generate AI message when modal opens for the first time
    if (profile && !aiMessage) {
      try {
        setIsGeneratingAiMessage(true);
        const message = await generateNetworkingMessage(profile.id);
        setAiMessage(message);
      } catch (err: any) {
        setAiMessage(err.message || "Failed to generate AI message");
      } finally {
        setIsGeneratingAiMessage(false);
      }
    }
  };

  const handleSendRequest = async () => {
    try {
      // Generate AI message if not already generated
      if (!aiMessage) {
        setIsGeneratingAiMessage(true);
        const message = await generateNetworkingMessage(selectedLead.id);
        setAiMessage(message);
        setIsGeneratingAiMessage(false);
      }

      // Show confirmation with editable message
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Error generating AI message:', err.message);
      setAiMessage(err.message || 'Failed to generate AI message');
      setIsGeneratingAiMessage(false);
    }
  };

  const handleConfirmConnect = async () => {
    try {
      await saveConnectionRequest({
        name: selectedLead.name,
        role: selectedLead.role,
        industry: selectedLead.industry,
        mutualCount: selectedLead.mutual
      });
    } catch (err: any) {
      console.error('Error saving connection request:', err.message);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Networking Assistant</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            Review suggested professionals and prepare a personal introduction for your next connection.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Input
            icon={<Search className="h-4 w-4" />}
            aria-label="Search networking profiles"
            placeholder="Search profiles..."
            className="w-full sm:min-w-64 md:w-64"
          />
          <Button variant="secondary" className="shrink-0"><Filter className="h-4 w-4" /> Filters</Button>
        </div>
      </div>

      <section aria-label="Networking summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total connections", value: stats.total, icon: Users, tone: "text-blue-300 bg-blue-500/10 border-blue-400/15" },
          { label: "Suggested", value: stats.suggested, icon: Sparkles, tone: "text-violet-300 bg-violet-500/10 border-violet-400/15" },
          { label: "Requested", value: stats.requested, icon: Clock3, tone: "text-amber-200 bg-amber-500/10 border-amber-400/15" },
          { label: "Connected", value: stats.connected, icon: CheckCircle2, tone: "text-emerald-300 bg-emerald-500/10 border-emerald-400/15" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-400 sm:text-xs">{stat.label}</p>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${stat.tone}`}>
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">{stat.value}</div>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Suggested professionals</h2>
            <p className="mt-1 text-xs text-slate-500">Review each profile before preparing a connection note.</p>
          </div>
          {!isLoading && <span className="text-xs text-slate-500">{profiles.length} profiles</span>}
        </div>

        {fetchError && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Loading profiles">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-2xl border border-slate-700/60 bg-slate-900/50" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <Card className="border-dashed py-10 text-center">
            <CardContent className="space-y-3">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/70 text-slate-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No profile suggestions yet</h3>
              <p className="mx-auto max-w-sm text-xs leading-5 text-slate-500">
                Suggested professionals will appear here when they are available for your network.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {profiles.map((profile) => (
              <Card key={profile.id} className="flex flex-col p-4 transition-colors hover:border-slate-600 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-sm font-semibold text-blue-200">
                    {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-100">{profile.name}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{profile.role}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Open ${profile.name}'s profile`}
                    className="h-8 w-8 shrink-0"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/60 pt-3">
                  <Badge variant="info">{profile.industry}</Badge>
                  <span className="text-[11px] text-slate-500">{profile.mutual} mutual connections</span>
                </div>
                <div className="mt-4">
                  <Button variant="glow" size="sm" className="w-full" onClick={() => handleConnect(profile)}>
                    <MessageSquare className="h-3.5 w-3.5" /> Prepare connection note
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {selectedLead && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Connect with ${selectedLead.name}`}
          description="Review a suggested introduction for this professional."
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-semibold text-blue-200">
                {selectedLead.name.split(' ').map((part: string) => part[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{selectedLead.name}</p>
                <p className="truncate text-xs text-slate-400">{selectedLead.role}</p>
              </div>
            </div>
            {isGeneratingAiMessage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-sm text-slate-400">Generating AI message...</span>
              </div>
            ) : aiMessage ? (
              <Textarea
                defaultValue={aiMessage}
                aria-label="Personalized connection message"
                className="min-h-[160px]"
              />
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{aiMessage}</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant="glow" onClick={() => {
                handleSendRequest();
              }}>Send Personalized Request</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
