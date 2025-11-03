"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Plus, Reply, MoreVertical, Trash2, Pencil, Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { auth, db, storage } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where, serverTimestamp, increment } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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

type CommunityForumProps = {
  platformId: string;
  platformSlug: string;
  communityId: string;
  communityName: string;
};

export function CommunityForum({ platformId, platformSlug, communityId, communityName }: CommunityForumProps) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [allThreads, setAllThreads] = useState<any[]>([]);
  const [threadsWithReplies, setThreadsWithReplies] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [threadTitle, setThreadTitle] = useState("");
  const [threadContent, setThreadContent] = useState("");
  const [editorKey, setEditorKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Owner check
        try {
          const pSnap = await getDoc(doc(db, "platforms", platformId));
          const platformData = pSnap.data() as any;
          const ownerId = platformData?.ownerId;
          const uid = auth.currentUser?.uid;
          const altId = (user as any)?.id;
          setIsOwner(!!ownerId && ((!!uid && ownerId === uid) || (!!altId && ownerId === altId)));
        } catch {}

        // Membership check
        try {
          const uid = auth.currentUser?.uid;
          if (uid) {
            const m = await getDoc(doc(db, "platforms", platformId, "members", uid));
            setIsMember(m.exists());
          } else {
            setIsMember(false);
          }
        } catch {}

        // Load forum threads
        try {
          const snap = await getDocs(query(
            collection(db, "platforms", platformId, "forums"),
            where("communityId", "==", communityId),
            orderBy("createdAt", "desc"),
            limit(100)
          ) as any);
          const threadsList = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];
          setAllThreads(threadsList);
          setThreads(threadsList);

          // Load replies for all threads (for search functionality)
          const repliesMap: Record<string, any[]> = {};
          await Promise.all(threadsList.map(async (thread: any) => {
            try {
              const repliesSnap = await getDocs(query(
                collection(db, "platforms", platformId, "forums", thread.id, "replies"),
                orderBy("createdAt", "asc"),
                limit(100)
              ) as any);
              repliesMap[thread.id] = repliesSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
            } catch (e) {
              repliesMap[thread.id] = [];
            }
          }));
          setThreadsWithReplies(repliesMap);
        } catch (e: any) {
          // Fallback if composite index is missing
          const needsIndex = typeof e?.message === "string" && e.message.includes("The query requires an index");
          if (needsIndex) {
            try {
              const snap = await getDocs(query(
                collection(db, "platforms", platformId, "forums"),
                where("communityId", "==", communityId),
                limit(100)
              ) as any);
              const threadsList = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];
              threadsList.sort((a, b) => {
                const aMs = (a.createdAt && typeof a.createdAt.toMillis === "function") ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
                const bMs = (b.createdAt && typeof b.createdAt.toMillis === "function") ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
                return bMs - aMs;
              });
              setAllThreads(threadsList);
              setThreads(threadsList);

              // Load replies for all threads
              const repliesMap: Record<string, any[]> = {};
              await Promise.all(threadsList.map(async (thread: any) => {
                try {
                  const repliesSnap = await getDocs(query(
                    collection(db, "platforms", platformId, "forums", thread.id, "replies"),
                    orderBy("createdAt", "asc"),
                    limit(100)
                  ) as any);
                  repliesMap[thread.id] = repliesSnap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) }));
                } catch (e) {
                  repliesMap[thread.id] = [];
                }
              }));
              setThreadsWithReplies(repliesMap);
            } catch {}
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [platformId, communityId, user]);

  async function handleCreateThread() {
    if (!auth.currentUser) {
      toast.error("Please sign in to create a thread");
      return;
    }
    if (!isMember && !isOwner) {
      toast.error("You must be a member to create forum threads");
      return;
    }

    const plainText = threadContent.replace(/<[^>]*>/g, "").trim();
    if (!threadTitle.trim() || !plainText) {
      toast.error("Please provide both a title and content");
      return;
    }

    try {
      const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
      const authorUid = auth.currentUser.uid || (user as any)?.id || "anonymous";
      
      const newThread = {
        title: threadTitle.trim(),
        content: threadContent.trim(),
        createdAt: serverTimestamp(),
        replies: 0,
        views: 0,
        platformId,
        communityId,
        communityName,
        authorId: authorUid,
        authorName: displayName,
        authorAvatar: auth.currentUser?.photoURL || (user as any)?.photoURL || "",
      };

      const docRef = await addDoc(collection(db, "platforms", platformId, "forums"), newThread);
      
      // Optimistic update
      const newThreadData = { id: docRef.id, ...newThread, createdAt: new Date().toISOString() };
      setAllThreads(prev => [newThreadData, ...prev]);
      setThreads(prev => [newThreadData, ...prev]);
      setThreadsWithReplies(prev => ({ ...prev, [docRef.id]: [] }));
      
      setThreadTitle("");
      setThreadContent("");
      setShowComposer(false);
      setEditorKey(prev => prev + 1);
      toast.success("Thread created successfully!");
    } catch (e) {
      console.error("Failed to create thread", e);
      toast.error("Failed to create thread");
    }
  }

  async function handleDeleteThread(threadId: string) {
    try {
      await deleteDoc(doc(db, "platforms", platformId, "forums", threadId));
      setAllThreads(prev => prev.filter(t => t.id !== threadId));
      setThreads(prev => prev.filter(t => t.id !== threadId));
      const { [threadId]: _, ...rest } = threadsWithReplies;
      setThreadsWithReplies(rest);
      toast.success("Thread deleted");
    } catch (e) {
      toast.error("Failed to delete thread");
    }
  }

  // Helper function to strip HTML and search in text
  const stripHtml = (html: string): string => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Helper function to highlight matching text
  const highlightText = (text: string, query: string): string => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-900">$1</mark>');
  };

  // Helper function to get text snippet with context around match
  const getSnippet = (text: string, query: string, maxLength: number = 150): string => {
    if (!text || !query) return text.substring(0, maxLength);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  };

  // Helper function to find match location and get preview
  const getMatchInfo = (thread: any, query: string) => {
    const lowerQuery = query.toLowerCase().trim();
    const titleText = thread.title || "";
    const contentText = stripHtml(thread.content || "");
    const replies = threadsWithReplies[thread.id] || [];

    // Check title
    if (titleText.toLowerCase().includes(lowerQuery)) {
      return {
        type: "title",
        text: titleText,
        highlighted: highlightText(titleText, query)
      };
    }

    // Check content
    if (contentText.toLowerCase().includes(lowerQuery)) {
      const snippet = getSnippet(contentText, query);
      return {
        type: "content",
        text: snippet,
        highlighted: highlightText(snippet, query)
      };
    }

    // Check replies
    for (const reply of replies) {
      const replyText = stripHtml(reply.content || "");
      if (replyText.toLowerCase().includes(lowerQuery)) {
        const snippet = getSnippet(replyText, query);
        return {
          type: "reply",
          text: snippet,
          highlighted: highlightText(snippet, query),
          author: reply.authorName || "Unknown"
        };
      }
    }

    return null;
  };

  // Search function - filters threads based on title, content, or replies
  useEffect(() => {
    if (!searchQuery.trim()) {
      setThreads(allThreads);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allThreads.filter((thread: any) => {
      // Search in title
      const titleMatch = thread.title?.toLowerCase().includes(query);
      
      // Search in content
      const contentText = stripHtml(thread.content || "");
      const contentMatch = contentText.toLowerCase().includes(query);
      
      // Search in replies
      const replies = threadsWithReplies[thread.id] || [];
      const replyMatch = replies.some((reply: any) => {
        const replyText = stripHtml(reply.content || "");
        return replyText.toLowerCase().includes(query);
      });

      return titleMatch || contentMatch || replyMatch;
    });

    setThreads(filtered);
  }, [searchQuery, allThreads, threadsWithReplies]);

  const canPost = (isMember || isOwner) && user;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_: any, i: number) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search threads by title, content, or replies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {canPost && (
        <>
          {!showComposer ? (
            <Button onClick={() => setShowComposer(true)} size="sm" className="w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create New Thread
            </Button>
          ) : (
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Create New Thread</h3>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setShowComposer(false);
                    setThreadTitle("");
                    setThreadContent("");
                    setEditorKey(prev => prev + 1);
                  }}>
                    Cancel
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Title</label>
                  <input
                    type="text"
                    value={threadTitle}
                    onChange={(e) => setThreadTitle(e.target.value)}
                    placeholder="Thread title..."
                    className="w-full px-3 py-2 border rounded-md"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Content</label>
                  <KtdLexicalEditor
                    key={editorKey}
                    initialHTML=""
                    onChangeHTML={(html) => setThreadContent(html)}
                    className="w-full"
                    minHeight="120px"
                  />
                </div>
                <LoadingButton
                  onClick={handleCreateThread}
                  disabled={!threadTitle.trim() || !threadContent.trim()}
                >
                  Create Thread
                </LoadingButton>
              </div>
            </Card>
          )}
        </>
      )}

      {threads.length === 0 ? (
        <EmptyState
          title={searchQuery.trim() ? "No threads found" : "No forum threads yet"}
          description={searchQuery.trim() 
            ? `No threads match "${searchQuery}". Try a different search term.` 
            : (canPost ? "Start the conversation with the first thread!" : "Be the first to create a thread!")
          }
          icon={<Users className="h-12 w-12 text-muted-foreground" />}
        />
      ) : (
        threads.map((thread: any) => {
          const currentUid = auth.currentUser?.uid || (user as any)?.id;
          const isSelf = !!currentUid && thread.authorId === currentUid;
          const authorName = thread.authorName || (isSelf ? ((user as any)?.displayName || (user as any)?.name || (user as any)?.email || "You") : "Unknown User");
          const authorAvatar = thread.authorAvatar || ((isSelf ? ((user as any)?.photoURL || "") : ""));
          const matchInfo = searchQuery.trim() ? getMatchInfo(thread, searchQuery) : null;

          return (
            <Card key={thread.id} className="p-4">
              <div className="space-y-3">
                {/* Thread Header - Always visible */}
                <div className="flex items-start justify-between gap-4">
                  <Link 
                    href={`/platforms/${platformSlug}/communities/${communityId}/forum/${thread.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 
                        className="text-lg font-semibold hover:text-primary transition-colors"
                        dangerouslySetInnerHTML={{ 
                          __html: searchQuery.trim() && matchInfo && matchInfo.type === "title" 
                            ? matchInfo.highlighted 
                            : (searchQuery.trim() ? highlightText(thread.title, searchQuery) : thread.title)
                        }}
                      />
                      {searchQuery.trim() && matchInfo && (
                        <Badge variant="outline" className="text-xs">
                          {matchInfo.type === "title" && "Title"}
                          {matchInfo.type === "content" && "Content"}
                          {matchInfo.type === "reply" && "Reply"}
                        </Badge>
                      )}
                    </div>
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
                  </Link>
                  {isSelf && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteThread(thread.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Thread
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {/* Search Match Preview */}
                {searchQuery.trim() && matchInfo && matchInfo.type !== "title" && (
                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground mb-1">
                      {matchInfo.type === "reply" && (
                        <span className="font-medium">Reply by {matchInfo.author}: </span>
                      )}
                      {matchInfo.type === "content" && (
                        <span className="font-medium">Content: </span>
                      )}
                    </div>
                    <div 
                      className="prose prose-sm max-w-none text-sm line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: matchInfo.highlighted }}
                    />
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

