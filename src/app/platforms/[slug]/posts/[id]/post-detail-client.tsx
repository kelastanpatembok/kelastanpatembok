"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, orderBy, limit, setDoc, serverTimestamp } from "firebase/firestore";
import { EnhancedPostCard } from "@/components/enhanced-post-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import Link from "next/link";

export function PostDetailClient({ 
  platform, 
  post: initialPost, 
  slug, 
  id,
  error
}: { 
  platform: any;
  post: any;
  slug: string;
  id: string;
  error?: "not-found" | "access-denied" | "error";
}) {
  const router = useRouter();
  const { user, loginWithGoogle } = useAuth();
  
  const [post, setPost] = useState<any>(initialPost);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [commentsPreviewByPost, setCommentsPreviewByPost] = useState<Record<string, any[]>>({});
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!platform) return;
    
    // Check access first
    if (error === "access-denied" || !post) {
      const u: any = user;
      const pid = platform?.ownerId;
      const isPublic = platform.public === true;
      const isOwnerCheck = !!(u && pid && (pid === u.uid || pid === u.id));
      
      // Check membership
      (async () => {
        let isMemberCheck = false;
        try {
          const uid = auth.currentUser?.uid || (u?.uid);
          if (uid) {
            const m = await getDoc(doc(db, "platforms", platform.id, "members", uid));
            isMemberCheck = m.exists();
          }
        } catch {}
        
        const hasAccessCheck = isPublic || isOwnerCheck || isMemberCheck;
        setHasAccess(hasAccessCheck);
        setIsOwner(isOwnerCheck);
        setIsMember(isMemberCheck);
      })();
      return;
    }
    
    // Normal flow - user has access
    const u: any = user;
    const pid = platform?.ownerId;
    setIsOwner(!!(u && pid && (pid === u.uid || pid === u.id)));
    
    // Member check
    (async () => {
      try {
        const uid = auth.currentUser?.uid || (u?.uid);
        if (uid) {
          const m = await getDoc(doc(db, "platforms", platform.id, "members", uid));
          setIsMember(m.exists());
        } else {
          setIsMember(false);
        }
      } catch {}
      
      // Load comments
      try {
        const cs = await getDocs(query(collection(db, "platforms", platform.id, "posts", id, "comments"), orderBy("createdAt", "asc"), limit(3)) as any);
        setCommentsPreviewByPost({ [id]: cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) });
      } catch {}
      
      // Load like state
      try {
        const uid = auth.currentUser?.uid || (u?.uid);
        if (uid) {
          const r = await getDoc(doc(db, "platforms", platform.id, "posts", id, "reactions", uid));
          if (r.exists()) setLikedPosts(new Set([id]));
        }
      } catch {}
      
      // Load bookmarks from Firestore
      try {
        const uid = auth.currentUser?.uid || (u?.uid);
        if (uid) {
          const bookmarkId = `${platform.id}_${id}`;
          const bm = await getDoc(doc(db, "users", uid, "bookmarks", bookmarkId));
          if (bm.exists()) {
            setBookmarkedPosts(new Set([id]));
          }
        }
      } catch {}
    })();
  }, [platform?.id, id, user, error, post]);

  const handleLike = async () => {
    if (!auth.currentUser) { toast.error("Sign in to like"); return; }
    if (!isMember) { toast.error("Join this platform to like"); return; }
    if (!platform?.id) return;
    const uid = auth.currentUser.uid;
    try {
      const { setDoc, deleteDoc, updateDoc, increment } = await import("firebase/firestore");
      const isLiked = likedPosts.has(id);
      if (isLiked) {
        await deleteDoc(doc(db, "platforms", platform.id, "posts", id, "reactions", uid));
        setLikedPosts(new Set());
        setPost((prev: any) => ({ ...prev, likes: Math.max(0, (prev?.likes || 0) - 1) }));
        toast.success("Unliked");
      } else {
        await setDoc(doc(db, "platforms", platform.id, "posts", id, "reactions", uid), { likedAt: new Date() });
        setLikedPosts(new Set([id]));
        await updateDoc(doc(db, "platforms", platform.id, "posts", id), { likes: increment(1) });
        setPost((prev: any) => ({ ...prev, likes: (prev?.likes || 0) + 1 }));
        toast.success("Liked");
      }
    } catch { toast.error("Failed to like"); }
  };

  const handleBookmark = async () => {
    if (!auth.currentUser) { toast.error("Sign in to bookmark"); return; }
    if (!platform?.id) return;
    const uid = auth.currentUser.uid;
    const bookmarkId = `${platform.id}_${id}`;
    try {
      const { setDoc, deleteDoc, serverTimestamp } = await import("firebase/firestore");
      const isBookmarked = bookmarkedPosts.has(id);
      if (isBookmarked) {
        await deleteDoc(doc(db, "users", uid, "bookmarks", bookmarkId));
        setBookmarkedPosts(new Set());
        toast.success("Bookmark removed");
      } else {
        await setDoc(doc(db, "users", uid, "bookmarks", bookmarkId), {
          platformId: platform.id,
          postId: id,
          createdAt: serverTimestamp(),
        });
        setBookmarkedPosts(new Set([id]));
        toast.success("Bookmarked");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  };

  const handleAddComment = async (content: string) => {
    if (!auth.currentUser) { toast.error("Sign in to comment"); return; }
    if (!isMember) { toast.error("Join this platform to comment"); return; }
    if (!platform?.id) return;
    const uid = auth.currentUser.uid;
    try {
      const { addDoc, updateDoc, increment, serverTimestamp, collection } = await import("firebase/firestore");
      const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
      await addDoc(collection(db, "platforms", platform.id, "posts", id, "comments"), {
        content,
        createdAt: serverTimestamp(),
        authorId: uid,
        authorName: displayName,
        authorAvatar: auth.currentUser.photoURL || ""
      });
      await updateDoc(doc(db, "platforms", platform.id, "posts", id), { comments: increment(1) });
      setPost((prev: any) => ({ ...prev, comments: (prev?.comments || 0) + 1 }));
      toast.success("Comment added");
      
      const { getDocs, query, orderBy, limit } = await import("firebase/firestore");
      const cs = await getDocs(query(collection(db, "platforms", platform.id, "posts", id, "comments"), orderBy("createdAt", "asc"), limit(3)) as any);
      setCommentsPreviewByPost({ [id]: cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) });
    } catch { toast.error("Failed to add comment"); }
  };

  const handleDelete = async () => {
    if (!auth.currentUser) return;
    if (!platform?.id) return;
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "platforms", platform.id, "posts", id));
      toast.success("Post deleted");
      router.push(`/platforms/${slug}`);
    } catch { toast.error("Failed to delete post"); }
  };

  const handleEditSubmit = async (postId: string, content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) => {
    if (!platform?.id || postId !== id) return;
    try {
      const { uploadBytes, getDownloadURL, ref: storageRef } = await import("firebase/storage");
      const { updateDoc } = await import("firebase/firestore");
      const { storage } = await import("@/lib/firebase");
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
      await updateDoc(doc(db, "platforms", platform.id, "posts", id), updateData);
      setPost((prev: any) => ({ ...prev, ...updateData }));
      if (imageFile) {
        try {
          await auth.currentUser?.getIdToken(true);
          const ext = (imageFile.name.split('.').pop() || 'png').toLowerCase();
          const path = `platforms/${slug}/posts/${id}.${ext}`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, imageFile, { contentType: imageFile.type || `image/${ext}` });
          const imageUrl = await getDownloadURL(fileRef);
          await updateDoc(doc(db, "platforms", platform.id, "posts", id), { imageUrl });
          setPost((prev: any) => ({ ...prev, imageUrl }));
        } catch (e) {
          console.error(e);
          toast.error("Image update failed; text saved.");
        }
      }
      toast.success("Post updated");
    } catch {
      toast.error("Failed to update post");
    }
  };

  const handleVotePoll = async (postId: string, pollIndex: number, optionIndex: number) => {
    if (!auth.currentUser) { toast.error("Sign in to vote"); return; }
    if (!isMember) { toast.error("Join this platform to vote"); return; }
    if (!platform?.id) return;
    const uid = auth.currentUser.uid;
    if (!post || !post.polls || !post.polls[pollIndex]) return;
    
    const poll = post.polls[pollIndex];
    
    try {
      const { updateDoc } = await import("firebase/firestore");
      const newPolls = [...post.polls];
      const newVotes = [...(poll.votes || [])];
      
      if (poll.type === "multiple") {
        const existingVoteIndex = poll.voters?.findIndex((v: any) => v.userId === uid && v.optionIndex === optionIndex);
        
        if (existingVoteIndex !== undefined && existingVoteIndex >= 0) {
          newVotes[optionIndex] = Math.max(0, newVotes[optionIndex] - 1);
          const newVoters = poll.voters?.filter((_: any, i: number) => i !== existingVoteIndex) || [];
          newPolls[pollIndex] = {
            ...poll,
            votes: newVotes,
            voters: newVoters
          };
          toast.success("Vote removed");
        } else {
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
        const existingVoteIndex = poll.voters?.findIndex((v: any) => typeof v === 'object' && v.userId === uid && v.optionIndex === optionIndex);
        
        if (existingVoteIndex !== undefined && existingVoteIndex >= 0) {
          newVotes[optionIndex] = Math.max(0, newVotes[optionIndex] - 1);
          const newVoters = poll.voters?.filter((_: any, i: number) => i !== existingVoteIndex) || [];
          newPolls[pollIndex] = {
            ...poll,
            votes: newVotes,
            voters: newVoters
          };
          toast.success("Vote removed");
        } else {
          const otherVoteIndex = poll.voters?.findIndex((v: any) => typeof v === 'object' && v.userId === uid);
          if (otherVoteIndex !== undefined && otherVoteIndex >= 0) {
            const oldVote = poll.voters![otherVoteIndex];
            if (typeof oldVote === 'object' && typeof oldVote.optionIndex === 'number') {
              newVotes[oldVote.optionIndex] = Math.max(0, newVotes[oldVote.optionIndex] - 1);
            }
            const withoutOldVote = poll.voters?.filter((_: any, i: number) => i !== otherVoteIndex) || [];
            newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
            const newVoters = [...withoutOldVote, { optionIndex, userId: uid }];
            newPolls[pollIndex] = {
              ...poll,
              votes: newVotes,
              voters: newVoters
            };
            toast.success("Vote changed");
          } else {
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
      
      await updateDoc(doc(db, "platforms", platform.id, "posts", id), {
        polls: newPolls
      });
      
      setPost({ ...post, polls: newPolls });
    } catch {
      toast.error("Failed to vote");
    }
  };

  // Show error/access denied UI
  if (error || !post) {
    if (error === "not-found") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-3xl font-bold">Post Not Found</h1>
            <p className="text-muted-foreground">The post you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href={`/platforms/${slug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to platform
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    // Access denied or error - show access denied UI
    if (platform && (error === "access-denied" || !hasAccess)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
          <div className="w-full max-w-2xl space-y-8">
            {/* Platform Header */}
            <div className="text-center space-y-4">
              {platform.branding?.logoUrl && (
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden border-2" style={{ borderColor: platform.branding?.primaryColor || undefined }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={platform.branding.logoUrl} alt="logo" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
              <h1 className="text-4xl font-bold tracking-tight" style={{ color: platform.branding?.primaryColor }}>
                {platform.name || "Platform"}
              </h1>
              {platform.tagline && (
                <p className="text-lg text-muted-foreground font-medium">{platform.tagline}</p>
              )}
            </div>

            {/* Description Card */}
            {platform.description && (
              <div className="rounded-lg border bg-card p-6">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {platform.description}
                </p>
              </div>
            )}

            {/* Access Message */}
            <div className="rounded-lg border border-dashed bg-muted/50 p-6 text-center space-y-4">
              <p className="text-muted-foreground">
                This platform is private. Join to access this post and all platform content.
              </p>
              
              {!user ? (
                <div className="space-y-3 pt-2">
                  <Button
                    size="lg"
                    onClick={async () => {
                      setJoining(true);
                      try {
                        const result = await loginWithGoogle();
                        if (result.ok) {
                          // Wait a bit for auth state to update
                          setTimeout(async () => {
                            try {
                              const uid = auth.currentUser?.uid;
                              if (uid && platform) {
                                // Create membership
                                await setDoc(doc(db, "platforms", platform.id as string, "members", uid), {
                                  role: "member",
                                  joinedAt: serverTimestamp(),
                                  lastUpdated: serverTimestamp(),
                                });
                                toast.success("Successfully joined platform!");
                                // Refresh page to show content
                                window.location.reload();
                              }
                            } catch (error: any) {
                              console.error("Error joining platform:", error);
                              toast.error("Failed to join platform: " + (error?.message || "Unknown error"));
                              setJoining(false);
                            }
                          }, 1000);
                        } else {
                          setJoining(false);
                        }
                      } catch (error: any) {
                        console.error("Error signing in:", error);
                        toast.error("Failed to sign in: " + (error?.message || "Unknown error"));
                        setJoining(false);
                      }
                    }}
                    disabled={joining}
                    className="gap-2 px-6"
                  >
                    {joining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
                          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20c11.046 0 20-8.954 20-20 0-1.341-.138-2.651-.389-3.917z"/>
                          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.817C14.655 16.108 18.961 14 24 14c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.64 6.053 29.082 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.145 35.091 26.691 36 24 36c-5.202 0-9.62-3.317-11.281-7.946l-6.513 5.02C9.521 39.556 16.227 44 24 44z"/>
                          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.79 2.233-2.231 4.166-4.095 5.565.001-.001 6.191 5.238 6.191 5.238C39.244 35.659 44 30 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                        </svg>
                        Continue with Google
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={async () => {
                    if (!user || !platform) return;
                    setJoining(true);
                    try {
                      const uid = auth.currentUser?.uid || (user as any)?.uid || (user as any)?.id;
                      if (!uid) {
                        toast.error("Please sign in to join");
                        setJoining(false);
                        return;
                      }
                      // Create membership
                      await setDoc(doc(db, "platforms", platform.id as string, "members", uid), {
                        role: "member",
                        joinedAt: serverTimestamp(),
                        lastUpdated: serverTimestamp(),
                      });
                      toast.success("Successfully joined platform!");
                      // Refresh page to show content
                      window.location.reload();
                    } catch (error: any) {
                      console.error("Error joining platform:", error);
                      toast.error("Failed to join platform: " + (error?.message || "Unknown error"));
                      setJoining(false);
                    }
                  }}
                  disabled={joining}
                  className="gap-2 px-6"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Platform"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Generic error
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-3xl font-bold">Error loading post</h1>
          <p className="text-muted-foreground">Something went wrong while loading this post.</p>
          <Button asChild>
            <Link href={`/platforms/${slug}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to platform
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentUid = (auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id;
  const isSelf = !!currentUid && post.authorId === currentUid;
  const authorName = post.authorName || (isSelf ? ((user as any).displayName || (user as any).name || (user as any).email || "You") : "Unknown User");
  const authorAvatar = post.authorAvatar || ((isSelf ? ((user as any).avatarUrl || (user as any).photoURL || "") : ""));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => {
        if (post.communityName === "General" && slug) {
          router.push(`/platforms/${slug}`);
        } else if (post.communityId && slug) {
          router.push(`/platforms/${slug}/communities/${post.communityId}`);
        } else {
          router.back();
        }
      }}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <EnhancedPostCard
        post={{
          ...post,
          authorName,
          authorAvatar,
          communityName: post.communityName || "",
          platformName: platform.name,
          platformSlug: slug,
          platformPrimaryColor: platform.primaryColor,
          isLiked: likedPosts.has(id),
          isBookmarked: bookmarkedPosts.has(id),
        }}
        canDelete={isSelf}
        canEdit={isSelf}
        canComment={isMember}
        canReact={isMember}
        canPin={false}
        onDelete={handleDelete}
        onEditSubmit={handleEditSubmit}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onShare={() => toast.success("Post shared!")}
        onReport={() => {}}
        onAddComment={handleAddComment}
        onVotePoll={handleVotePoll}
        commentsPreview={commentsPreviewByPost[id]}
        onLoadMoreComments={async (_postId, nextCount) => {
          try {
            const { collection, getDocs, query, orderBy, limit } = await import("firebase/firestore");
            const cs = await getDocs(query(collection(db, "platforms", platform.id, "posts", id, "comments"), orderBy("createdAt", "asc"), limit(nextCount)) as any);
            setCommentsPreviewByPost(prev => ({ ...prev, [id]: cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) }));
          } catch {}
        }}
        currentUserId={currentUid}
        onEditComment={async (_postId, _commentId, content) => {
          try {
            const { updateDoc } = await import("firebase/firestore");
            await updateDoc(doc(db, "platforms", platform.id, "posts", id, "comments", _commentId), { content });
            setCommentsPreviewByPost(prev => {
              const copy = { ...prev } as any;
              copy[id] = (copy[id] || []).map((c:any) => c.id === _commentId ? { ...c, content } : c);
              return copy;
            });
            toast.success("Comment updated");
          } catch { toast.error("Failed to update comment"); }
        }}
        onDeleteComment={async (_postId, _commentId) => {
          try {
            const { deleteDoc, updateDoc, increment } = await import("firebase/firestore");
            await deleteDoc(doc(db, "platforms", platform.id, "posts", id, "comments", _commentId));
            await updateDoc(doc(db, "platforms", platform.id, "posts", id), { comments: increment(-1) });
            setPost((prev: any) => ({ ...prev, comments: Math.max(0, (prev?.comments||0) - 1) }));
            setCommentsPreviewByPost(prev => {
              const copy = { ...prev } as any;
              copy[id] = (copy[id] || []).filter((c:any) => c.id !== _commentId);
              return copy;
            });
            toast.success("Comment deleted");
          } catch { toast.error("Failed to delete comment"); }
        }}
        onToggleComments={async (_postId, nextDisabled) => {
          try {
            const { updateDoc } = await import("firebase/firestore");
            await updateDoc(doc(db, "platforms", platform.id, "posts", id), { commentsDisabled: nextDisabled });
            setPost((prev: any) => ({ ...prev, commentsDisabled: nextDisabled }));
            toast.success(nextDisabled ? "Comments disabled" : "Comments enabled");
          } catch { toast.error("Failed to update comments setting"); }
        }}
        canDisableComments={isSelf}
      />
    </div>
  );
}

