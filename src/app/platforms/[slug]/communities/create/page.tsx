"use client";

import { use as reactUse, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { db, storage, auth } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, X, UserPlus } from "lucide-react";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";

type Params = { params: Promise<{ slug: string }> };

export default function CreateCommunityPage({ params }: Params) {
  const { slug } = reactUse(params);
  const router = useRouter();

  const [platform, setPlatform] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [cslug, setCslug] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#3b82f6");
  const [order, setOrder] = useState<number>(0);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const [slugTaken, setSlugTaken] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mentorIds, setMentorIds] = useState<string[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorDialogOpen, setMentorDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Load all users for search
  useEffect(() => {
    (async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, "users"), limit(100)));
        setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading users:", err);
      }
    })();
  }, []);

  // Load mentors data
  useEffect(() => {
    (async () => {
      if (mentorIds.length > 0) {
        const mentorsData: any[] = [];
        for (const mentorId of mentorIds) {
          try {
            const mentorDoc = await getDoc(doc(db, "users", mentorId));
            if (mentorDoc.exists()) {
              mentorsData.push({ id: mentorDoc.id, ...(mentorDoc.data() as Record<string, any>) });
            }
          } catch (err) {
            console.error(`Error loading mentor ${mentorId}:`, err);
          }
        }
        setMentors(mentorsData);
      } else {
        setMentors([]);
      }
    })();
  }, [mentorIds]);

  // load platform by slug
  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
      const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
      setPlatform(p);
      setLoading(false);
    })();
  }, [slug]);

  function genSlug(v: string) {
    return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  // check slug uniqueness within platform
  async function checkSlug(uniqueSlug: string) {
    if (!platform || !uniqueSlug) return;
    const qs = await getDocs(query(collection(db, "platforms", platform.id as string, "communities"), where("slug", "==", uniqueSlug), limit(1)));
    setSlugTaken(!qs.empty);
  }

  const canCreate = name.trim() && cslug && !saving && slugTaken === false;

  // owner guard
  const isOwner = useMemo(() => {
    const uid = auth.currentUser?.uid;
    return !!uid && platform && platform.ownerId === uid;
  }, [platform]);

  if (loading) return <div className="px-4 py-6">Loading...</div>;
  if (!platform) return <div className="px-4 py-6 text-sm text-muted-foreground">Platform not found.</div>;
  if (!isOwner) return <div className="px-4 py-6 text-sm text-muted-foreground">Only platform owner can create a community.</div>;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Communities", href: `/platforms/${slug}` }, { label: "Create" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create community</h1>
        <Badge variant="secondary">Owner only</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Name</Label>
            <Input value={name} onChange={(e)=>{ setName(e.target.value); if (!cslug) setCslug(genSlug(e.target.value)); }} placeholder="e.g. ReactJS" />
          </div>
          <div>
            <Label className="mb-1 block">Slug</Label>
            <Input value={cslug} onChange={(e)=> setCslug(genSlug(e.target.value))} onBlur={()=> checkSlug(cslug)} placeholder="e.g. react" />
            {slugTaken === true && (<div className="text-xs text-destructive mt-1">Slug already taken.</div>)}
            {slugTaken === false && (<div className="text-xs text-emerald-600 mt-1">Slug available.</div>)}
          </div>
          <div>
            <Label className="mb-1 block">Description</Label>
            <Textarea value={description} onChange={(e)=> setDescription(e.target.value)} maxLength={160} placeholder="Short description (≤160 chars)" />
            <div className="text-xs text-muted-foreground mt-1">{description.length}/160</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <Label className="mb-1 block">Icon</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{
                const f = e.target.files?.[0] || null;
                setIconFile(f);
                setIconPreview(f ? URL.createObjectURL(f) : "");
              }} />
              <Button variant="outline" size="sm" onClick={()=> fileInputRef.current?.click()}>{iconFile ? "Change icon" : "Upload icon"}</Button>
            </div>
            {iconPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconPreview} alt="icon" className="h-16 w-16 rounded object-cover border" />
            )}
          </div>
          <div>
            <Label className="mb-1 block">Accent color</Label>
            <Input type="color" value={accent} onChange={(e)=> setAccent(e.target.value)} className="h-10 w-16 p-1" />
          </div>
          <div>
            <Label className="mb-1 block">Order</Label>
            <Input type="number" value={order} onChange={(e)=> setOrder(parseInt(e.target.value || "0", 10))} className="w-32" />
            <div className="text-xs text-muted-foreground mt-1">Lower number shows higher in the list.</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Mentors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Add mentors who can create posts and courses for this community (optional)
          </div>
          
          {/* Current Mentors */}
          {mentors.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Mentors</Label>
              <div className="flex flex-wrap gap-2">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={mentor.avatarUrl || mentor.photoURL || ""} alt={mentor.displayName || mentor.name} />
                      <AvatarFallback>{(mentor.displayName || mentor.name || "M").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{mentor.displayName || mentor.name || "Unknown"}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const newIds = mentorIds.filter(id => id !== mentor.id);
                        setMentorIds(newIds);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Mentor Button */}
          <Button 
            variant="outline" 
            onClick={() => setMentorDialogOpen(true)}
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Mentor
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={()=> router.back()}>Cancel</Button>
        <Button disabled={!canCreate} onClick={async ()=>{
          setSaving(true);
          await checkSlug(cslug);
          if (slugTaken) { setSaving(false); return; }
          const docRef = await addDoc(collection(db, "platforms", platform.id as string, "communities"), {
            name,
            slug: cslug,
            description,
            accentColor: accent,
            order: Number.isFinite(order) ? order : 0,
            platformId: platform.id,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser?.uid || "",
            iconUrl: "",
            visibility: "public",
            mentorIds: mentorIds,
          });
          let iconUrl = "";
          try {
            if (iconFile) {
              const ext = (iconFile.name.split('.').pop() || 'png').toLowerCase();
              const path = `platforms/${platform.id}/communities/${docRef.id}/icon.${ext}`;
              const storageRef = ref(storage, path);
              await uploadBytes(storageRef, iconFile, { contentType: iconFile.type || `image/${ext}` });
              iconUrl = await getDownloadURL(storageRef);
              await updateDoc(doc(db, "platforms", platform.id as string, "communities", docRef.id), { iconUrl });
            }
          } catch {}
          // Notify sidebars/dialogs to refresh without full reload
          try {
            window.dispatchEvent(new CustomEvent('community-updated'));
          } catch {}
          router.push(`/platforms/${slug}`);
        }}>Create Community</Button>
      </div>

      {/* Mentor Search Dialog */}
      <CommandDialog open={mentorDialogOpen} onOpenChange={setMentorDialogOpen}>
        <CommandInput placeholder="Search users..." />
        <CommandList>
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup heading="Select User">
            {users
              .filter(user => !mentorIds.includes(user.id))
              .map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => {
                    setMentorIds([...mentorIds, user.id]);
                    setMentorDialogOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || user.photoURL || ""} alt={user.displayName || user.name} />
                      <AvatarFallback>{(user.displayName || user.name || "U").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.displayName || user.name || "Unknown"}</div>
                      {user.email && <div className="text-sm text-muted-foreground truncate">{user.email}</div>}
                    </div>
                  </div>
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}


