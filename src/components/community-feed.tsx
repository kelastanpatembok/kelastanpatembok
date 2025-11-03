"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedComposer } from "@/components/feed-composer";
import { EnhancedPostCard } from "@/components/enhanced-post-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { auth, db, storage } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where, serverTimestamp, setDoc, increment } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { toast } from "sonner";

type CommunityFeedProps = {
  platformId: string;
  platformSlug: string;
  communityId: string;
  communityName: string;
  onlyPinned?: boolean;
};

export function CommunityFeed({ platformId, platformSlug, communityId, communityName, onlyPinned = false }: CommunityFeedProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [commentsPreviewByPost, setCommentsPreviewByPost] = useState<Record<string, any[]>>({});
  const [platformName, setPlatformName] = useState<string>("");
  const [platformPrimaryColor, setPlatformPrimaryColor] = useState<string>("#66b132");

  useEffect(() => {
    (async () => {
      try {
        // Owner check for gating composer and avoiding denied writes
        try {
          const pSnap = await getDoc(doc(db, "platforms", platformId));
          const platformData = pSnap.data() as any;
          const ownerId = platformData?.ownerId;
          const uid = auth.currentUser?.uid;
          const altId = (user as any)?.id;
          setIsOwner(!!ownerId && ((!!uid && ownerId === uid) || (!!altId && ownerId === altId)));
          // Set platform name and primary color
          if (platformData?.name) {
            setPlatformName(platformData.name);
          }
          if (platformData?.branding?.primaryColor) {
            setPlatformPrimaryColor(platformData.branding.primaryColor);
          }
        } catch {}

        // membership check
        try {
          const uid = auth.currentUser?.uid;
          if (uid) {
            const m = await getDoc(doc(db, "platforms", platformId, "members", uid));
            setIsMember(m.exists());
          } else {
            setIsMember(false);
          }
        } catch {}

        const snap = await getDocs(query(
          collection(db, "platforms", platformId, "posts"),
          where("communityId", "==", communityId),
          orderBy("createdAt", "desc"),
          limit(50)
        ) as any);
        const list = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];
        setPosts(list);
        // load current user's like state
        try {
          const uid = auth.currentUser?.uid;
          if (uid) {
            const liked = new Set<string>();
            await Promise.all(list.map(async (p:any) => {
              const r = await getDoc(doc(db, "platforms", platformId, "posts", p.id, "reactions", uid));
              if (r.exists()) liked.add(p.id);
            }));
            setLikedPosts(liked);
          }
        } catch {}
        // preview comments
        try {
          const preview: Record<string, any[]> = {};
          await Promise.all(list.map(async (post:any) => {
            const cs = await getDocs(query(collection(db, "platforms", platformId, "posts", post.id, "comments"), orderBy("createdAt", "asc"), limit(3)) as any);
            preview[post.id] = cs.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          }));
          setCommentsPreviewByPost(preview);
        } catch {}
      } catch (e: any) {
        // Fallback if composite index is missing: fetch without orderBy and sort client-side
        const needsIndex = typeof e?.message === "string" && e.message.includes("The query requires an index");
        if (needsIndex) {
          try {
            const snap = await getDocs(query(
              collection(db, "platforms", platformId, "posts"),
              where("communityId", "==", communityId),
              limit(50)
            ) as any);
            const rows = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as Record<string, any>) })) as any[];
            rows.sort((a, b) => {
              const aMs = (a.createdAt && typeof a.createdAt.toMillis === "function") ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
              const bMs = (b.createdAt && typeof b.createdAt.toMillis === "function") ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
              return bMs - aMs;
            });
            setPosts(rows);
          } catch {}
        }
        // Load bookmarks for current user from Firestore
        try {
          const uid = auth.currentUser?.uid;
          const altId = (user as any)?.id;
          const currentUid = uid || altId;
          if (currentUid && posts.length > 0) {
            const bookmarked = new Set<string>();
            await Promise.all(posts.map(async (post: any) => {
              const bookmarkId = `${platformId}_${post.id}`;
              const bm = await getDoc(doc(db, "users", currentUid, "bookmarks", bookmarkId));
              if (bm.exists()) bookmarked.add(post.id);
            }));
            setBookmarkedPosts(bookmarked);
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [platformId, communityId, user]);

  async function handleAddPost(content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) {
    if (!auth.currentUser) {
      toast.error("Please sign in to post");
      return;
    }
    try { await auth.currentUser.getIdToken(true); } catch {}
    if (!isOwner) {
      toast.error("Only the platform owner can post here.");
      return;
    }
    const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
    const authorUid = (auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id || "anonymous";
    const newPost = {
      content,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0,
      shares: 0,
      platformId,
      communityId,
      communityName,
      authorId: authorUid,
      authorName: displayName,
      authorAvatar: auth.currentUser?.photoURL || (user as any)?.photoURL || "",
      createdBy: authorUid,
      ...(eventDate && { eventDate, isEvent: true }),
      ...(polls && { polls: polls.map(p => ({ ...p, votes: p.options.map(() => 0), voters: [] })), isPoll: true }),
    } as any;
    let docRef;
    try {
      docRef = await addDoc(collection(db, "platforms", platformId, "posts"), newPost);
    } catch (e: any) {
      // Helpful diagnostics when rules fail
      try {
        const pSnap = await getDoc(doc(db, "platforms", platformId));
        const ownerId = (pSnap.data() as any)?.ownerId;
        const uid = auth.currentUser?.uid;
        toast.error(`Post denied by rules. ownerId=${ownerId || ""} uid=${uid || ""}`);
      } catch {}
      throw e;
    }
    // optimistic local createdAt using Date for UX
    setPosts(prev => [{ id: docRef.id, ...newPost, createdAt: new Date().toISOString() }, ...prev]);

    if (imageFile) {
      try {
        if (!auth.currentUser) {
          toast.error("Please sign in to upload images");
          throw new Error("No auth user for storage upload");
        }
        await auth.currentUser.getIdToken(true);
        const ext = (imageFile.name.split('.').pop() || 'png').toLowerCase();
        const path = `platforms/${platformSlug}/posts/${docRef.id}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || `image/${ext}` });
        const imageUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "platforms", platformId, "posts", docRef.id), { imageUrl });
        setPosts(prev => prev.map(p => p.id === docRef.id ? { ...p, imageUrl } : p));
      } catch (e) {
        console.error("Image upload/update failed", e);
        toast.error("Image upload failed. Post saved without image.");
      }
    }
    toast.success("Post created successfully!");
  }

  async function handleLike(postId: string) {
    if (!auth.currentUser) { toast.error("Sign in to like"); return; }
    if (!isMember) { toast.error("Join this platform to react"); return; }
    const uid = auth.currentUser.uid;
    const likeRef = doc(db, "platforms", platformId, "posts", postId, "reactions", uid);
    const hadLike = likedPosts.has(postId);
    try {
      if (hadLike) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, "platforms", platformId, "posts", postId), { likes: increment(-1) });
        setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes||0) - 1) } : p));
      } else {
        await setDoc(likeRef, { type: "like", createdAt: serverTimestamp() });
        await updateDoc(doc(db, "platforms", platformId, "posts", postId), { likes: increment(1) });
        setLikedPosts(prev => { const n = new Set(prev); n.add(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes||0) + 1 } : p));
      }
    } catch {
      toast.error("Failed to update like");
    }
  }

  async function handleBookmark(postId: string) {
    if (!auth.currentUser) { toast.error("Sign in to bookmark"); return; }
    const uid = auth.currentUser.uid;
    const bookmarkId = `${platformId}_${postId}`;
    try {
      const { setDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
      const isBookmarked = bookmarkedPosts.has(postId);
      if (isBookmarked) {
        await deleteDoc(doc(db, "users", uid, "bookmarks", bookmarkId));
        setBookmarkedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
        toast.success("Bookmark removed");
      } else {
        await setDoc(doc(db, "users", uid, "bookmarks", bookmarkId), {
          platformId,
          postId,
          createdAt: serverTimestamp(),
        });
        setBookmarkedPosts(prev => new Set([...prev, postId]));
        toast.success("Bookmarked");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  }

  async function handleDelete(postId: string) {
    try {
      await deleteDoc(doc(db, "platforms", platformId, "posts", postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (e) {
      toast.error("Failed to delete post");
    }
  }

  async function handleEditSubmit(postId: string, content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) {
    try {
      const updateData: any = { content };
      if (eventDate) {
        updateData.eventDate = eventDate;
        updateData.isEvent = true;
      } else {
        updateData.eventDate = null;
        updateData.isEvent = false;
      }
      if (polls) {
        updateData.polls = polls.map(p => ({ ...p, votes: p.options.map(() => 0), voters: [] }));
        updateData.isPoll = true;
        // Clear old poll data
        updateData.pollOptions = null;
        updateData.pollVotes = null;
        updateData.pollVoters = null;
      } else {
        updateData.polls = null;
        updateData.isPoll = false;
        updateData.pollOptions = null;
        updateData.pollVotes = null;
        updateData.pollVoters = null;
      }
      await updateDoc(doc(db, "platforms", platformId, "posts", postId), updateData);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updateData } : p));
      if (imageFile) {
        try {
          await auth.currentUser?.getIdToken(true);
          const ext = (imageFile.name.split('.').pop() || 'png').toLowerCase();
          const path = `platforms/${platformSlug}/posts/${postId}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || `image/${ext}` });
          const imageUrl = await getDownloadURL(storageRef);
          await updateDoc(doc(db, "platforms", platformId, "posts", postId), { imageUrl });
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, imageUrl } : p));
        } catch (e) {
          console.error(e);
          toast.error("Image update failed; text saved.");
        }
      }
      toast.success("Post updated");
    } catch {
      toast.error("Failed to update post");
    }
  }

  async function handleAddComment(postId: string, content: string) {
    if (!auth.currentUser) { toast.error("Sign in to comment"); return; }
    if (!isMember) { toast.error("Join this platform to comment"); return; }
    try {
      const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
      const authorUid = auth.currentUser.uid;
      const newComment = {
        content,
        createdAt: serverTimestamp(),
        authorId: authorUid,
        authorName: displayName,
        communityId,
      } as any;
      await addDoc(collection(db, "platforms", platformId, "posts", postId, "comments"), newComment);
      await updateDoc(doc(db, "platforms", platformId, "posts", postId), { comments: increment(1) });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: (p.comments||0) + 1 } : p));
      // Optimistically update preview
      setCommentsPreviewByPost(prev => {
        const copy = { ...prev } as any;
        const list = (copy[postId] ? [...copy[postId]] : []) as any[];
        list.push({ id: `temp_${Date.now()}`, content, authorName: displayName, createdAt: new Date().toISOString() });
        list.sort((a:any,b:any)=>{
          const am = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const bm = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return am - bm;
        });
        copy[postId] = list.slice(-3);
        return copy;
      });
      toast.success("Comment added");
    } catch {
      toast.error("Failed to comment");
    }
  }

  async function handleVotePoll(postId: string, pollIndex: number, optionIndex: number) {
    if (!auth.currentUser) { toast.error("Sign in to vote"); return; }
    if (!isMember) { toast.error("Join this platform to vote"); return; }
    const uid = auth.currentUser.uid;
    const post = posts.find(p => p.id === postId);
    if (!post || !post.polls || !post.polls[pollIndex]) return;
    
    const poll = post.polls[pollIndex];
    
    try {
      const newPolls = [...post.polls];
      const newVotes = [...(poll.votes || [])];
      
      // Handle different voting logic based on poll type
      if (poll.type === "multiple") {
        // Multiple choice: toggle vote on/off
        const existingVoteIndex = poll.voters?.findIndex((v: any) => v.userId === uid && v.optionIndex === optionIndex);
        
        if (existingVoteIndex !== undefined && existingVoteIndex >= 0) {
          // Remove vote
          newVotes[optionIndex] = Math.max(0, newVotes[optionIndex] - 1);
          const newVoters = poll.voters?.filter((_: any, i: number) => i !== existingVoteIndex) || [];
          newPolls[pollIndex] = {
            ...poll,
            votes: newVotes,
            voters: newVoters
          };
          toast.success("Vote removed");
        } else {
          // Add vote
          newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
          const newVoters = [...(poll.voters || []), { optionIndex, userId: uid }];
          newPolls[pollIndex] = {
            ...poll,
            votes: newVotes,
            voters: newVoters
          };
          toast.success("Vote added");
        }
      } else {
        // Single choice: allow toggling vote on/off
        const existingVoteIndex = poll.voters?.findIndex((v: any) => typeof v === 'object' && v.userId === uid && v.optionIndex === optionIndex);
        
        if (existingVoteIndex !== undefined && existingVoteIndex >= 0) {
          // Remove vote
          newVotes[optionIndex] = Math.max(0, newVotes[optionIndex] - 1);
          const newVoters = poll.voters?.filter((_: any, i: number) => i !== existingVoteIndex) || [];
          newPolls[pollIndex] = {
            ...poll,
            votes: newVotes,
            voters: newVoters
          };
          toast.success("Vote removed");
        } else {
          // Check if user voted on a different option
          const otherVoteIndex = poll.voters?.findIndex((v: any) => typeof v === 'object' && v.userId === uid);
          if (otherVoteIndex !== undefined && otherVoteIndex >= 0) {
            // Remove old vote first
            const oldVote = poll.voters![otherVoteIndex];
            if (typeof oldVote === 'object' && typeof oldVote.optionIndex === 'number') {
              newVotes[oldVote.optionIndex] = Math.max(0, newVotes[oldVote.optionIndex] - 1);
            }
            const withoutOldVote = poll.voters?.filter((_: any, i: number) => i !== otherVoteIndex) || [];
            // Add new vote
            newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
            const newVoters = [...withoutOldVote, { optionIndex, userId: uid }];
            newPolls[pollIndex] = {
              ...poll,
              votes: newVotes,
              voters: newVoters
            };
            toast.success("Vote changed");
          } else {
            // Add new vote
            newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
            const newVoters = [...(poll.voters || []), { optionIndex, userId: uid }];
            newPolls[pollIndex] = {
              ...poll,
              votes: newVotes,
              voters: newVoters
            };
            toast.success("Vote recorded");
          }
        }
      }
      
      await updateDoc(doc(db, "platforms", platformId, "posts", postId), {
        polls: newPolls
      });
      
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, polls: newPolls } 
          : p
      ));
    } catch {
      toast.error("Failed to vote");
    }
  }

  // Filter and sort posts - must be before conditional return to maintain hook order
  const sortedPosts = useMemo(() => {
    // Filter posts based on onlyPinned prop
    const filteredPosts = onlyPinned 
      ? posts.filter((p: any) => p.pinned === true)
      : posts;
    
    // Sort: pinned first, then by date
    return [...filteredPosts].sort((a: any, b: any) => {
      const aPinned = a.pinned === true ? 1 : 0;
      const bPinned = b.pinned === true ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      const aTime = (a.createdAt && typeof a.createdAt.toMillis === "function") ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const bTime = (b.createdAt && typeof b.createdAt.toMillis === "function") ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }, [posts, onlyPinned]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_: any, i: number) => (
          <div key={i} className="rounded-md border p-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full mt-3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {user && isOwner && (
        <FeedComposer onAddPost={handleAddPost} />
      )}

      {sortedPosts.length === 0 ? (
        <EmptyState
          title={onlyPinned ? "No pinned posts in this community" : "No posts in this community yet"}
          description={onlyPinned ? "Subscribe to see all posts" : "Start the conversation with the first post!"}
          icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
        />
      ) : (
        sortedPosts.map((post: any) => {
          const currentUid = (auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id;
          const isSelf = !!currentUid && (post as any).authorId === currentUid;
          const authorName = (post as any).authorName || (isSelf ? ((user as any).displayName || (user as any).name || (user as any).email || "You") : "Unknown User");
          const authorAvatar = (post as any).authorAvatar || ((isSelf ? ((user as any).photoURL || "") : ""));
          return (
            <EnhancedPostCard
              key={post.id}
              post={{
                ...post,
                authorName,
                authorAvatar,
                communityName,
                platformName,
                platformSlug,
                platformPrimaryColor,
                isLiked: likedPosts.has(post.id),
                isBookmarked: bookmarkedPosts.has(post.id),
              }}
              canDelete={isSelf}
              canEdit={isSelf}
              canComment={isMember}
              canReact={isMember}
              canPin={isOwner}
              autoOpenComment={isMember && ((commentsPreviewByPost[post.id]?.length || 0) > 0)}
              onDelete={handleDelete}
              onEditSubmit={handleEditSubmit}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onShare={() => toast.success("Post shared!")}
              onReport={() => {}}
              onAddComment={handleAddComment}
              onVotePoll={handleVotePoll}
              onTogglePin={async (postId, next) => {
                try {
                  await updateDoc(doc(db, "platforms", platformId, "posts", postId), { pinned: next });
                  setPosts(prev => prev.map(p => p.id === postId ? { ...p, pinned: next } : p));
                  toast.success(next ? "Pinned to top" : "Unpinned");
                } catch { toast.error("Failed to update pin"); }
              }}
              canDisableComments={isSelf}
              onToggleComments={async (postId, nextDisabled) => {
                try {
                  await updateDoc(doc(db, "platforms", platformId, "posts", postId), { commentsDisabled: nextDisabled });
                  setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsDisabled: nextDisabled } : p));
                  toast.success(nextDisabled ? "Comments disabled" : "Comments enabled");
                } catch { toast.error("Failed to update comments setting"); }
              }}
              commentsPreview={commentsPreviewByPost[post.id]}
              onLoadMoreComments={async (_postId, nextCount) => {
                try {
                  const cs = await getDocs(query(collection(db, "platforms", platformId, "posts", _postId, "comments"), orderBy("createdAt", "asc"), limit(nextCount)) as any);
                  setCommentsPreviewByPost(prev => ({ ...prev, [_postId]: cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) }));
                } catch {}
              }}
              currentUserId={(auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id}
              onEditComment={async (_postId, _commentId, content) => {
                try {
                  await updateDoc(doc(db, "platforms", platformId, "posts", _postId, "comments", _commentId), { content });
                  setCommentsPreviewByPost(prev => {
                    const copy = { ...prev } as any;
                    copy[_postId] = (copy[_postId] || []).map((c:any) => c.id === _commentId ? { ...c, content } : c);
                    return copy;
                  });
                  toast.success("Comment updated");
                } catch { toast.error("Failed to update comment"); }
              }}
              onDeleteComment={async (_postId, _commentId) => {
                try {
                  await deleteDoc(doc(db, "platforms", platformId, "posts", _postId, "comments", _commentId));
                  await updateDoc(doc(db, "platforms", platformId, "posts", _postId), { comments: increment(-1) });
                  setPosts(prev => prev.map(p => p.id === _postId ? { ...p, comments: Math.max(0, (p.comments||0) - 1) } : p));
                  setCommentsPreviewByPost(prev => {
                    const copy = { ...prev } as any;
                    copy[_postId] = (copy[_postId] || []).filter((c:any) => c.id !== _commentId);
                    return copy;
                  });
                  toast.success("Comment deleted");
                } catch { toast.error("Failed to delete comment"); }
              }}
            />
          );
        })
      )}
    </div>
  );
}


