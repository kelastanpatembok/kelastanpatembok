"use client";

import { use as reactUse, useEffect, useMemo, useRef, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, getDocs, query, where, collection, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

type Params = { params: Promise<{ slug: string; storyId: string }> };

export default function EditSuccessStoryPage({ params }: Params) {
  const { slug, storyId } = reactUse(params);
  const router = useRouter();

  const [platform, setPlatform] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // existing urls
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        // load platform by slug
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } as any : null;
        setPlatform(p);
        const uid = auth.currentUser?.uid;
        const owner = !!(uid && p?.ownerId === uid);
        setIsOwner(owner);
        if (!p) throw new Error("Platform tidak ditemukan");
        // Ensure membership for owner (to satisfy Firestore rules on update)
        if (owner && uid) {
          try {
            await setDoc(doc(db, "platforms", p.id, "members", uid), { role: "owner", joinedAt: serverTimestamp() }, { merge: true });
          } catch {}
        }

        // load story
        const sDoc = await getDoc(doc(db, "platforms", p.id, "successStories", storyId));
        if (!sDoc.exists()) throw new Error("Kisah tidak ditemukan");
        const data = sDoc.data() as any;
        setName(data.author || "");
        setStory(data.story || "");
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      } catch (e: any) {
        setError(e?.message || "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, storyId]);

  const canSubmit = useMemo(() => {
    return !!platform && isOwner && name.trim() && story.trim();
  }, [platform, isOwner, name, story]);

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
    setNewFiles(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setNewPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeExistingPhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewPhoto = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !isOwner) return;
    setSaving(true);
    setError(null);
    try {
      // upload new files
      const uploaded: string[] = [];
      if (newFiles.length > 0) {
        if (!auth.currentUser) throw new Error("Please sign in to upload");
        await auth.currentUser.getIdToken(true);
        for (let i = 0; i < newFiles.length; i++) {
          const f = newFiles[i];
          const ext = (f.name.split(".").pop() || "png").toLowerCase();
          const path = `platforms/${platform.id}/success-stories/${storyId}/extra_${Date.now()}_${i}.${ext}`;
          const r = ref(storage, path);
          await uploadBytes(r, f, { contentType: f.type || `image/${ext}` });
          uploaded.push(await getDownloadURL(r));
        }
      }

      // update doc
      await updateDoc(doc(db, "platforms", platform.id, "successStories", storyId), {
        author: name.trim(),
        story: story.trim(),
        photos: [...photos, ...uploaded],
        updatedAt: serverTimestamp(),
      });
      router.push(`/platforms/${slug}/success-stories`);
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: slug, href: `/platforms/${slug}` }, { label: "Edit Kisah Sukses" }]} />
        <div className="text-sm text-muted-foreground">Memuat...</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Edit Kisah Sukses" }]} />
        <div className="text-sm text-muted-foreground">Hanya pemilik platform yang dapat mengedit kisah sukses.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Edit Kisah Sukses" }]} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-2">Nama</label>
          <Input value={name} onChange={(e)=> setName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Kisah</label>
          <Textarea value={story} onChange={(e)=> setStory(e.target.value)} rows={10} required />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Foto Saat Ini</label>
          {photos.length === 0 && (
            <div className="text-sm text-muted-foreground">Tidak ada foto.</div>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image src={url} alt={`photo-${idx}`} fill className="object-cover" />
                  <button type="button" onClick={()=> removeExistingPhoto(idx)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">Tambah Foto</label>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSelectFiles} />
          <Button type="button" variant="outline" onClick={()=> fileInputRef.current?.click()} className="w-full">
            <Upload className="h-4 w-4 mr-2" /> Pilih Foto
          </Button>
          {newPreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {newPreviews.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image src={p} alt={`new-${i}`} fill className="object-cover" />
                  <button type="button" onClick={()=> removeNewPhoto(i)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={!canSubmit || saving}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Button>
          <Button type="button" variant="outline" onClick={()=> router.push(`/platforms/${slug}/success-stories`)}>Batal</Button>
        </div>
      </form>
    </div>
  );
}


