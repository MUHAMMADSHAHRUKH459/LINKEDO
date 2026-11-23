"use client";

import { useState, useEffect } from "react";
import { Users, Search, Filter, MessageSquare, Plus, ExternalLink, Loader2, AlertCircle } from "lucide-react";
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Networking Assistant</h1>
          <p className="text-slate-400 mt-1 text-sm">Discover and connect with high-impact professionals in your industry.</p>
        </div>
        <div className="flex items-center gap-3">
          <Input icon={<Search className="h-4 w-4" />} placeholder="Search names, titles, companies..." className="w-64" />
          <Button variant="secondary"><Filter className="h-4 w-4" /> Filters</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-slate-400">Total Connections</div>
          <div className="text-2xl font-bold text-blue-500 mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-400">Suggested</div>
          <div className="text-2xl font-bold text-slate-100 mt-1">{stats.suggested}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-400">Requested</div>
          <div className="text-2xl font-bold text-yellow-500 mt-1">{stats.requested}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-slate-400">Connected</div>
          <div className="text-2xl font-bold text-green-500 mt-1">{stats.connected}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                  {profile.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="font-bold text-slate-100">{profile.name}</h4>
                  <p className="text-xs text-slate-400">{profile.role}</p>
                </div>
              </div>
              <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="info">{profile.industry}</Badge>
              <span className="text-[11px] text-slate-500">{profile.mutual} mutual connections</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800">
              <Button variant="glow" size="sm" className="w-full" onClick={() => handleConnect(profile)}>
                <MessageSquare className="h-3.5 w-3.5" /> Send Connection Request
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {selectedLead && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Connect with ${selectedLead.name}`}
          description="Craft a personalized AI-suggested request"
        >
          <div className="space-y-4 pt-2">
            {isGeneratingAiMessage ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-sm text-slate-400">Generating AI message...</span>
              </div>
            ) : aiMessage ? (
              <Textarea
                defaultValue={aiMessage}
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
