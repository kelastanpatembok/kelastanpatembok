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
import { collection, doc, getDoc, getDocs, limit, query, setDoc, serverTimestamp, updateDoc, where } from "firebase/firestore";
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

type Params = { params: Promise<{ slug: string; id: string }> };

export default function EditCommunityPage({ params }: Params) {
  const { slug, id } = reactUse(params);
  const router = useRouter();
  const [platform, setPlatform] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#3b82f6");
  const [order, setOrder] = useState<number>(0);
  const [monthlyPrice, setMonthlyPrice] = useState<number>(0);
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoCodeType, setPromoCodeType] = useState<"percentage" | "amount">("percentage");
  const [promoCodeValue, setPromoCodeValue] = useState<number>(0);
  const [promoCode2, setPromoCode2] = useState<string>("");
  const [promoCode2Type, setPromoCode2Type] = useState<"percentage" | "amount">("percentage");
  const [promoCode2Value, setPromoCode2Value] = useState<number>(0);
  const [promoCode3, setPromoCode3] = useState<string>("");
  const [promoCode3Type, setPromoCode3Type] = useState<"percentage" | "amount">("percentage");
  const [promoCode3Value, setPromoCode3Value] = useState<number>(0);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mentorIds, setMentorIds] = useState<string[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorDialogOpen, setMentorDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
      const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } : null;
      setPlatform(p);
      if (!p) return;
      const c = await getDoc(doc(db, "platforms", p.id as string, "communities", id));
      if (c.exists()) {
        const data: any = { id: c.id, ...c.data() };
        setCommunity(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setAccent(data.accentColor || "#3b82f6");
        setOrder(data.order || 0);
        setMonthlyPrice(data.monthlyPrice || 0);
        setPromoCode(data.promoCode || "");
        setPromoCodeType(data.promoCodeType || "percentage");
        setPromoCodeValue(data.promoCodeValue || 0);
        setPromoCode2(data.promoCode2 || "");
        setPromoCode2Type(data.promoCode2Type || "percentage");
        setPromoCode2Value(data.promoCode2Value || 0);
        setPromoCode3(data.promoCode3 || "");
        setPromoCode3Type(data.promoCode3Type || "percentage");
        setPromoCode3Value(data.promoCode3Value || 0);
        setIconPreview(data.iconUrl || "");
        setMentorIds(data.mentorIds || []);
      }
    })();
  }, [slug, id]);

  // Load mentors data
  useEffect(() => {
    (async () => {
      if (mentorIds.length > 0) {
        const mentorsData: any[] = [];
        for (const mentorId of mentorIds) {
          try {
            const mentorDoc = await getDoc(doc(db, "users", mentorId));
            if (mentorDoc.exists()) {
              mentorsData.push({ id: mentorDoc.id, ...mentorDoc.data() });
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

  if (!platform || !community) return <div className="px-4 py-6 text-sm text-muted-foreground">Loading...</div>;

  const canEdit = auth.currentUser && platform.ownerId === auth.currentUser.uid;
  if (!canEdit) return <div className="px-4 py-6 text-sm text-muted-foreground">Only platform owner can edit a community.</div>;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-6">
      <Breadcrumbs items={[{ label: "Platforms", href: "/platforms" }, { label: platform?.name || slug, href: `/platforms/${slug}` }, { label: community.name }, { label: "Edit" }]} />
      <h1 className="text-2xl font-semibold">Edit community</h1>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Name</Label>
            <Input value={name} onChange={(e)=> setName(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block">Description</Label>
            <Textarea value={description} onChange={(e)=> setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block">Accent color</Label>
            <Input type="color" value={accent} onChange={(e)=> setAccent(e.target.value)} className="h-10 w-16 p-1" />
          </div>
          <div>
            <Label className="mb-1 block">Order</Label>
            <Input type="number" value={order} onChange={(e)=> setOrder(parseInt(e.target.value || "0", 10))} className="w-32" />
          </div>
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f = e.target.files?.[0] || null; setIconFile(f); setIconPreview(f ? URL.createObjectURL(f) : iconPreview); }} />
            <Button variant="outline" size="sm" onClick={()=> fileInputRef.current?.click()}>{iconFile ? "Change icon" : "Upload icon"}</Button>
            {iconPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconPreview} alt="icon" className="h-16 w-16 rounded object-cover border" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-1 block">Monthly Price (IDR)</Label>
            <Input 
              type="number" 
              value={monthlyPrice} 
              onChange={(e)=> setMonthlyPrice(parseInt(e.target.value || "0", 10))} 
              placeholder="e.g. 2999000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Discount</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-base font-semibold">Promo Code 1</Label>
            <div>
              <Label className="mb-1 block">Code</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={promoCode} 
                  onChange={(e)=> setPromoCode(e.target.value.toUpperCase())} 
                  placeholder="Auto-generated"
                  maxLength={4}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Generate code in pattern: LETTER-NUMBER-LETTER-NUMBER
                    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    const numbers = "0123456789";
                    
                    const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
                    const number1 = numbers.charAt(Math.floor(Math.random() * numbers.length));
                    const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
                    const number2 = numbers.charAt(Math.floor(Math.random() * numbers.length));
                    
                    setPromoCode(`${letter1}${number1}${letter2}${number2}`);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-1 block">Type</Label>
                <select 
                  value={promoCodeType} 
                  onChange={(e)=> setPromoCodeType(e.target.value as "percentage" | "amount")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Amount (IDR)</option>
                </select>
              </div>
              <div className="flex-1">
                <Label className="mb-1 block">Value</Label>
                <Input 
                  type="number" 
                  value={promoCodeValue} 
                  onChange={(e)=> setPromoCodeValue(parseFloat(e.target.value || "0"))} 
                  placeholder={promoCodeType === "percentage" ? "e.g. 10" : "e.g. 50000"}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-base font-semibold">Promo Code 2</Label>
            <div>
              <Label className="mb-1 block">Code</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={promoCode2} 
                  onChange={(e)=> setPromoCode2(e.target.value.toUpperCase())} 
                  placeholder="Auto-generated"
                  maxLength={4}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Generate code in pattern: LETTER-NUMBER-LETTER-NUMBER
                    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    const numbers = "0123456789";
                    
                    const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
                    const number1 = numbers.charAt(Math.floor(Math.random() * numbers.length));
                    const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
                    const number2 = numbers.charAt(Math.floor(Math.random() * numbers.length));
                    
                    setPromoCode2(`${letter1}${number1}${letter2}${number2}`);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-1 block">Type</Label>
                <select 
                  value={promoCode2Type} 
                  onChange={(e)=> setPromoCode2Type(e.target.value as "percentage" | "amount")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Amount (IDR)</option>
                </select>
              </div>
              <div className="flex-1">
                <Label className="mb-1 block">Value</Label>
                <Input 
                  type="number" 
                  value={promoCode2Value} 
                  onChange={(e)=> setPromoCode2Value(parseFloat(e.target.value || "0"))} 
                  placeholder={promoCode2Type === "percentage" ? "e.g. 10" : "e.g. 50000"}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-base font-semibold">Promo Code 3</Label>
            <div>
              <Label className="mb-1 block">Code</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={promoCode3} 
                  onChange={(e)=> setPromoCode3(e.target.value.toUpperCase())} 
                  placeholder="Auto-generated"
                  maxLength={4}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // Generate code in pattern: LETTER-NUMBER-LETTER-NUMBER
                    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
                    const numbers = "0123456789";
                    
                    const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
                    const number1 = numbers.charAt(Math.floor(Math.random() * numbers.length));
                    const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));
                    const number2 = numbers.charAt(Math.floor(Math.random() * numbers.length));
                    
                    setPromoCode3(`${letter1}${number1}${letter2}${number2}`);
                  }}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="mb-1 block">Type</Label>
                <select 
                  value={promoCode3Type} 
                  onChange={(e)=> setPromoCode3Type(e.target.value as "percentage" | "amount")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Amount (IDR)</option>
                </select>
              </div>
              <div className="flex-1">
                <Label className="mb-1 block">Value</Label>
                <Input 
                  type="number" 
                  value={promoCode3Value} 
                  onChange={(e)=> setPromoCode3Value(parseFloat(e.target.value || "0"))} 
                  placeholder={promoCode3Type === "percentage" ? "e.g. 10" : "e.g. 50000"}
                />
              </div>
            </div>
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
            Add mentors who can create posts and courses for this community
          </div>
          
          {/* Current Mentors */}
          {mentors.length > 0 && (
            <div className="space-y-2">
              <Label>Current Mentors</Label>
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
        <Button disabled={saving || !name} onClick={async ()=>{
          setSaving(true);
          
          // Ensure owner has membership for Storage rules BEFORE upload
          const uid = auth.currentUser?.uid;
          if (uid && platform && platform.ownerId === uid) {
            try {
              const membershipRef = doc(db, "platforms", platform.id as string, "members", uid);
              const membershipDoc = await getDoc(membershipRef);
              if (!membershipDoc.exists()) {
                console.log("Creating membership document for owner...");
                await setDoc(membershipRef, { 
                  role: "owner", 
                  joinedAt: serverTimestamp() 
                }, { merge: true });
                console.log("Membership document created successfully");
                // Wait a bit for Firestore to sync
                await new Promise(resolve => setTimeout(resolve, 300));
              } else {
                console.log("Membership document already exists");
              }
            } catch (err) {
              console.error("Error ensuring membership:", err);
            }
          } else {
            console.warn("User is not the owner of this platform");
          }
          
          const updates: any = { 
            name, 
            description, 
            accentColor: accent, 
            order: Number.isFinite(order) ? order : 0,
            monthlyPrice: Number.isFinite(monthlyPrice) ? monthlyPrice : 0,
            promoCode: promoCode || null,
            promoCodeType,
            promoCodeValue: Number.isFinite(promoCodeValue) ? promoCodeValue : 0,
            promoCode2: promoCode2 || null,
            promoCode2Type,
            promoCode2Value: Number.isFinite(promoCode2Value) ? promoCode2Value : 0,
            promoCode3: promoCode3 || null,
            promoCode3Type,
            promoCode3Value: Number.isFinite(promoCode3Value) ? promoCode3Value : 0,
            mentorIds: mentorIds,
          };
          
          // Preserve existing iconUrl if no new file is uploaded
          if (!iconFile && community?.iconUrl) {
            updates.iconUrl = community.iconUrl;
          }
          
          // Upload new icon if provided
          if (iconFile) {
            try {
              // Wait a bit to ensure membership doc is synced
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const ext = (iconFile.name.split('.').pop() || 'png').toLowerCase();
              const path = `platforms/${platform.id}/communities/${id}/icon.${ext}`;
              const storageRef = ref(storage, path);
              console.log("Uploading icon to path:", path);
              console.log("Platform ID:", platform.id);
              console.log("User ID:", uid);
              console.log("Platform owner ID:", platform.ownerId);
              
              await uploadBytes(storageRef, iconFile, { contentType: iconFile.type || `image/${ext}` });
              const downloadURL = await getDownloadURL(storageRef);
              updates.iconUrl = downloadURL;
              console.log("Icon uploaded successfully:", downloadURL);
            } catch (error) {
              console.error("Failed to upload icon:", error);
              console.error("Error details:", JSON.stringify(error, null, 2));
              alert(`Failed to upload icon: ${error instanceof Error ? error.message : 'Unknown error'}`);
              setSaving(false);
              return;
            }
          }
          
          await updateDoc(doc(db, "platforms", platform.id as string, "communities", id), updates);
          // Notify sidebars/dialogs to refresh without full reload
          try {
            window.dispatchEvent(new CustomEvent('community-updated'));
          } catch {}
          router.back();
        }}>Save Changes</Button>
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


