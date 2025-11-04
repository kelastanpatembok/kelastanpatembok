"use client";

import { use as reactUse, useEffect, useMemo, useState } from "react";
import users from "@/data/users.json";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, orderBy, query, updateDoc, where, serverTimestamp, setDoc, increment } from "firebase/firestore";
import { storage, auth } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { FeedComposer } from "@/components/feed-composer";
import { EnhancedPostCard } from "@/components/enhanced-post-card";
import { FeedSubheader } from "@/components/feed-subheader";
import { DiscoveryRails } from "@/components/discovery-rails";
import { OnboardingChecklist } from "@/components/onboarding-checklist";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { JumpToTop } from "@/components/jump-to-top";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PlatformHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const [platform, setPlatform] = useState<any>(null);
  const { user } = useAuth();

  const [posts, setPosts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [authorAvatars, setAuthorAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [isMember, setIsMember] = useState(false);
  const [commentsPreviewByPost, setCommentsPreviewByPost] = useState<Record<string, any[]>>({});
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);

  // feed controls
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("new");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      setAccessLoading(true);
      try {
        // platform by slug - try to read, will fail if not public and user not owner/member
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
        setPlatform(p);
        
        if (!p) {
          setAccessLoading(false);
          setLoading(false);
          return;
        }

        // Check if user has access
        const isPublic = p.public === true;
        const u: any = user;
        const pid = (p as any).ownerId;
        const isOwnerCheck = !!(u && pid && (pid === u.uid || pid === u.id));
        
        // Check membership
        let isMemberCheck = false;
        try {
          const uid = auth.currentUser?.uid || (u?.uid);
          if (uid) {
            const m = await getDoc(doc(db, "platforms", p.id as string, "members", uid));
            isMemberCheck = m.exists();
          }
        } catch {}

        const hasAccessCheck = isPublic || isOwnerCheck || isMemberCheck;
        setHasAccess(hasAccessCheck);
        setIsOwner(isOwnerCheck);
        setIsMember(isMemberCheck);

        if (!hasAccessCheck) {
          // User doesn't have access, stop loading and show access denied UI
          setAccessLoading(false);
          setLoading(false);
          return;
        }

        // User has access, load platform content
        if (p) {
        const snap = await getDocs(query(collection(db, "platforms", p.id as string, "posts"), orderBy("createdAt", "desc")) as any);
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
        setPosts(list as any[]);
        const cs = await getDocs(collection(db, "platforms", p.id as string, "communities"));
        setCommunities(cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[]);
        // Load latest 3 comments per post (preview)
        try {
          const preview: Record<string, any[]> = {};
          await Promise.all(list.map(async (post:any) => {
            const cs = await getDocs(query(collection(db, "platforms", p.id as string, "posts", post.id, "comments"), orderBy("createdAt", "asc"), limit(3)) as any);
            preview[post.id] = cs.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          }));
          setCommentsPreviewByPost(preview);
        } catch {}
        // Load like state for current user
        try {
          const uid = auth.currentUser?.uid || (u?.uid);
          if (uid) {
            const liked = new Set<string>();
            await Promise.all(list.map(async (post:any) => {
              const r = await getDoc(doc(db, "platforms", p.id as string, "posts", post.id, "reactions", uid));
              if (r.exists()) liked.add(post.id);
            }));
            setLikedPosts(liked);
          }
        } catch {}
        // Load bookmarks for current user from Firestore
        try {
          const uid = auth.currentUser?.uid || (u?.uid);
          if (uid) {
            const bookmarked = new Set<string>();
            await Promise.all(list.map(async (post:any) => {
              const bookmarkId = `${p.id}_${post.id}`;
              const bm = await getDoc(doc(db, "users", uid, "bookmarks", bookmarkId));
              if (bm.exists()) bookmarked.add(post.id);
            }));
            setBookmarkedPosts(bookmarked);
          }
        } catch {}
        setAccessLoading(false);
        setLoading(false);
      } else {
        setPosts([]);
        setCommunities([]);
        setIsOwner(false);
        setAccessLoading(false);
        setLoading(false);
      }
    } catch (error: any) {
      // If access is denied by Firestore rules, handle gracefully
      console.error("Error loading platform:", error);
      if (error.code === 'permission-denied') {
        setHasAccess(false);
        setAccessLoading(false);
        setLoading(false);
      } else {
        setLoading(false);
        setAccessLoading(false);
      }
    }
    })();
    const isNewUser = !localStorage.getItem("rwid_onboarding_dismissed");
    if (isNewUser && user) setShowOnboarding(true);
  }, [slug, user]);

  useEffect(() => {
    function handleScroll() {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 && hasMore) {
        setHasMore(false);
      }
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  const filteredPosts = useMemo(() => {
    let filtered = posts;
    
    // Filter: only show posts from "General" community on platform page
    filtered = filtered.filter(post => {
      const communityId = (post as any).communityId || "";
      const communityName = (post as any).communityName || "";
      return communityId === "general" || communityId === "General" || 
             communityName === "General" || communityName === "general";
    });
    
    if (activeTab === "my-communities" && user) {
      const userCommunities = ["c_react", "c_job"]; // mock
      filtered = filtered.filter(post => userCommunities.includes(post.communityId));
    } else if (activeTab === "saved") {
      filtered = filtered.filter(post => bookmarkedPosts.has(post.id));
    }

    if (selectedFilters.length > 0) {
      filtered = filtered.filter(post => {
        const communityName = (post as any).communityName || "";
        return selectedFilters.some(filter =>
          communityName.toLowerCase().includes(filter) ||
          (post.content || "").toLowerCase().includes(filter)
        );
      });
    }

    filtered.sort((a, b) => {
      // Pinned posts first
      const aPinned = (a as any).pinned === true ? 1 : 0;
      const bPinned = (b as any).pinned === true ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned; // if b pinned -> positive => a after b (pinned first)
      switch (sortBy) {
        case "new":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "trending":
        case "top":
          return b.likes - a.likes;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    return filtered;
  }, [posts, activeTab, selectedFilters, sortBy, bookmarkedPosts, user]);

  async function handleAddPost(content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) {
    if (!platform) return;
    // Posts created on the platform root should be assigned to the virtual "General" community
    const community = { id: "general", name: "General" } as const;
    const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
    const authorUid = (auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id || "anonymous";
    const newPost = {
      content,
      createdAt: serverTimestamp(),
      likes: 0,
      comments: 0,
      shares: 0,
      platformId: platform.id,
      communityId: community.id,
      communityName: (community as any).name || "General",
      authorId: authorUid,
      authorName: displayName,
      authorAvatar: auth.currentUser?.photoURL || (user as any)?.photoURL || "",
      createdBy: authorUid,
      ...(eventDate && { eventDate, isEvent: true }),
      ...(polls && { polls: polls.map(p => ({ ...p, votes: p.options.map(() => 0), voters: [] })), isPoll: true }),
    } as any;
    const docRef = await addDoc(collection(db, "platforms", platform.id as string, "posts"), newPost);
    let created = { id: docRef.id, ...newPost, createdAt: new Date().toISOString() } as any;
    setPosts([created, ...posts]);

    if (imageFile) {
      try {
        // Ensure we have a fresh auth token for Storage
        if (!auth.currentUser) {
          toast.error("Please sign in to upload images");
          throw new Error("No auth user for storage upload");
        }
        await auth.currentUser.getIdToken(true);
        const ext = (imageFile.name.split('.').pop() || 'png').toLowerCase();
        const path = `platforms/${platform.slug}/posts/${docRef.id}.${ext}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || `image/${ext}` });
        const imageUrl = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "platforms", platform.id as string, "posts", docRef.id), { imageUrl });
        // update local state
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
    if (!platform) return;
    const likeRef = doc(db, "platforms", platform.id as string, "posts", postId, "reactions", uid);
    const hadLike = likedPosts.has(postId);
    try {
      if (hadLike) {
        await deleteDoc(likeRef);
        await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), { likes: increment(-1) });
        setLikedPosts(prev => { const n = new Set(prev); n.delete(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: Math.max(0, (p.likes||0) - 1) } : p));
      } else {
        await setDoc(likeRef, { type: "like", createdAt: serverTimestamp() });
        await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), { likes: increment(1) });
        setLikedPosts(prev => { const n = new Set(prev); n.add(postId); return n; });
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes||0) + 1 } : p));
      }
    } catch {
      toast.error("Failed to update like");
    }
  }

  async function handleBookmark(postId: string) {
    if (!auth.currentUser) { toast.error("Sign in to bookmark"); return; }
    if (!platform) return;
    const uid = auth.currentUser.uid;
    const bookmarkId = `${platform.id}_${postId}`;
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
          platformId: platform.id,
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
    if (!platform) return;
    try {
      await deleteDoc(doc(db, "platforms", platform.id as string, "posts", postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post deleted");
    } catch (e) {
      toast.error("Failed to delete post");
    }
  }

  function handleShare() { toast.success("Post shared!"); }
  function handleReport() { /* removed */ }
  async function handleTogglePin(postId: string, nextPinned: boolean) {
    if (!platform) return;
    try {
      await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), { pinned: nextPinned });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, pinned: nextPinned } : p));
      toast.success(nextPinned ? "Pinned to top" : "Unpinned");
    } catch {
      toast.error("Failed to update pin");
    }
  }
  async function handleToggleComments(postId: string, nextDisabled: boolean) {
    if (!platform) return;
    try {
      await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), { commentsDisabled: nextDisabled });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsDisabled: nextDisabled } : p));
      toast.success(nextDisabled ? "Comments disabled" : "Comments enabled");
    } catch {
      toast.error("Failed to update comments setting");
    }
  }
  async function handleAddComment(postId: string, content: string) {
    if (!auth.currentUser) { toast.error("Sign in to comment"); return; }
    if (!isMember) { toast.error("Join this platform to comment"); return; }
    if (!platform) return;
    try {
      const displayName = (user as any)?.displayName || (user as any)?.name || (user as any)?.email || "Unknown";
      const authorUid = auth.currentUser.uid;
      const newComment = {
        content,
        createdAt: serverTimestamp(),
        authorId: authorUid,
        authorName: displayName,
      } as any;
      await addDoc(collection(db, "platforms", platform.id as string, "posts", postId, "comments"), newComment);
      await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), { comments: increment(1) });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: (p.comments||0) + 1 } : p));
      // Optimistically update preview
      setCommentsPreviewByPost(prev => {
        const copy = { ...prev } as any;
        const list = (copy[postId] ? [...copy[postId]] : []) as any[];
        list.push({ id: `temp_${Date.now()}`, content, authorName: displayName, createdAt: new Date().toISOString() });
        // keep only last 3 oldest-first window: fetch asc limit 3, but for optimistic we sort and take last 3
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
    if (!platform) return;
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
      
      await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), {
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

  async function handleEditSubmit(postId: string, content: string, imageFile?: File | null, eventDate?: string | null, polls?: any[] | null) {
    try {
      if (!platform) return;
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
      await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), updateData);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updateData } : p));
      if (imageFile) {
        try {
          await auth.currentUser?.getIdToken(true);
          const ext = (imageFile.name.split('.').pop() || 'png').toLowerCase();
          const path = `platforms/${platform.slug}/posts/${postId}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, imageFile, { contentType: imageFile.type || `image/${ext}` });
          const imageUrl = await getDownloadURL(storageRef);
          await updateDoc(doc(db, "platforms", platform.id as string, "posts", postId), { imageUrl });
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
  function handleFilterToggle(filter: string) {
    setSelectedFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
  }

  // Fetch latest avatars for authors shown (up to 10 per batch)
  useEffect(() => {
    // Run regardless of platform presence; safely no-op if list empty
    const needIds = Array.from(new Set(filteredPosts
      .map((p: any) => p.authorId)
      .filter((id: string | undefined) => !!id && !authorAvatars[id!])));
    if (needIds.length === 0) return;
    const chunks: string[][] = [];
    for (let i = 0; i < needIds.length; i += 10) chunks.push(needIds.slice(i, i + 10));
    (async () => {
      const updates: Record<string, string> = {};
      for (const chunk of chunks) {
        const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", chunk as any)) as any);
        snap.docs.forEach(d => {
          const data: any = d.data();
          const url = data?.avatarUrl || data?.photoURL || "";
          if (url) updates[d.id] = url;
        });
      }
      if (Object.keys(updates).length > 0) setAuthorAvatars(prev => ({ ...prev, ...updates }));
    })();
  }, [filteredPosts]);

  if (!platform) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading platform…</span>
      </div>
    );
  }
  const featuredStories: any[] = [];

  if (loading || accessLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_: any, i: number) => (
            <div key={i} className="rounded-md border p-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-4 w-3/4 mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show access denied UI if user doesn't have access
  if (platform && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-3xl font-bold">{platform.name || "Platform"}</h1>
          <p className="text-muted-foreground">
            This platform is private. Join to access communities, courses, and posts.
          </p>
          {platform.description && (
            <p className="text-sm text-muted-foreground mt-4">
              {platform.description}
            </p>
          )}
          {!user ? (
            <div className="space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">Sign in to join this platform</p>
              <Button asChild>
                <Link href="/">Sign In</Link>
              </Button>
            </div>
          ) : (
            <Button
              onClick={async () => {
                if (!user || !platform) return;
                try {
                  const uid = auth.currentUser?.uid || (user as any)?.uid || (user as any)?.id;
                  if (!uid) {
                    toast.error("Please sign in to join");
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
                }
              }}
              className="mt-4"
            >
              Join Platform
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Description */}
      {platform && platform.description && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {platform.description}
            </p>
            {isOwner && (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/platforms/${slug}/edit`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Platform
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
      {/* Platform Description Empty but owner can edit */}
      {platform && !platform.description && isOwner && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={`/platforms/${slug}/edit`}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Platform
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Discovery Rails */}
      {user && featuredStories.length > 0 && (
        <DiscoveryRails featuredStories={featuredStories} />
      )}

      {/* Subheader removed for cleaner page */}

      {/* Composer */}
      {user && isOwner && (
        <FeedComposer onAddPost={handleAddPost} />
      )}

      {/* Feed */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <EmptyState
            title="No posts found"
            description="Try adjusting your filters or check back later for new content."
            icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
          />
        ) : (
          filteredPosts.map((post) => {
            const currentUid = (auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id;
            const isSelf = !!currentUid && (post as any).authorId === currentUid;
            const authorName = (post as any).authorName || (isSelf ? ((user as any).displayName || (user as any).name || (user as any).email || "You") : "Unknown User");
            const authorAvatar = (post as any).authorAvatar || authorAvatars[(post as any).authorId] || (isSelf ? ((user as any).photoURL || "") : "");
            return (
              <EnhancedPostCard
                key={post.id}
              post={{
                ...post,
                authorName,
                authorAvatar,
                communityName: (post as any).communityName || "Community",
                platformName: platform?.name || "",
                platformSlug: slug,
                platformPrimaryColor: (platform as any)?.branding?.primaryColor,
                isLiked: likedPosts.has(post.id),
                isBookmarked: bookmarkedPosts.has(post.id),
              }}
                canDelete={isSelf}
                canEdit={isSelf}
                canComment={isMember}
                canReact={isMember}
                canPin={isOwner}
                canDisableComments={isSelf}
                autoOpenComment={isMember && ((commentsPreviewByPost[post.id]?.length || 0) > 0)}
                onDelete={handleDelete}
                onEditSubmit={handleEditSubmit}
                onTogglePin={handleTogglePin}
                onToggleComments={handleToggleComments}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onShare={handleShare}
                onReport={handleReport}
                onAddComment={handleAddComment}
                onVotePoll={handleVotePoll}
                commentsPreview={commentsPreviewByPost[post.id]}
                onLoadMoreComments={async (_postId, nextCount) => {
                  try {
                    const cs = await getDocs(query(collection(db, "platforms", platform.id as string, "posts", _postId, "comments"), orderBy("createdAt", "asc"), limit(nextCount)) as any);
                    setCommentsPreviewByPost(prev => ({ ...prev, [_postId]: cs.docs.map(d => ({ id: d.id, ...(d.data() as any) })) }));
                  } catch {}
                }}
                currentUserId={(auth.currentUser?.uid) || (user as any)?.uid || (user as any)?.id}
                onEditComment={async (_postId, _commentId, content) => {
                  try {
                    await updateDoc(doc(db, "platforms", platform.id as string, "posts", _postId, "comments", _commentId), { content });
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
                    await deleteDoc(doc(db, "platforms", platform.id as string, "posts", _postId, "comments", _commentId));
                    await updateDoc(doc(db, "platforms", platform.id as string, "posts", _postId), { comments: increment(-1) });
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

      {!loading && !hasMore && filteredPosts.length > 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">You've reached the end of the feed</div>
      )}

      <JumpToTop />
    </div>
  );
}



