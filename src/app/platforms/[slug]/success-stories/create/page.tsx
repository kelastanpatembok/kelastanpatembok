"use client";

import { use as reactUse, useEffect, useMemo, useState, useRef } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { addDoc, collection, getDocs, query, where, serverTimestamp, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { X, Upload } from "lucide-react";
import Image from "next/image";

type Params = { params: Promise<{ slug: string }> };

export default function CreateSuccessStoryPage({ params }: Params) {
  const { slug } = reactUse(params);
  const router = useRouter();

  const [platform, setPlatform] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
        setPlatform(p);
        const uid = auth.currentUser?.uid;
        const owner = !!(uid && (p as any)?.ownerId === uid);
        setIsOwner(owner);
        // Ensure membership doc exists for owner to satisfy Storage/Firestore rules
        if (owner && p && uid) {
          try {
            const memRef = doc(db, "platforms", p.id, "members", uid);
            const mem = await getDoc(memRef);
            if (!mem.exists()) {
              await setDoc(memRef, { role: "owner", joinedAt: serverTimestamp() }, { merge: true });
            }
          } catch {}
        }
      } catch (e) {
        setError("Gagal memuat platform");
      }
    })();
  }, [slug]);

  const canSubmit = useMemo(() => {
    return name.trim() && story.trim() && isOwner && !!platform;
  }, [name, story, isOwner, platform]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    setPhotoFiles(prev => [...prev, ...validFiles]);
    
    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
    setPhotoPreviews((prev: any[]) => prev.filter((_: any, i: number) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform || !isOwner) return;
    setSaving(true);
    setError(null);
    try {
      // Create document first
      const docRef = await addDoc(collection(db, "platforms", platform.id, "successStories"), {
        platformId: platform.id,
        author: name.trim(),
        story: story.trim(),
        photos: [],
        likes: 0,
        createdAt: serverTimestamp(),
      });

      // Upload photos if any
      if (photoFiles.length > 0) {
        if (!auth.currentUser) {
          throw new Error("Please sign in to upload photos");
        }
        await auth.currentUser.getIdToken(true);
        
        const photoUrls: string[] = [];
        for (let i = 0; i < photoFiles.length; i++) {
          const file = photoFiles[i];
          const ext = (file.name.split('.').pop() || 'png').toLowerCase();
          const path = `platforms/${platform.id}/success-stories/${docRef.id}/${i}.${ext}`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, file, { contentType: file.type || `image/${ext}` });
          const url = await getDownloadURL(storageRef);
          photoUrls.push(url);
        }
        
        // Update document with photo URLs
        await updateDoc(doc(db, "platforms", platform.id, "successStories", docRef.id), {
          photos: photoUrls,
        });
      }

      router.push(`/platforms/${slug}/success-stories`);
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan kisah sukses");
    } finally {
      setSaving(false);
    }
  };

  if (!platform) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: slug, href: `/platforms/${slug}` }, { label: "Buat Kisah Sukses" }]} />
        <div className="text-sm text-muted-foreground">Memuat data...</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Buat Kisah Sukses" }]} />
        <div className="text-sm text-muted-foreground">Hanya pemilik platform yang dapat membuat kisah sukses.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: "Buat Kisah Sukses" }]} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

        <div>
          <label className="block text-sm font-medium mb-2">Nama</label>
          <Input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Nama lengkap" 
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Kisah</label>
          <Textarea 
            value={story} 
            onChange={(e) => setStory(e.target.value)} 
            placeholder="Ceritakan perjalanan dan capaianmu..." 
            rows={10} 
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Upload Foto</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Pilih Foto
          </Button>
          
          {photoPreviews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={!canSubmit || saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(`/platforms/${slug}/success-stories`)}
          >
            Batal
          </Button>
        </div>
      </form>
    </div>
  );
}


