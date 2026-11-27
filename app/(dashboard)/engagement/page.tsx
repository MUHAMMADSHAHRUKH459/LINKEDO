"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  generateCommentReply,
  generateManualCommentReply,
  getComments,
  publishCommentReply,
  refreshLinkedInComments,
  updateCommentStatus,
} from "@/lib/actions/engagement";

type EngagementComment = {
  id: string;
  author: string;
  author_role: string;
  post_title: string;
  comment_text: string;
  ai_reply: string;
  status: string;
  linkedin_post_urn?: string | null;
  linkedin_comment_urn?: string | null;
  publish_error?: string | null;
  manual?: boolean;
};

type Feedback = { type: "success" | "error"; message: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function EngagementPage() {
  const [comments, setComments] = useState<EngagementComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
  const [permissionAvailable, setPermissionAvailable] = useState<boolean | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [manualComment, setManualComment] = useState("");
  const [manualPostTitle, setManualPostTitle] = useState("");
  const [isGeneratingManual, setIsGeneratingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const reloadComments = useCallback(async () => {
    const data = await getComments();
    setComments((current) => [
      ...current.filter((item) => item.manual),
      ...(data as EngagementComment[]),
    ]);
  }, []);

  const refreshComments = useCallback(async () => {
    setIsRefreshing(true);
    setPermissionMessage(null);
    setLoadingError(null);
    try {
      const result = await refreshLinkedInComments();
      setPermissionAvailable(result.permissionAvailable);
      setPermissionMessage(result.message);
      await reloadComments();
    } catch (error) {
      setPermissionAvailable(null);
      setLoadingError(getErrorMessage(error, "Could not refresh LinkedIn comments."));
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [reloadComments]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getComments();
        if (active) setComments(data as EngagementComment[]);
        if (active) await refreshComments();
      } catch (error) {
        if (active) {
          setLoadingError(getErrorMessage(error, "Could not load comments."));
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [refreshComments]);

  const updateReply = (id: string, value: string) => {
    setComments((current) =>
      current.map((item) => (item.id === id ? { ...item, ai_reply: value } : item)),
    );
  };

  const handleGenerate = async (item: EngagementComment) => {
    setBusyId(item.id);
    setFeedback((current) => ({ ...current, [item.id]: { type: "success", message: "" } }));
    try {
      const reply = item.manual
        ? await generateManualCommentReply(item.comment_text, item.post_title)
        : await generateCommentReply(item.id);
      updateReply(item.id, reply);
      setFeedback((current) => ({
        ...current,
        [item.id]: { type: "success", message: "Reply suggestion generated. You can edit it before publishing." },
      }));
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [item.id]: { type: "error", message: getErrorMessage(error, "Could not generate a reply.") },
      }));
    } finally {
      setBusyId(null);
    }
  };

  const handleManualGenerate = async () => {
    setManualError(null);
    setIsGeneratingManual(true);
    try {
      const reply = await generateManualCommentReply(manualComment, manualPostTitle);
      setComments((current) => [
        {
          id: `manual-${Date.now()}`,
          author: "Pasted comment",
          author_role: "Manual entry",
          post_title: manualPostTitle.trim() || "Post context not provided",
          comment_text: manualComment.trim(),
          ai_reply: reply,
          status: "Draft",
          manual: true,
        },
        ...current,
      ]);
      setManualComment("");
      setManualPostTitle("");
    } catch (error) {
      setManualError(getErrorMessage(error, "Could not generate a reply."));
    } finally {
      setIsGeneratingManual(false);
    }
  };

  const handleDismiss = async (id: string) => {
    setBusyId(id);
    try {
      await updateCommentStatus(id, "Dismissed");
      setComments((current) =>
        current.map((item) => (item.id === id ? { ...item, status: "Dismissed" } : item)),
      );
      setFeedback((current) => ({
        ...current,
        [id]: { type: "success", message: "Comment dismissed." },
      }));
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [id]: { type: "error", message: getErrorMessage(error, "Could not dismiss this comment.") },
      }));
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (item: EngagementComment) => {
    setBusyId(item.id);
    setFeedback((current) => ({ ...current, [item.id]: { type: "success", message: "" } }));
    try {
      const result = await publishCommentReply(item.id, item.ai_reply);
      setComments((current) =>
        current.map((comment) =>
          comment.id === item.id ? { ...comment, status: "Approved & Sent", publish_error: null } : comment,
        ),
      );
      setFeedback((current) => ({
        ...current,
        [item.id]: {
          type: "success",
          message: result.warning || "Reply published to LinkedIn.",
        },
      }));
    } catch (error) {
      setFeedback((current) => ({
        ...current,
        [item.id]: { type: "error", message: getErrorMessage(error, "Could not publish the reply.") },
      }));
      try {
        await reloadComments();
      } catch (reloadError) {
        setFeedback((current) => ({
          ...current,
          [item.id]: {
            type: "error",
            message: `${getErrorMessage(error, "Could not publish the reply.")} ${getErrorMessage(reloadError, "")}`,
          },
        }));
      }
    } finally {
      setBusyId(null);
    }
  };

  const visibleComments = comments;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Engagement Assistant</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Review comments, refine AI reply suggestions, and publish only after your approval. Publishing requires LinkedIn&apos;s approved w_member_social_feed permission.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshComments}
          disabled={isRefreshing}
          className="self-start md:self-auto"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh LinkedIn Comments
        </Button>
      </div>

      {loadingError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{loadingError}</span>
        </div>
      )}

      {permissionMessage && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          permissionAvailable === false
            ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
            : "bg-slate-900 border-slate-800 text-slate-300"
        }`}>
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p>{permissionMessage}</p>
            {permissionAvailable === false && (
              <p>
                You can still draft a reply by pasting a comment below. Publishing requires an accessible LinkedIn comment and the{" "}
                <code className="text-xs">w_member_social_feed</code> permission.
              </p>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-slate-100">Draft from a pasted comment</h2>
          <p className="text-xs text-slate-400">
            Use this when LinkedIn comment-reading permission is unavailable. Manual drafts are not linked to a LinkedIn comment and cannot be published from here.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            aria-label="Paste a LinkedIn comment"
            placeholder="Paste the comment you want to reply to..."
            value={manualComment}
            onChange={(event) => setManualComment(event.target.value)}
            maxLength={5000}
          />
          <Textarea
            aria-label="Optional post context"
            placeholder="Optional: add the post title or context to help tailor the reply"
            value={manualPostTitle}
            onChange={(event) => setManualPostTitle(event.target.value)}
            className="min-h-[64px]"
            maxLength={500}
          />
          {manualError && <p className="text-sm text-red-400">{manualError}</p>}
          <div className="flex justify-end border-t border-slate-700/60 pt-3">
            <Button
              variant="glow"
              size="sm"
              onClick={handleManualGenerate}
              disabled={isGeneratingManual || !manualComment.trim()}
            >
              {isGeneratingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Reply
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : visibleComments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-200">No comments to review</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Refresh to retrieve comments on your LinkedIn-published posts, or paste a comment above to draft a reply.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {visibleComments.map((item) => {
            const isBusy = busyId === item.id;
            const canPublish = !item.manual && Boolean(item.linkedin_post_urn && item.linkedin_comment_urn);
            const itemFeedback = feedback[item.id];

            return (
              <Card key={item.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                        {item.author.split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{item.author}</h4>
                        <p className="text-xs text-slate-400">{item.author_role}</p>
                      </div>
                    </div>
                    <Badge variant={item.status === "Approved & Sent" ? "success" : item.status === "Dismissed" ? "outline" : "warning"}>
                      {item.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Comment on &quot;{item.post_title}&quot;
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">&ldquo;{item.comment_text}&rdquo;</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI suggested reply — edit before publishing
                    </label>
                    <Textarea
                      aria-label="Edit reply"
                      value={item.ai_reply || ""}
                      onChange={(event) => updateReply(item.id, event.target.value)}
                      disabled={!item.manual && item.status !== "Pending"}
                      placeholder="Generate a suggestion or write your reply..."
                      maxLength={3000}
                      className="min-h-[96px] bg-blue-950/20 border-blue-800/40 text-slate-100"
                    />
                  </div>

                  {item.publish_error && (
                    <p className={`text-sm ${item.status === "Publishing" ? "text-amber-300" : "text-red-400"}`}>
                      {item.publish_error}
                    </p>
                  )}
                  {itemFeedback?.message && (
                    <p className={`text-sm ${itemFeedback.type === "error" ? "text-red-400" : "text-emerald-400"}`}>
                      {itemFeedback.message}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                    {(item.status === "Pending" || item.manual) && (
                      <Button variant="outline" size="sm" onClick={() => handleGenerate(item)} disabled={isBusy}>
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {item.ai_reply ? "Regenerate" : "Generate"} Reply
                      </Button>
                    )}
                    {!item.manual && item.status === "Pending" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleDismiss(item.id)} disabled={isBusy} className="text-red-400 hover:text-red-300">
                          <X className="h-3.5 w-3.5" /> Dismiss
                        </Button>
                        {canPublish ? (
                          <Button variant="glow" size="sm" onClick={() => handlePublish(item)} disabled={isBusy || !item.ai_reply.trim()}>
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Approve &amp; Publish
                          </Button>
                        ) : (
                          <span className="text-xs text-amber-300">Sync this comment from LinkedIn to enable publishing.</span>
                        )}
                      </>
                    )}
                    {item.status === "Publishing" && (
                      <span className="flex items-center gap-2 text-xs text-amber-300">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing / verification required
                      </span>
                    )}
                    {item.status === "Approved & Sent" && (
                      <span className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> Published to LinkedIn
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
