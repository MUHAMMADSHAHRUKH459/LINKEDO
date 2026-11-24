"use client";

import { useState } from "react";
import { Sparkles, Copy, Send, Check, History, LayoutTemplate, Eye, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { savePost, getPosts, deletePost } from "@/lib/actions/posts";
import { generatePostContent } from "@/lib/actions/ai";

export default function ContentStudioPage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("Professional");
  const [postContent, setPostContent] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const [drafts, setDrafts] = useState<any[]>([]);

  // Generate AI content without saving to database
const handleGenerate = async () => {
  if (!topic) return;
  setIsGenerating(true);
  setError(null);
  try {
    const result = await generatePostContent(topic, tone);
    setPostContent(result);
  } catch (err: any) {
    setError(err.message || "AI generation failed. Please check your OpenRouter API key in Settings.");
  } finally {
    setIsGenerating(false);
  }
};

const handleSaveDraft = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setError(null);
    try {
      const formData = new FormData();
      if (postId) formData.append('id', postId);
      formData.append('title', topic);
      formData.append('content', postContent);
      formData.append('status', 'Draft');

      await savePost(formData);
      const updatedDrafts = await getPosts();
      setDrafts(updatedDrafts);
    } catch (err: any) {
      setError(err.message || "Failed to save draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(postContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Content Studio</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Create, refine, and optimize high-engagement LinkedIn posts using advanced AI models.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor & Generator */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Post Generator</CardTitle>
              <CardDescription>Enter a topic or outline to generate a polished LinkedIn post instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Topic or Core Idea</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., The benefits of micro-frontends in enterprise apps..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                  <Button variant="glow" onClick={handleSaveDraft} disabled={isGenerating || !topic}>
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Save Draft
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic}
                  className="w-full"
                >
                  {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Generate Post
                      </>
                    )}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">Tone of Voice</label>
                <div className="flex flex-wrap gap-2">
                  {["Professional", "Thought Leader", "Casual & Engaging", "Storytelling", "Data-Driven"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tone === t
                          ? "bg-blue-600 text-white border border-blue-500"
                          : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Post Content & Preview</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                      setIsDeleteConfirmOpen(true);
                    }}
                      disabled={!postContent}
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      disabled={!postContent}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Your generated post will appear here... You can also edit it directly or write from scratch."
                  className="min-h-[220px]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  {postContent.length} characters • Optimized for LinkedIn algorithm
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="md">Save as Draft</Button>
                  <Button variant="default" size="md">
                    <Send className="h-4 w-4" /> Schedule / Publish
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Post History Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-400" /> Post History
              </CardTitle>
              <CardDescription>Recent drafts and published content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.map((item) => (
                <div
                  key={item.id}
	                  onClick={() => {
                        setTopic(item.title);
                        setPostContent(item.content);
                        setPostId(item.id);
                      }}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-semibold text-slate-200 line-clamp-1">{item.title}</h4>
                    <Badge variant={item.status === 'Published' ? 'success' : 'warning'}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.content}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/50">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <Button
                      variant="danger"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(item.id);
                        setIsDeleteConfirmOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="Confirm Draft Deletion"
        description="This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                JD
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">John Doe</h4>
                <p className="text-xs text-slate-400">Lead Software Architect & Full-Stack Developer</p>
                <span className="text-[10px] text-slate-500">Just now • 🌐</span>
              </div>
            </div>
            <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
              {postContent}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deletePost(deletingId);
                const updatedDrafts = await getPosts();
                setDrafts(updatedDrafts);
                setIsDeleteConfirmOpen(false);
                if (postId === deletingId) {
                  setPostId(null);
                  setTopic("");
                  setPostContent("");
                }
              }}
            >
              Delete Draft
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
