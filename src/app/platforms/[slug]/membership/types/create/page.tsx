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
