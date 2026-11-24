"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, Filter, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPosts, savePost } from "@/lib/actions/posts";
import { formatDateForDisplay } from "@/lib/utils";

export default function ContentCalendarPage() {
  const [currentView, setCurrentView] = useState<"calendar" | "list">("calendar");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("09:00 AM");

  useEffect(() => {
    async function loadPosts() {
      try {
        setIsLoading(true);
        const data = await getPosts();
        setScheduledPosts(data);
      } catch (err: any) {
        setFetchError(err.message || "Failed to load posts");
      } finally {
        setIsLoading(false);
      }
    }
    loadPosts();
  }, []);

  const handleSchedulePost = async () => {
    try {
      const formData = new FormData();
      if (editPostId) formData.append('id', editPostId);
      formData.append('title', title);
      formData.append('content', content);
      formData.append('status', 'Scheduled');
      if (dateStr) {
        formData.append('scheduled_at', new Date(dateStr).toISOString());
      }

      await savePost(formData);
      const updated = await getPosts();
      setScheduledPosts(updated);
      setIsNewModalOpen(false);
      setIsEditModalOpen(false);
      setTitle("");
      setContent("");
      setDateStr("");
      setEditPostId(null);
    } catch (err: any) {
      alert(err.message || "Failed to save post");
    }
  };

  const openEditModal = (post: any) => {
    setEditPostId(post.id);
    setTitle(post.title);
    setContent(post.content);
    if (post.scheduled_at) {
      const d = new Date(post.scheduled_at);
      setDateStr(d.toISOString().split('T')[0]);
    }
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">Content Calendar</h1>
            <Badge variant="default">November 2026</Badge>
          </div>
          <p className="text-slate-400 mt-1 text-sm">
            Organize, schedule, and preview your upcoming LinkedIn publishing pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">
            <button
              onClick={() => setCurrentView("calendar")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentView === "calendar" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setCurrentView("list")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentView === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              List View
            </button>
          </div>
          <Button variant="glow" size="md" onClick={() => {
            setTitle("");
            setContent("");
            setDateStr("");
            setEditPostId(null);
            setIsNewModalOpen(true);
          }}>
            <Plus className="h-4 w-4" /> Schedule Post
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : fetchError ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      ) : currentView === "calendar" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">November 2026</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7"><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-7 w-7"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500"></span> Scheduled</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Draft</span>
            </div>
          </CardHeader>
          <CardContent>
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm">
                No scheduled posts found. Click &quot;Schedule Post&quot; to add content.
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 30 }).map((_, i) => {
                  const dayNum = i + 1;
                  const matchingPost = scheduledPosts.find((p) => {
                    if (!p.scheduled_at) return false;
                    const d = new Date(p.scheduled_at);
                    return d.getDate() === dayNum && d.getMonth() === 10; // November
                  });
                  return (
                    <div
                      key={i}
                      className={`min-h-[72px] rounded-lg border p-1.5 flex flex-col justify-between transition-colors sm:min-h-[110px] sm:p-2.5 ${
                        matchingPost
                          ? "border-blue-500/40 bg-blue-950/20 cursor-pointer hover:border-blue-400"
                          : "border-slate-800/80 bg-slate-950/40 hover:border-slate-700"
                      }`}
                      onClick={() => matchingPost && openEditModal(matchingPost)}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${matchingPost ? "text-blue-400" : "text-slate-400"}`}>
                          {dayNum}
                        </span>
                        {matchingPost && (
                          <Badge variant={matchingPost.status === 'Scheduled' ? 'default' : 'warning'} className="text-[10px] px-1.5 py-0">
                            {matchingPost.status}
                          </Badge>
                        )}
                      </div>
                      {matchingPost ? (
                        <div className="space-y-1 mt-2">
                          <p className="text-[11px] font-medium text-slate-200 line-clamp-2 leading-tight">
                            {matchingPost.title}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDateForDisplay(matchingPost.scheduled_at)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 italic">No posts</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Pipeline</CardTitle>
            <CardDescription>Detailed chronological list of all queued content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scheduledPosts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No scheduled posts found.
              </div>
            ) : (
              scheduledPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-100">{post.title}</h4>
                      <Badge variant="secondary">{post.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {formatDateForDisplay(post.scheduled_at)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(post)}>Edit</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* New / Edit Schedule Modal */}
      <Modal
        isOpen={isNewModalOpen || isEditModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setIsEditModalOpen(false);
        }}
        title={editPostId ? "Edit Scheduled Post" : "Schedule New Post"}
        description="Select date, time, and content for automated publishing"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Post Title / Topic</label>
            <Input
              placeholder="e.g., Scaling Microservices with Next.js"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Date</label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Time</label>
              <Input
                type="text"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                placeholder="09:00 AM"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Content</label>
            <Textarea
              placeholder="Write or paste your post content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="secondary" onClick={() => {
              setIsNewModalOpen(false);
              setIsEditModalOpen(false);
            }}>Cancel</Button>
            <Button variant="default" onClick={handleSchedulePost}>
              {editPostId ? "Update Schedule" : "Confirm Schedule"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
