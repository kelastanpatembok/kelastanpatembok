"use client";

import { use as reactUse, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Users, Trash2, MoreVertical, Plus, Pencil, ChevronUp, ChevronDown, CreditCard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

export default function MembershipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const router = useRouter();
  const { user } = useAuth();
  const [platform, setPlatform] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [membershipTypes, setMembershipTypes] = useState<any[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<Record<string, boolean>>({});
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        // Get platform
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", slug), limit(1)));
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...ps.docs[0].data() } as any : null;
        setPlatform(p);

        if (!p) {
          setLoading(false);
          return;
        }

        // Check if user is owner
        const u: any = user;
        const pid = (p as any).ownerId;
        const isOwnerCheck = !!(u && pid && (pid === u.uid || pid === u.id));
        setIsOwner(isOwnerCheck);

        // Load membership types
        try {
          const typesSnap = await getDocs(collection(db, "platforms", p.id as string, "membershipTypes"));
          const typesList = typesSnap.docs.map((d, index) => ({
            id: d.id,
            ...d.data(),
            order: d.data().order !== undefined ? d.data().order : index
          })) as any[];
          // Sort by order field
          typesList.sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : Number.MAX_SAFE_INTEGER;
            const orderB = b.order !== undefined ? b.order : Number.MAX_SAFE_INTEGER;
            return orderA - orderB;
          });
          setMembershipTypes(typesList);

          // Check membership status for each type if user is logged in
          if (u && (u.uid || u.id)) {
            const userId = u.uid || u.id;
            const statusMap: Record<string, boolean> = {};
            
            for (const type of typesList) {
              try {
                const memberDoc = await getDoc(doc(db, "platforms", p.id as string, "membershipTypes", type.id, "members", userId));
                statusMap[type.id] = memberDoc.exists();
              } catch (error) {
                console.error(`Error checking membership status for type ${type.id}:`, error);
                statusMap[type.id] = false;
              }
            }
            
            setMembershipStatus(statusMap);
          }
        } catch (error) {
          console.error("Error loading membership types:", error);
          setMembershipTypes([]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading membership:", error);
        setLoading(false);
      }
    })();
  }, [slug, user]);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  async function handleDeleteMembershipType(typeId: string) {
    if (!platform || !isOwner) return;

    try {
      await deleteDoc(doc(db, "platforms", platform.id, "membershipTypes", typeId));
      setMembershipTypes(types => types.filter(t => t.id !== typeId));
      toast.success("Membership type deleted");
    } catch (error: any) {
      console.error("Error deleting membership type:", error);
      toast.error("Failed to delete membership type: " + (error?.message || "Unknown error"));
    }
  }

  async function handleMoveUp(typeId: string) {
    if (!platform || !isOwner) return;

    const currentIndex = membershipTypes.findIndex(t => t.id === typeId);
    if (currentIndex <= 0) return; // Already at the top

    try {
      const prevType = membershipTypes[currentIndex - 1];
      const currentType = membershipTypes[currentIndex];

      // Swap orders
      const prevOrder = prevType.order !== undefined ? prevType.order : currentIndex - 1;
      const currentOrder = currentType.order !== undefined ? currentType.order : currentIndex;

      await Promise.all([
        updateDoc(doc(db, "platforms", platform.id, "membershipTypes", prevType.id), {
          order: currentOrder
        }),
        updateDoc(doc(db, "platforms", platform.id, "membershipTypes", currentType.id), {
          order: prevOrder
        })
      ]);

      // Update local state
      const updated = [...membershipTypes];
      [updated[currentIndex - 1], updated[currentIndex]] = [updated[currentIndex], updated[currentIndex - 1]];
      updated[currentIndex - 1].order = prevOrder;
      updated[currentIndex].order = currentOrder;
      setMembershipTypes(updated);
    } catch (error: any) {
      console.error("Error reordering membership type:", error);
      toast.error("Failed to reorder: " + (error?.message || "Unknown error"));
    }
  }

  async function handleMoveDown(typeId: string) {
    if (!platform || !isOwner) return;

    const currentIndex = membershipTypes.findIndex(t => t.id === typeId);
    if (currentIndex < 0 || currentIndex >= membershipTypes.length - 1) return; // Already at the bottom

    try {
      const currentType = membershipTypes[currentIndex];
      const nextType = membershipTypes[currentIndex + 1];

      // Swap orders
      const currentOrder = currentType.order !== undefined ? currentType.order : currentIndex;
      const nextOrder = nextType.order !== undefined ? nextType.order : currentIndex + 1;

      await Promise.all([
        updateDoc(doc(db, "platforms", platform.id, "membershipTypes", currentType.id), {
          order: nextOrder
        }),
        updateDoc(doc(db, "platforms", platform.id, "membershipTypes", nextType.id), {
          order: currentOrder
        })
      ]);

      // Update local state
      const updated = [...membershipTypes];
      [updated[currentIndex], updated[currentIndex + 1]] = [updated[currentIndex + 1], updated[currentIndex]];
      updated[currentIndex].order = nextOrder;
      updated[currentIndex + 1].order = currentOrder;
      setMembershipTypes(updated);
    } catch (error: any) {
      console.error("Error reordering membership type:", error);
      toast.error("Failed to reorder: " + (error?.message || "Unknown error"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!platform) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>Platform not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Membership</h1>
        </div>
        {isOwner && (
          <Link href={`/platforms/${slug}/membership/types/create`}>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Membership Type
            </Button>
          </Link>
        )}
      </div>

      {/* Membership Types Section */}
      {membershipTypes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Membership Types</h2>
          <div className="space-y-4">
            {membershipTypes.map((type, index) => (
              <div
                key={type.id}
                className="relative p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                {isOwner && (
                  <>
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveUp(type.id)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveDown(type.id)}
                        disabled={index === membershipTypes.length - 1}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/platforms/${slug}/membership/types/${type.id}/edit`)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteMembershipType(type.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                )}
                <div className={`flex items-start gap-3 ${isOwner ? "pl-10" : ""}`}>
                  {type.icon && (
                    <div className="text-2xl shrink-0">{type.icon}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{type.name}</h3>
                    {type.description && (
                      <div className="mt-1">
                        <span className="text-sm font-bold text-foreground">Benefit:</span>
                        <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{type.description}</div>
                      </div>
                    )}
                    {(type.priceOneTime || type.priceInstallment) && (
                      <div className="mt-2 space-y-1">
                        {type.priceOneTime && (
                          <p className="text-sm font-semibold text-foreground">
                            Price One Time Payment: {formatPrice(type.priceOneTime)}
                          </p>
                        )}
                        {type.priceInstallment && (
                          <p className="text-sm font-semibold text-foreground">
                            Price Installment: {formatPrice(type.priceInstallment)} / bulan
                            {type.installmentMonthCount && ` (${type.installmentMonthCount} bulan)`}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Subscribe Button - Only show if user is logged in, not owner, and not already a member */}
                    {user && !isOwner && !membershipStatus[type.id] && (type.priceOneTime || type.priceInstallment) && (
                      <div className="mt-4">
                        <Dialog open={subscribeDialogOpen[type.id] || false} onOpenChange={(open) => setSubscribeDialogOpen(prev => ({ ...prev, [type.id]: open }))}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="w-full sm:w-auto">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Subscribe
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Choose Payment Type</DialogTitle>
                              <DialogDescription>
                                Select your preferred payment method for {type.name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 pt-4">
                              {type.priceOneTime && (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start h-auto py-4"
                                  onClick={() => {
                                    setSubscribeDialogOpen(prev => ({ ...prev, [type.id]: false }));
                                    router.push(`/payment?platform=${slug}&membershipType=${type.id}&paymentType=oneTime`);
                                  }}
                                >
                                  <div className="flex flex-col items-start flex-1">
                                    <span className="font-semibold">One Time Payment</span>
                                    <span className="text-sm text-muted-foreground">{formatPrice(type.priceOneTime)}</span>
                                  </div>
                                </Button>
                              )}
                              {type.priceInstallment && (
                                <Button
                                  variant="outline"
                                  className="w-full justify-start h-auto py-4"
                                  onClick={() => {
                                    setSubscribeDialogOpen(prev => ({ ...prev, [type.id]: false }));
                                    router.push(`/payment?platform=${slug}&membershipType=${type.id}&paymentType=installment`);
                                  }}
                                >
                                  <div className="flex flex-col items-start flex-1">
                                    <span className="font-semibold">Installment Payment</span>
                                    <span className="text-sm text-muted-foreground">
                                      {formatPrice(type.priceInstallment)} / bulan
                                      {type.installmentMonthCount && ` × ${type.installmentMonthCount} bulan`}
                                    </span>
                                  </div>
                                </Button>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                    {/* Already subscribed badge */}
                    {user && !isOwner && membershipStatus[type.id] && (
                      <div className="mt-4">
                        <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                          Already Subscribed
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
