"use client";

import { use as reactUse, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { db, storage, auth } from "@/lib/firebase";
import { collection, doc, getDocs, limit, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/auth-provider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Params = { params: Promise<{ slug: string }> };

export default function EditPlatformPage({ params }: Params) {
  const { slug } = reactUse(params);
  const router = useRouter();
  const { user } = useAuth();
  const [platform, setPlatform] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#66b132");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
        const p: any = ps.docs[0] ? { id: ps.docs[0].id, ...(ps.docs[0].data() as Record<string, any>) } : null;
        
        if (!p) {
          setLoading(false);
          return;
        }

        // Check if user is owner
        const u: any = user;
        const pid = p.ownerId;
        const isOwner = !!(u && pid && (pid === u.uid || pid === u.id));
        
        if (!isOwner) {
          setLoading(false);
          return;
        }

        setPlatform(p);
        setName(p.name || "");
        setTagline(p.tagline || "");
        setDescription(p.description || "");
        setPrimaryColor((p.branding?.primaryColor) || "#66b132");
        setLogoUrl((p.branding?.logoUrl) || "");
        setLogoPreview((p.branding?.logoUrl) || "");
        setLoading(false);
      } catch (error) {
        console.error("Error loading platform:", error);
        setLoading(false);
      }
    })();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading platform…</span>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">Platform not found.</div>
    );
  }

  const u: any = user;
  const pid = (platform as any).ownerId;
  const isOwner = !!(u && pid && (pid === u.uid || pid === u.id));

  if (!isOwner) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">Only platform owner can edit platform information.</div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: name || slug, href: `/platforms/${slug}` }, { label: "Edit" }]} />
      <h1 className="text-2xl font-semibold">{name ? `Edit - ${name}` : "Edit Platform"}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Platform name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RWID Community" />
          </div>
          <div>
            <Label className="mb-1 block">Slug</Label>
            <Input value={slug} disabled className="bg-muted" />
            <p className="mt-1 text-xs text-muted-foreground">Slug cannot be changed after platform creation.</p>
          </div>
          <div>
            <Label className="mb-1 block">Tagline</Label>
            <Input 
              value={tagline} 
              onChange={(e) => setTagline(e.target.value)} 
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
              onChange={(e) => setDescription(e.target.value)} 
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
            <Input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16 p-1" />
          </div>
          <div>
            <Label className="mb-1 block">Logo (optional)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setLogoFile(f);
                if (f) {
                  const url = URL.createObjectURL(f);
                  setLogoPreview(url);
                } else {
                  setLogoPreview(logoUrl);
                }
              }}
            />
          </div>
          <div className="mt-2">
            <div className="text-sm font-medium mb-2">Preview</div>
            <div className="flex items-center gap-3 rounded-md border p-3" style={{ borderColor: primaryColor }}>
              <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0 border-2" style={{ borderColor: primaryColor }}>
                {(logoPreview || logoUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview || logoUrl} alt="logo" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="text-lg font-semibold" style={{ color: primaryColor }}>
                {name || "Platform Name"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button
          disabled={!name || saving}
          onClick={async () => {
            setSaving(true);
            try {
              let uploadedLogoUrl = logoUrl;

              if (logoFile) {
                try {
                  if (!auth.currentUser) {
                    toast.error("Please sign in to upload images");
                    throw new Error("No auth user for storage upload");
                  }
                  await auth.currentUser.getIdToken(true);
                  const ext = (logoFile.name.split('.').pop() || 'png').toLowerCase();
                  const path = `platforms/${slug}/branding/logo_${Date.now()}.${ext}`;
                  const storageRef = ref(storage, path);
                  await uploadBytes(storageRef, logoFile, { contentType: logoFile.type || `image/${ext}` });
                  uploadedLogoUrl = await getDownloadURL(storageRef);
                } catch (e) {
                  console.error("Logo upload failed", e);
                  toast.error("Logo upload failed. Other changes will still be saved.");
                }
              }

              await updateDoc(doc(db, "platforms", platform.id), {
                name,
                tagline: tagline || null,
                description: description || null,
                branding: {
                  ...(platform.branding || {}),
                  primaryColor,
                  logoUrl: uploadedLogoUrl,
                  accentColor: primaryColor,
                },
              });

              toast.success("Platform updated successfully!");
              router.push(`/platforms/${slug}`);
            } catch (error) {
              console.error("Error updating platform:", error);
              toast.error("Failed to update platform");
              setSaving(false);
            }
          }}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}

