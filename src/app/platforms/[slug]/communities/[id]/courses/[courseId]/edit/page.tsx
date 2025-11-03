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
import { collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { toast } from "sonner";

type Params = { params: Promise<{ slug: string; id: string; courseId: string }> };

export default function EditCoursePage({ params }: Params) {
  const { slug, id: communityId, courseId } = reactUse(params);
  const router = useRouter();

  const [platform, setPlatform] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [description, setDescription] = useState("");
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Load platform
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
        if (!p) {
          router.replace("/platforms");
          return;
        }
        setPlatform(p);

        // Load course
        const courseDoc = await getDoc(doc(db, "platforms", p.id as string, "courses", courseId));
        if (!courseDoc.exists()) {
          router.replace(`/platforms/${slug}/communities/${communityId}`);
          return;
        }

        const courseData = { id: courseDoc.id, ...courseDoc.data() } as any;
        setCourse(courseData);
        setTitle(courseData.title || "");
        setLevel(courseData.level || "Beginner");
        setDescription(courseData.description || "");
        setThumbPreview(courseData.thumbnailUrl || "");
      } catch (error) {
        console.error("Failed to load course", error);
        router.replace(`/platforms/${slug}/communities/${communityId}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, courseId, communityId, router]);

  const canSave = !!title && !!platform && !saving && course;
  const isOwner = auth.currentUser && platform && platform.ownerId === auth.currentUser.uid;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
          <div className="h-48 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!platform || !course) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Course not found.</div>;
  }

  if (!isOwner) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Only platform owner can edit a course.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Platforms", href: "/platforms" },
        { label: slug, href: `/platforms/${slug}` },
        { label: "Communities", href: `/platforms/${slug}` },
        { label: "Courses", href: `/platforms/${slug}/communities/${communityId}` },
        { label: "Edit" }
      ]} />
      <h1 className="text-2xl font-semibold">Edit course</h1>

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
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0] || null; setThumbFile(f); setThumbPreview(f ? URL.createObjectURL(f) : (course.thumbnailUrl || "")); }} />
          <Button variant="outline" size="sm" onClick={()=> fileInputRef.current?.click()}>{thumbFile ? "Change image" : (course.thumbnailUrl ? "Change image" : "Upload image")}</Button>
          {thumbPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbPreview} alt="thumb" className="h-24 w-40 object-cover rounded border" />
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={()=> router.back()}>Cancel</Button>
        <Button disabled={!canSave} onClick={async ()=>{
          setSaving(true);
          try {
            const uid = auth.currentUser?.uid;
            if (!uid || !platform || !course) {
              throw new Error("Not authenticated or course not found");
            }

            const updates: any = {
              title,
              level,
              description,
            };

            // Upload new thumbnail if changed
            if (thumbFile) {
              try {
                const ext = (thumbFile.name.split('.').pop() || 'png').toLowerCase();
                const path = `platforms/${slug}/courses/${courseId}/thumb.${ext}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, thumbFile, { contentType: thumbFile.type || `image/${ext}` });
                const url = await getDownloadURL(storageRef);
                updates.thumbnailUrl = url;
              } catch (e) {
                console.error("Failed to upload thumbnail", e);
              }
            }

            // Update course document
            await updateDoc(doc(db, "platforms", platform.id as string, "courses", courseId), updates);
            
            toast.success("Course updated successfully");
            router.push(`/platforms/${slug}/communities/${communityId}`);
          } catch (error) {
            console.error("Failed to update course", error);
            alert("Failed to update course. Please try again.");
            setSaving(false);
          }
        }}>{saving ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
}

