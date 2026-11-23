"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Sparkles, Check, X, RefreshCw, ThumbsUp, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getComments, updateCommentStatus, generateCommentReply } from "@/lib/actions/engagement";

export default function EngagementPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComments() {
      try {
        setIsLoading(true);
        const data = await getComments();
        setComments(data);
      } catch (err: any) {
        setFetchError(err.message || "Failed to load comments");
      } finally {
        setIsLoading(false);
      }
    }
    loadComments();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      // Generate AI reply
      const aiReply = await generateCommentReply(id);
      // Update comment status
      await updateCommentStatus(id, "Approved & Sent");
      // Update local state
      setComments(comments.map(c =>
        c.id === id ? { ...c, status: "Approved & Sent", ai_reply: aiReply } : c
      ));
    } catch (err: any) {
      alert(err.message || "Failed to approve comment");
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await updateCommentStatus(id, "Dismissed");
      setComments(comments.map(c =>
        c.id === id ? { ...c, status: "Dismissed" } : c
      ));
    } catch (err: any) {
      alert(err.message || "Failed to dismiss comment");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Engagement Assistant</h1>
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" /> AI Replies
            </Badge>
          </div>
          <p className="text-slate-400 mt-1 text-sm">
            Review, refine, and approve AI-generated thoughtful replies to comments on your posts.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : fetchError ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      ) : comments.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-3">
            <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-200">No pending comments</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When readers comment on your published LinkedIn posts, AI-generated replies will appear here for your review and approval.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {comments.map((item) => (
            <Card key={item.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                      {item.author.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">{item.author}</h4>
                      <p className="text-xs text-slate-400">{item.author_role}</p>
                    </div>
                  </div>
                  <Badge variant={item.status === 'Approved & Sent' ? 'success' : item.status === 'Dismissed' ? 'outline' : 'warning'}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Comment on &quot;{item.post_title}&quot;</span>
                  <p className="text-xs text-slate-200 leading-relaxed">&ldquo;{item.comment_text}&rdquo;</p>
                </div>

                <div className="p-3.5 rounded-lg bg-blue-950/20 border border-blue-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Suggested Reply
                    </span>
                  </div>
                  <p className="text-xs text-slate-100 leading-relaxed">{item.ai_reply}</p>
                </div>

                {item.status === 'Pending' ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button variant="outline" size="sm" onClick={() => handleDismiss(item.id)} className="text-red-400 hover:text-red-300">
                      <X className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                    <Button variant="glow" size="sm" onClick={() => handleApprove(item.id)}>
                      <Check className="h-3.5 w-3.5" /> Approve & Post to LinkedIn
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end pt-2 text-xs text-emerald-400 font-medium">
                    ✓ Action completed successfully
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
