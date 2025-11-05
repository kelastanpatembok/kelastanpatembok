"use client";

import { use as reactUse, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import Link from "next/link";

export default function CreateMembershipTypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const router = useRouter();
  const { user } = useAuth();
  const [platform, setPlatform] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeIcon, setTypeIcon] = useState("");
  const [typeDescription, setTypeDescription] = useState("");
  const [typePriceOneTime, setTypePriceOneTime] = useState("");
  const [typePriceInstallment, setTypePriceInstallment] = useState("");
  const [typeInstallmentMonthCount, setTypeInstallmentMonthCount] = useState("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoCodeType, setPromoCodeType] = useState<"percentage" | "amount">("percentage");
  const [promoCodeValue, setPromoCodeValue] = useState<number>(0);
  const [promoCode2, setPromoCode2] = useState<string>("");
  const [promoCode2Type, setPromoCode2Type] = useState<"percentage" | "amount">("percentage");
  const [promoCode2Value, setPromoCode2Value] = useState<number>(0);
  const [promoCode3, setPromoCode3] = useState<string>("");
  const [promoCode3Type, setPromoCode3Type] = useState<"percentage" | "amount">("percentage");
  const [promoCode3Value, setPromoCode3Value] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } as any : null;
        setPlatform(p);

        if (!p) {
          setLoading(false);
          return;
        }

        const u: any = user;
        const pid = (p as any).ownerId;
        const isOwnerCheck = !!(u && pid && (pid === u.uid || pid === u.id));
        setIsOwner(isOwnerCheck);

        setLoading(false);
      } catch (error) {
        console.error("Error loading platform:", error);
        setLoading(false);
      }
    })();
  }, [slug, user]);

  async function handleSave() {
    if (!platform || !isOwner || !typeName.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      // Get existing membership types count to set order
      const existingTypesSnap = await getDocs(collection(db, "platforms", platform.id, "membershipTypes"));
      const existingTypes = existingTypesSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        order: d.data().order !== undefined ? d.data().order : Number.MAX_SAFE_INTEGER
      })) as any[];
      const maxOrder = existingTypes.length > 0 ? Math.max(...existingTypes.map(t => t.order !== undefined && t.order !== Number.MAX_SAFE_INTEGER ? t.order : -1)) : -1;
      const newOrder = maxOrder + 1;

      const priceOneTimeValue = typePriceOneTime.trim() ? parseFloat(typePriceOneTime.trim()) : null;
      const priceInstallmentValue = typePriceInstallment.trim() ? parseFloat(typePriceInstallment.trim()) : null;
      const installmentMonthCountValue = typeInstallmentMonthCount.trim() ? parseInt(typeInstallmentMonthCount.trim()) : null;
      
      const typeData: any = {
        name: typeName.trim(),
        icon: typeIcon.trim() || "",
        description: typeDescription.trim() || "",
        order: newOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (priceOneTimeValue !== null && !isNaN(priceOneTimeValue) && priceOneTimeValue > 0) {
        typeData.priceOneTime = priceOneTimeValue;
      }

      if (priceInstallmentValue !== null && !isNaN(priceInstallmentValue) && priceInstallmentValue > 0) {
        typeData.priceInstallment = priceInstallmentValue;
      }

      if (installmentMonthCountValue !== null && !isNaN(installmentMonthCountValue) && installmentMonthCountValue > 0) {
        typeData.installmentMonthCount = installmentMonthCountValue;
      }

      // Save promo codes
      if (promoCode.trim()) {
        typeData.promoCode = promoCode.trim().toUpperCase();
        typeData.promoCodeType = promoCodeType;
        typeData.promoCodeValue = promoCodeValue;
      }

      if (promoCode2.trim()) {
        typeData.promoCode2 = promoCode2.trim().toUpperCase();
        typeData.promoCode2Type = promoCode2Type;
        typeData.promoCode2Value = promoCode2Value;
      }

      if (promoCode3.trim()) {
        typeData.promoCode3 = promoCode3.trim().toUpperCase();
        typeData.promoCode3Type = promoCode3Type;
        typeData.promoCode3Value = promoCode3Value;
      }

      await addDoc(collection(db, "platforms", platform.id, "membershipTypes"), typeData);
      toast.success("Membership type created");
      router.push(`/platforms/${slug}/membership`);
    } catch (error: any) {
      console.error("Error saving membership type:", error);
      toast.error("Failed to save membership type: " + (error?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <div className="text-center">
          <p>Platform not found</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <div className="text-center">
          <p>You don't have permission to create membership types</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Platforms", href: "/platforms" },
          { label: platform.name || slug, href: `/platforms/${slug}` },
          { label: "Membership", href: `/platforms/${slug}/membership` },
          { label: "Create Membership Type" },
        ]}
      />

      <div className="flex items-center gap-4">
        <Link href={`/platforms/${slug}/membership`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Create Membership Type</h1>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="space-y-4 p-6 border rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="typeName">Name *</Label>
            <Input
              id="typeName"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="e.g., Premium, Basic, Pro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="typeIcon">Icon (Emoji)</Label>
            <Input
              id="typeIcon"
              value={typeIcon}
              onChange={(e) => setTypeIcon(e.target.value)}
              placeholder="e.g., ⭐, 💎, 🎯"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">Enter an emoji or character (up to 3 characters)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="typeDescription">Description</Label>
            <Textarea
              id="typeDescription"
              value={typeDescription}
              onChange={(e) => setTypeDescription(e.target.value)}
              placeholder="Describe this membership type..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="typePriceOneTime">Price One Time Payment</Label>
            <Input
              id="typePriceOneTime"
              type="number"
              value={typePriceOneTime}
              onChange={(e) => setTypePriceOneTime(e.target.value)}
              placeholder="e.g., 100000"
              min="0"
              step="1"
            />
            <p className="text-xs text-muted-foreground">Enter the price in IDR</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="typePriceInstallment">Price Installment</Label>
            <Input
              id="typePriceInstallment"
              type="number"
              value={typePriceInstallment}
              onChange={(e) => setTypePriceInstallment(e.target.value)}
              placeholder="e.g., 50000"
              min="0"
              step="1"
            />
            <p className="text-xs text-muted-foreground">Enter the monthly price in IDR / bulan</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="typeInstallmentMonthCount">Installment Month Count</Label>
            <Input
              id="typeInstallmentMonthCount"
              type="number"
              value={typeInstallmentMonthCount}
              onChange={(e) => setTypeInstallmentMonthCount(e.target.value)}
              placeholder="e.g., 12"
              min="1"
              step="1"
            />
            <p className="text-xs text-muted-foreground">Enter the number of months for installment payment</p>
          </div>

          <div className="pt-4 border-t space-y-4">
            <h3 className="font-semibold">Promo Codes</h3>
            
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
          </div>
        </div>

        <div className="flex gap-4">
          <Link href={`/platforms/${slug}/membership`}>
            <Button variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving || !typeName.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
