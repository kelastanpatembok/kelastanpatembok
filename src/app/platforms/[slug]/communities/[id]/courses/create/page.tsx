"use client";

import { use as reactUse, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { db, storage, auth } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

type Params = { params: Promise<{ slug: string; id: string }> };

export default function CreateCoursePage({ params }: Params) {
  const { slug, id: communityId } = reactUse(params);
  const router = useRouter();

  const [platform, setPlatform] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [description, setDescription] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
      const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
      setPlatform(p);
    })();
  }, [slug]);

  const canCreate = !!title && !!platform && !saving;
  const isOwner = auth.currentUser && platform && platform.ownerId === auth.currentUser.uid;
  if (platform && !isOwner) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Only platform owner can create a course.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Courses", href: `/platforms/${slug}/courses` }, { label: "Create" }]} />
      <h1 className="text-2xl font-semibold">Create course</h1>

      <Card>
        <CardHeader><CardTitle>Basics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Title</Label>
            <Input value={title} onChange={(e)=> setTitle(e.target.value)} placeholder="e.g. React Fundamentals" />
          </div>
          <div>
            <Label className="mb-1 block">Level</Label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div>
            <Label className="mb-1 block">Description</Label>
            <Textarea value={description} onChange={(e)=> setDescription(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Thumbnail</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0] || null; setThumbFile(f); setThumbPreview(f ? URL.createObjectURL(f) : ""); }} />
          <Button variant="outline" size="sm" onClick={()=> fileInputRef.current?.click()}>{thumbFile ? "Change image" : "Upload image"}</Button>
          {thumbPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbPreview} alt="thumb" className="h-24 w-40 object-cover rounded border" />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={()=> router.back()}>Cancel</Button>
        <Button disabled={!canCreate} onClick={async ()=>{
          setSaving(true);
          try {
            const uid = auth.currentUser?.uid;
            if (!uid || !platform) {
              throw new Error("Not authenticated or platform not found");
            }

            // Ensure owner has membership for Firestore rules
            if (isOwner) {
              const membershipRef = doc(db, "platforms", platform.id as string, "members", uid);
              const membershipDoc = await getDoc(membershipRef);
              if (!membershipDoc.exists()) {
                // Create membership document for owner
                await setDoc(membershipRef, {
                  role: "owner",
                  joinedAt: serverTimestamp(),
                });
              }
            }

            const docRef = await addDoc(collection(db, "platforms", platform.id as string, "courses"), {
              title,
              level,
              description,
              platformId: platform.id,
              communityId,
              lessons: 0,
              createdAt: serverTimestamp(),
              createdBy: uid,
              thumbnailUrl: "",
            });
            try {
              if (thumbFile) {
                const ext = (thumbFile.name.split('.').pop() || 'png').toLowerCase();
                const path = `platforms/${slug}/courses/${docRef.id}/thumb.${ext}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, thumbFile, { contentType: thumbFile.type || `image/${ext}` });
                const url = await getDownloadURL(storageRef);
                await (await import("firebase/firestore")).updateDoc(doc(db, "platforms", platform.id as string, "courses", docRef.id), { thumbnailUrl: url });
              }
            } catch (e) {
              console.error("Failed to upload thumbnail", e);
            }
            router.push(`/platforms/${slug}/communities/${communityId}`);
          } catch (error) {
            console.error("Failed to create course", error);
            alert("Failed to create course. Please try again.");
            setSaving(false);
          }
        }}>Create Course</Button>
      </div>
    </div>
  );
}



