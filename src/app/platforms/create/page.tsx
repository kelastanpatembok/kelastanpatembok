"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import platforms from "@/data/platforms.json";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PlatformSwitcher } from "@/components/platform-switcher";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase";

export default function CreatePlatformPage() {
  const router = useRouter();
  const enabled = process.env.NEXT_PUBLIC_ENABLE_PLATFORM_CREATION === "1";
  const { user } = useAuth() as any;
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#66b132");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function generateSlug(value: string) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  useEffect(() => {
    if (!enabled) {
      router.replace("/");
    }
  }, [enabled, router]);

  if (!enabled) return null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: "Create" }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create your platform</h1>
        {process.env.NEXT_PUBLIC_ENABLE_PLATFORM_SWITCHER === "1" ? <PlatformSwitcher /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Platform name</Label>
            <Input value={name} onChange={(e)=>{ setName(e.target.value); if (!slug) setSlug(generateSlug(e.target.value)); }} placeholder="e.g. RWID Community" />
          </div>
          <div>
            <Label className="mb-1 block">Slug</Label>
            <Input value={slug} onChange={(e)=> setSlug(generateSlug(e.target.value))} placeholder="e.g. rwid" />
            <p className="mt-1 text-xs text-muted-foreground">Will be used for subdomain or path, e.g. rwid.rwid.app or /p/rwid</p>
          </div>
          <div>
            <Label className="mb-1 block">Tagline</Label>
            <Input 
              value={tagline} 
              onChange={(e)=> setTagline(e.target.value)} 
              placeholder="e.g. Learn together, grow together"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {tagline.length}/100 characters
            </p>
          </div>
          <div>
            <Label className="mb-1 block">Description</Label>
            <Textarea 
              value={description} 
              onChange={(e)=> setDescription(e.target.value)} 
              placeholder="Describe your platform..."
              rows={4}
              className="resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {description.length} characters
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Primary color</Label>
            <Input type="color" value={primaryColor} onChange={(e)=> setPrimaryColor(e.target.value)} className="h-10 w-16 p-1" />
          </div>
          <div>
            <Label className="mb-1 block">Logo (optional)</Label>
            <Input type="file" accept="image/*" onChange={(e)=>{
              const f = e.target.files?.[0] || null;
              setLogoFile(f);
              if (f) {
                const url = URL.createObjectURL(f);
                setLogoPreview(url);
              } else {
                setLogoPreview("");
              }
            }} />
          </div>
          <div className="mt-2">
            <div className="text-sm font-medium mb-2">Preview</div>
            <div className="flex items-center gap-3 rounded-md border p-3" style={{ borderColor: primaryColor }}>
              <div className="h-8 w-8 rounded bg-muted overflow-hidden">
                {(logoPreview || logoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview || logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="text-lg font-semibold" style={{ color: primaryColor }}>{name || "Platform Name"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={()=> router.back()}>Cancel</Button>
        <Button disabled={!name || !slug || !user || saving} onClick={async ()=>{
          setSaving(true);
          // Ensure slug is unique
          const existsSnap = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
          if (!existsSnap.empty) {
            setSaving(false);
            alert("Slug already exists. Choose another.");
            return;
          }
          const ownerUid = (user as any)?.uid || (user as any)?.id || auth.currentUser?.uid;
          if (!ownerUid) {
            setSaving(false);
            alert("You must be signed in to create a platform.");
            return;
          }
          let uploadedLogoUrl = logoUrl;
          try {
            if (logoFile) {
              const cleanSlug = slug || `pf_${Date.now()}`;
              const ext = (logoFile.name.split('.').pop() || 'png').toLowerCase();
              const path = `platforms/${cleanSlug}/branding/logo_${Date.now()}.${ext}`;
              const storageRef = ref(storage, path);
              await uploadBytes(storageRef, logoFile, { contentType: logoFile.type || `image/${ext}` });
              uploadedLogoUrl = await getDownloadURL(storageRef);
            }
          } catch (e) {
            console.error("Logo upload failed", e);
          }

          const docRef = await addDoc(collection(db, "platforms"), {
            name,
            slug,
            tagline: tagline || null,
            description: description || null,
            ownerId: ownerUid,
            branding: { primaryColor, logoUrl: uploadedLogoUrl, accentColor: primaryColor },
            settings: { features: { communities: true, courses: true, successStories: true }, limits: { maxCommunities: 50, maxCourses: 200, maxMembers: 100000 } },
            createdAt: serverTimestamp()
          });

          // Create owner membership for rules
          await setDoc(doc(db, "platforms", docRef.id, "members", ownerUid), {
            role: "owner",
            joinedAt: serverTimestamp(),
          });
          router.push(`/platforms/${slug}`);
        }}>Create Platform</Button>
      </div>
    </div>
  );
}



