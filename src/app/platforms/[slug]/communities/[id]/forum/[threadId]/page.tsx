"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, orderBy, limit, updateDoc, increment, addDoc, serverTimestamp, deleteDoc, where } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Reply, MoreVertical, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import KtdLexicalEditor from "@/components/lexical-editor";
import { LoadingButton } from "@/components/loading-button";
import { Breadcrumbs } from "@/components/breadcrumbs";

type Params = { params: Promise<{ slug: string; id: string; threadId: string }> };

export default function ForumThreadPage({ params }: Params) {
  const { slug, id, threadId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [platform, setPlatform] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ replyId?: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState("");
  const [editingThread, setEditingThread] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        // Load platform
        const platformSnap = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug)) as any);
        const platformDoc = platformSnap.docs[0];
        if (!platformDoc) {
          router.replace("/platforms");
          return;
        }
        const platformData = { id: platformDoc.id, ...(platformDoc.data() as Record<string, any>) };
        setPlatform(platformData);

        // Load community
        const commDoc = await getDoc(doc(db, "platforms", platformDoc.id, "communities", id));
        if (!commDoc.exists()) {
          router.replace("/platforms");
          return;
        }
        const commData: any = { id: commDoc.id, ...(commDoc.data() as Record<string, any>) };
        setCommunity(commData);

        // Owner check
        const ownerId = (platformData as any)?.ownerId;
        const uid = auth.currentUser?.uid;
        const altId = (user as any)?.id;
        setIsOwner(!!ownerId && ((!!uid && ownerId === uid) || (!!altId && ownerId === altId)));

        // Membership check
        if (uid) {
          const m = await getDoc(doc(db, "platforms", platformDoc.id, "members", uid));
          setIsMember(m.exists());
        }

        // Load thread
        const threadDoc = await getDoc(doc(db, "platforms", platformDoc.id, "forums", threadId));
        if (!threadDoc.exists()) {
          router.replace(`/platforms/${slug}/communities/${id}?tab=forum`);
          return;
        }
        const threadData: any = { id: threadDoc.id, ...(threadDoc.data() as Record<string, any>) };
        setThread(threadData);
        setEditTitle(threadData.title);
        setEditContent(threadData.content);

        // Load replies
        try {
          const repliesSnap = await getDocs(query(
            collection(db, "platforms", platformDoc.id, "forums", threadId, "replies"),
            orderBy("createdAt", "asc"),
            limit(100)
          ) as any);
          const repliesList = repliesSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
          setReplies(repliesList);
        } catch (e) {
          console.error("Failed to load replies", e);
          setReplies([]);
        }
      } catch (e) {
        console.error("Failed to load thread", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, id, threadId, router, user]);

  async function handleAddReply(replyToId?: string) {
    if (!auth.currentUser) {
      toast.error("Please sign in to reply");
      return;
    }
    if (!isMember && !isOwner) {
      toast.error("You must be a member to reply");
      return;
    }

    const plainText = replyContent.replace(/<[^>]*>/g, "").trim();
    if (!plainText) {
      toast.error("Please provide a reply");
      return;
    }

    try {
      const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
      const authorUid = auth.currentUser.uid || (user as any)?.id || "anonymous";
      
      const newReply = {
        content: replyContent.trim(),
        createdAt: serverTimestamp(),
        threadId,
        replyToId: replyToId || null,
        authorId: authorUid,
        authorName: displayName,
        authorAvatar: auth.currentUser?.photoURL || (user as any)?.photoURL || "",
      };

      await addDoc(collection(db, "platforms", platform?.id, "forums", threadId, "replies"), newReply);
      await updateDoc(doc(db, "platforms", platform?.id, "forums", threadId), { replies: increment(1) });
      
      // Reload replies
      const repliesSnap = await getDocs(query(
        collection(db, "platforms", platform?.id, "forums", threadId, "replies"),
        orderBy("createdAt", "asc"),
        limit(100)
      ) as any);
      const repliesList = repliesSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
      setReplies(repliesList);
      setThread((prev: any) => prev ? { ...prev, replies: (prev.replies || 0) + 1 } : null);
      
      setReplyContent("");
      setReplyingTo(null);
      setEditorKey((prev: number) => prev + 1);
      toast.success("Reply added");
    } catch (e) {
      console.error("Failed to add reply", e);
      toast.error("Failed to add reply");
    }
  }

  async function handleEditReply(replyId: string) {
    const reply = replies.find(r => r.id === replyId);
    if (!reply) return;
    setEditingReplyId(replyId);
    setEditReplyContent(reply.content);
    setEditorKey(prev => prev + 1);
  }

  async function handleEditReplySubmit(replyId: string) {
    const plainText = editReplyContent.replace(/<[^>]*>/g, "").trim();
    if (!plainText) {
      toast.error("Please provide reply content");
      return;
    }

    try {
      await updateDoc(doc(db, "platforms", platform?.id, "forums", threadId, "replies", replyId), {
        content: editReplyContent.trim(),
      });
      
      setReplies((prev: any[]) => prev.map((r: any) => 
        r.id === replyId 
          ? { ...r, content: editReplyContent.trim() }
          : r
      ));
      
      setEditingReplyId(null);
      setEditReplyContent("");
      setEditorKey((prev: number) => prev + 1);
      toast.success("Reply updated");
    } catch (e) {
      console.error("Failed to update reply", e);
      toast.error("Failed to update reply");
    }
  }

  async function handleDeleteReply(replyId: string) {
    try {
      await deleteDoc(doc(db, "platforms", platform?.id, "forums", threadId, "replies", replyId));
      await updateDoc(doc(db, "platforms", platform?.id, "forums", threadId), { replies: increment(-1) });
      setReplies((prev: any[]) => prev.filter((r: any) => r.id !== replyId));
      setThread((prev: any) => prev ? { ...prev, replies: Math.max(0, (prev.replies || 0) - 1) } : null);
      toast.success("Reply deleted");
    } catch (e) {
      toast.error("Failed to delete reply");
    }
  }

  async function handleEditThread() {
    if (!thread) return;
    setEditingThread(true);
    setEditTitle(thread.title);
    setEditContent(thread.content);
    setEditorKey(prev => prev + 1);
  }

  async function handleEditThreadSubmit() {
    const plainText = editContent.replace(/<[^>]*>/g, "").trim();
    if (!editTitle.trim() || !plainText) {
      toast.error("Please provide both a title and content");
      return;
    }

    try {
      await updateDoc(doc(db, "platforms", platform?.id, "forums", threadId), {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      
      setThread((prev: any) => prev ? { ...prev, title: editTitle.trim(), content: editContent.trim() } : null);
      
      setEditingThread(false);
      setEditTitle("");
      setEditContent("");
      setEditorKey((prev: number) => prev + 1);
      toast.success("Thread updated");
    } catch (e) {
      console.error("Failed to update thread", e);
      toast.error("Failed to update thread");
    }
  }

  async function handleDeleteThread() {
    try {
      await deleteDoc(doc(db, "platforms", platform?.id, "forums", threadId));
      toast.success("Thread deleted");
      router.push(`/platforms/${slug}/communities/${id}?tab=forum`);
    } catch (e) {
      toast.error("Failed to delete thread");
    }
  }

  if (loading || !platform || !community || !thread) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const currentUid = auth.currentUser?.uid || (user as any)?.id;
  const isSelf = !!currentUid && thread.authorId === currentUid;
  const authorName = thread.authorName || (isSelf ? ((user as any)?.displayName || (user as any)?.name || (user as any)?.email || "You") : "Unknown User");
  const authorAvatar = thread.authorAvatar || ((isSelf ? ((user as any)?.photoURL || "") : ""));
  const canPost = (isMember || isOwner) && user;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs 
        items={[
          { label: "Platforms", href: "/platforms" },
          { label: slug, href: `/platforms/${slug}` },
          { label: community.name, href: `/platforms/${slug}/communities/${id}?tab=forum` },
          { label: thread.title }
        ]} 
      />

      {/* Back Button */}
      <Button variant="outline" asChild className="mb-4">
        <Link href={`/platforms/${slug}/communities/${id}?tab=forum`} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Forum
        </Link>
      </Button>

      {/* Thread */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Thread Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingThread ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Thread title..."
                  className="w-full px-3 py-2 border rounded-md text-lg font-semibold mb-2"
                  maxLength={200}
                />
              ) : (
                <h1 className="text-2xl font-semibold mb-2">{thread.title}</h1>
              )}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={authorAvatar} alt={authorName} />
                  <AvatarFallback>{authorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span>{authorName}</span>
                <span>•</span>
                <span>{formatRelativeTime(thread.createdAt)}</span>
                {thread.replies > 0 && (
                  <>
                    <span>•</span>
                    <span>{thread.replies} {thread.replies === 1 ? "reply" : "replies"}</span>
                  </>
                )}
              </div>
            </div>
            {isSelf && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditThread}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Thread
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDeleteThread} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Thread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Thread Content */}
          {editingThread ? (
            <div className="space-y-3 pt-2 border-t">
              <div>
                <label className="text-sm font-medium mb-1 block">Content</label>
                <KtdLexicalEditor
                  key={`edit_thread_${editorKey}`}
                  initialHTML={editContent}
                  onChangeHTML={(html) => setEditContent(html)}
                  className="w-full"
                  minHeight="200px"
                />
              </div>
              <div className="flex gap-2">
                <LoadingButton
                  size="sm"
                  onClick={handleEditThreadSubmit}
                  disabled={!editTitle.trim() || !editContent.trim()}
                >
                  Save Changes
                </LoadingButton>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingThread(false);
                    setEditTitle(thread.title);
                    setEditContent(thread.content);
                    setEditorKey((prev: number) => prev + 1);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="prose prose-sm max-w-none text-sm pt-2 border-t"
              dangerouslySetInnerHTML={{ __html: thread.content }}
            />
          )}

          {/* Reply Button */}
          {canPost && !editingThread && (
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (replyingTo) {
                    setReplyingTo(null);
                    setReplyContent("");
                  } else {
                    setReplyingTo({});
                  }
                  setEditorKey((prev: number) => prev + 1);
                }}
              >
                <Reply className="h-4 w-4 mr-2" />
                {replyingTo ? "Cancel" : "Reply"}
              </Button>
            </div>
          )}

          {/* Reply Composer */}
          {replyingTo && canPost && !editingThread && (
            <div className="pt-2 border-t space-y-2">
              <KtdLexicalEditor
                key={`reply_${editorKey}`}
                initialHTML=""
                onChangeHTML={(html) => setReplyContent(html)}
                className="w-full"
                minHeight="120px"
              />
              <div className="flex gap-2">
                <LoadingButton
                  size="sm"
                  onClick={() => handleAddReply(replyingTo.replyId)}
                  disabled={!replyContent.trim()}
                >
                  Post Reply
                </LoadingButton>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent("");
                    setEditorKey((prev: number) => prev + 1);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Replies ({replies.length})</h2>
          {replies.map((reply: any) => {
            const replyAuthorUid = auth.currentUser?.uid || (user as any)?.id;
            const isReplySelf = !!replyAuthorUid && reply.authorId === replyAuthorUid;
            const replyAuthorName = reply.authorName || "Unknown User";
            const replyAuthorAvatar = reply.authorAvatar || "";
            const isReplyingToReply = replyingTo && replyingTo.replyId === reply.id;

            return (
              <Card key={reply.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={replyAuthorAvatar} alt={replyAuthorName} />
                      <AvatarFallback>{replyAuthorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{replyAuthorName}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{formatRelativeTime(reply.createdAt)}</span>
                    {isReplySelf && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleEditReply(reply.id)}
                        >
                          Edit
                        </Button>
                        <span className="text-muted-foreground">•</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-destructive"
                          onClick={() => handleDeleteReply(reply.id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                  {editingReplyId === reply.id ? (
                    <div className="space-y-2 pt-2 border-t">
                      <KtdLexicalEditor
                        key={`edit_reply_${editorKey}`}
                        initialHTML={editReplyContent}
                        onChangeHTML={(html) => setEditReplyContent(html)}
                        className="w-full"
                        minHeight="120px"
                      />
                      <div className="flex gap-2">
                        <LoadingButton
                          size="sm"
                          onClick={() => handleEditReplySubmit(reply.id)}
                          disabled={!editReplyContent.trim()}
                        >
                          Save Changes
                        </LoadingButton>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReplyId(null);
                            setEditReplyContent("");
                            setEditorKey((prev: number) => prev + 1);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="prose prose-sm max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: reply.content }}
                    />
                  )}
                  {canPost && !isReplyingToReply && !editingReplyId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setReplyingTo({ replyId: reply.id });
                        setEditorKey((prev: number) => prev + 1);
                      }}
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                  {isReplyingToReply && (
                    <div className="pl-4 space-y-2 border-l-2">
                      <KtdLexicalEditor
                        key={`reply_to_reply_${editorKey}`}
                        initialHTML=""
                        onChangeHTML={(html) => setReplyContent(html)}
                        className="w-full"
                        minHeight="120px"
                      />
                      <div className="flex gap-2">
                        <LoadingButton
                          size="sm"
                          onClick={() => handleAddReply(reply.id)}
                          disabled={!replyContent.trim()}
                        >
                          Post Reply
                        </LoadingButton>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent("");
                            setEditorKey((prev: number) => prev + 1);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

