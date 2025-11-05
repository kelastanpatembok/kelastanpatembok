"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Lock, Loader2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, query, where, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const platformSlug = searchParams.get("platform") || "";
  const communityId = searchParams.get("community") || "";
  const membershipTypeId = searchParams.get("membershipType") || "";
  const paymentType = searchParams.get("paymentType") || "";
  
  const [platform, setPlatform] = useState<any>(null);
  const [community, setCommunity] = useState<any>(null);
  const [membershipType, setMembershipType] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        if (!platformSlug) {
          toast.error("Missing platform information");
          setLoading(false);
          return;
        }

        if (!communityId && !membershipTypeId) {
          toast.error("Missing community or membership type information");
          setLoading(false);
          return;
        }

        // Fetch platform
        const ps = await getDocs(query(collection(db, "platforms"), where("slug", "==", platformSlug), limit(1)) as any);
        const p = ps.docs[0] ? { id: ps.docs[0].id, ...(ps.docs[0].data() as Record<string, any>) } : null;
        setPlatform(p);

        if (p) {
          if (communityId) {
            // Fetch community
            const commDoc = await getDoc(doc(db, "platforms", p.id as string, "communities", communityId));
            const comm = commDoc.exists() ? ({ id: commDoc.id, ...commDoc.data() } as any) : null;
            setCommunity(comm);
          } else if (membershipTypeId) {
            // Fetch membership type
            const typeDoc = await getDoc(doc(db, "platforms", p.id as string, "membershipTypes", membershipTypeId));
            const type = typeDoc.exists() ? ({ id: typeDoc.id, ...typeDoc.data() } as any) : null;
            setMembershipType(type);
          }
        }
      } catch (e) {
        console.error("Failed to load info", e);
        toast.error("Failed to load information");
      } finally {
        setLoading(false);
      }
    })();
  }, [platformSlug, communityId, membershipTypeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!platform || (!community && !membershipType)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{membershipTypeId ? "Membership type" : "Community"} not found</p>
      </div>
    );
  }

  // Determine amount based on payment type
  const getAmount = () => {
    if (membershipType) {
      if (paymentType === "oneTime") {
        return membershipType.priceOneTime || 0;
      } else if (paymentType === "installment") {
        return membershipType.priceInstallment || 0;
      }
      // Default to one time if available, otherwise installment
      return membershipType.priceOneTime || membershipType.priceInstallment || 0;
    }
    return community?.monthlyPrice || 0;
  };

  const baseAmount = getAmount();

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Platforms", href: "/platforms" },
          { label: platform.name || platformSlug, href: `/platforms/${platformSlug}` },
          ...(membershipType
            ? [
                { label: "Membership", href: `/platforms/${platformSlug}/membership` },
              ]
            : community
            ? [
                {
                  label: community.name,
                  href: `/platforms/${platformSlug}/communities/${community.id}`,
                },
              ]
            : []),
          { label: "Payment" },
        ]}
      />
      
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Complete Your Subscription</h1>
          <p className="text-muted-foreground">
            {membershipType ? `Subscribe to ${membershipType.name}` : `Unlock access to ${community.name}`}
          </p>
        </div>

        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Subscription Details
          </CardTitle>
          <CardDescription>
            {membershipType ? (
              <>You're subscribing to <strong>{membershipType.name}</strong> membership on <strong>{platformSlug}</strong></>
            ) : (
              <>You're subscribing to access the <strong>{community.name}</strong> community on <strong>{platformSlug}</strong></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {membershipType?.icon && (
                  <span className="text-2xl">{membershipType.icon}</span>
                )}
                <span className="font-medium">{membershipType ? membershipType.name : community.name}</span>
              </div>
              <Badge>Premium</Badge>
            </div>
            {membershipType?.description ? (
              <div>
                <span className="text-sm font-bold text-foreground">Benefit:</span>
                <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
                  {membershipType.description}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{community.description || "Exclusive community access"}</p>
            )}
          </div>

          <div className="space-y-4 pt-4">
            {membershipType ? (
              <div className="space-y-2">
                <h3 className="font-semibold">Payment Details:</h3>
                {paymentType === "oneTime" && membershipType.priceOneTime && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm font-medium">One Time Payment</span>
                    <span className="text-lg font-semibold">
                      Rp {membershipType.priceOneTime.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
                {paymentType === "installment" && membershipType.priceInstallment && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="text-sm font-medium">Installment Payment</span>
                      {membershipType.installmentMonthCount && (
                        <p className="text-xs text-muted-foreground">
                          {membershipType.installmentMonthCount} bulan
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-semibold">
                      Rp {membershipType.priceInstallment.toLocaleString('id-ID')} / bulan
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <h3 className="font-semibold">What's included:</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">Full access to all courses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">Community discussions and posts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">Priority support</span>
                  </div>
                </div>
                {community.monthlyPrice && community.monthlyPrice > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-lg font-semibold text-right">
                      Rp {community.monthlyPrice.toLocaleString('id-ID')}
                      <span className="text-sm text-muted-foreground font-normal"> /month</span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-6 border-t space-y-4">
            {((community && (community.promoCode || community.promoCode2 || community.promoCode3)) || 
              (membershipType && (membershipType.promoCode || membershipType.promoCode2 || membershipType.promoCode3))) && (
              <div className="space-y-2">
                <Label>Have a promo code?</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={promoCodeInput} 
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    maxLength={4}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!promoCodeInput.trim()) {
                        toast.error("Please enter a promo code");
                        return;
                      }
                      
                      const inputCode = promoCodeInput.trim().toUpperCase();
                      let discount = 0;
                      let matchedPromo = null;
                      
                      // Check promo code from membershipType or community
                      const source = membershipType || community;
                      
                      // Check promo code 1
                      if (source.promoCode && inputCode === source.promoCode.toUpperCase()) {
                        matchedPromo = {
                          type: source.promoCodeType || "percentage",
                          value: source.promoCodeValue || 0
                        };
                      }
                      // Check promo code 2
                      else if (source.promoCode2 && inputCode === source.promoCode2.toUpperCase()) {
                        matchedPromo = {
                          type: source.promoCode2Type || "percentage",
                          value: source.promoCode2Value || 0
                        };
                      }
                      // Check promo code 3
                      else if (source.promoCode3 && inputCode === source.promoCode3.toUpperCase()) {
                        matchedPromo = {
                          type: source.promoCode3Type || "percentage",
                          value: source.promoCode3Value || 0
                        };
                      }
                      
                      if (matchedPromo) {
                        if (matchedPromo.type === "percentage") {
                          discount = Math.round((baseAmount * matchedPromo.value) / 100);
                        } else {
                          discount = matchedPromo.value;
                        }
                        setAppliedDiscount(discount);
                        toast.success(`Promo code applied! Discount: Rp ${discount.toLocaleString('id-ID')}`);
                      } else {
                        toast.error("Invalid promo code");
                      }
                    }}
                  >
                    <Tag className="h-4 w-4 mr-2" />
                    Apply
                  </Button>
                </div>
              </div>
            )}
            {appliedDiscount > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Discount applied: <strong>-Rp {appliedDiscount.toLocaleString('id-ID')}</strong>
                </p>
              </div>
            )}
            <div className="pt-4">
              <Button 
                size="lg" 
                className="w-full" 
                disabled={processing || !user}
                onClick={async () => {
                  if (!user) {
                    toast.error("Please log in first");
                    return;
                  }

                  setProcessing(true);
                  try {
                    // Calculate final amount with discount
                    const finalAmount = Math.max(0, baseAmount - appliedDiscount);
                    
                    // If discount is 100% (final amount is 0), grant access directly without payment gateway
                    if (finalAmount === 0) {
                      try {
                        if (membershipType) {
                          // Create membership in membership type subcollection
                          const membershipRef = doc(db, "platforms", platform.id, "membershipTypes", membershipType.id, "members", user.id);
                          await setDoc(membershipRef, {
                            userId: user.id,
                            paymentType: paymentType,
                            subscribedAt: serverTimestamp(),
                            status: "active",
                          });

                          // Record the payment with 0 amount
                          const paymentRef = doc(collection(db, "platforms", platform.id, "payments"));
                          await setDoc(paymentRef, {
                            userId: user.id,
                            membershipTypeId: membershipType.id,
                            paymentType: paymentType,
                            status: "completed",
                            amount: 0,
                            currency: "IDR",
                            promoCode: promoCodeInput.trim() ? promoCodeInput.trim().toUpperCase() : null,
                            completedAt: serverTimestamp(),
                          });

                          toast.success("Membership activated! You now have access to this membership type.");
                          setProcessing(false);
                          router.push(`/platforms/${platformSlug}/membership`);
                          return;
                        } else {
                          // Create or update membership for community
                          const memberRef = doc(db, "platforms", platform.id, "members", user.id);
                          const memberDoc = await getDoc(memberRef);

                          let isNewMember = false;
                          if (memberDoc.exists()) {
                            // Update existing membership
                            const memberData = memberDoc.data();
                            const communities = memberData.communities || [];
                            if (!communities.includes(community.id)) {
                              communities.push(community.id);
                              isNewMember = true;
                            }
                            
                            await setDoc(memberRef, {
                              communities,
                              lastUpdated: serverTimestamp(),
                            }, { merge: true });
                          } else {
                            // Create new membership
                            isNewMember = true;
                            await setDoc(memberRef, {
                              role: "member",
                              communities: [community.id],
                              joinedAt: serverTimestamp(),
                              lastUpdated: serverTimestamp(),
                            });
                          }
                          
                          // Increment member count for the community if this is a new member
                          if (isNewMember) {
                            try {
                              const communityRef = doc(db, "platforms", platform.id, "communities", community.id);
                              const communityDoc = await getDoc(communityRef);
                              const currentCount = communityDoc.exists() ? ((communityDoc.data()?.memberCount as number) || 0) : 0;
                              const newCount = currentCount + 1;
                              console.log(`Incrementing memberCount from ${currentCount} to ${newCount}`);
                              await updateDoc(communityRef, { memberCount: newCount });
                              console.log(`Successfully updated memberCount to ${newCount}`);
                            } catch (e: any) {
                              // Log error but continue anyway (not critical)
                              console.error("Failed to increment member count:", e);
                              console.error("Error details:", e.message, e.code);
                              // Still continue to grant access even if memberCount increment fails
                            }
                          }

                          // Record the payment with 0 amount
                          const paymentRef = doc(collection(db, "platforms", platform.id, "payments"));
                          await setDoc(paymentRef, {
                            userId: user.id,
                            communityId: community.id,
                            status: "completed",
                            amount: 0,
                            currency: "IDR",
                            promoCode: promoCodeInput.trim().toUpperCase(),
                            completedAt: serverTimestamp(),
                          });

                          toast.success("Access granted! You now have full access to the community.");
                          setProcessing(false);
                          router.push(`/platforms/${platformSlug}/communities/${community.id}`);
                          return;
                        }
                      } catch (error: any) {
                        console.error("Failed to grant access:", error);
                        toast.error("Failed to grant access. Please contact support.");
                        setProcessing(false);
                        return;
                      }
                    }
                    
                    // If amount > 0, proceed with payment gateway
                    // Get Snap token from API
                    const response = await fetch("/api/payment/snap-token", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        platformId: platform.id,
                        communityId: communityId || null,
                        membershipTypeId: membershipTypeId || null,
                        paymentType: membershipTypeId ? paymentType : null,
                        userId: user.id,
                        userName: user.name,
                        userEmail: (user as any).email || "",
                        amount: finalAmount,
                      }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(data.error || "Failed to create payment");
                    }

                    // Load Midtrans Snap script
                    const script = document.createElement("script");
                    script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
                    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "");
                    script.onload = () => {
                      // Initialize Snap
                      (window as any).snap.pay(data.token, {
                        onSuccess: (result: any) => {
                          console.log("Payment success:", result);
                          toast.success("Payment successful! Redirecting...");
                          if (membershipTypeId) {
                            router.push(`/payment/callback?platform=${platform.id}&membershipType=${membershipTypeId}&paymentType=${paymentType}&status=success`);
                          } else {
                            router.push(`/payment/callback?platform=${platform.id}&community=${community.id}&status=success`);
                          }
                        },
                        onPending: (result: any) => {
                          console.log("Payment pending:", result);
                          toast.info("Payment is pending. Redirecting...");
                          if (membershipTypeId) {
                            router.push(`/payment/callback?platform=${platform.id}&membershipType=${membershipTypeId}&paymentType=${paymentType}&status=pending`);
                          } else {
                            router.push(`/payment/callback?platform=${platform.id}&community=${community.id}&status=pending`);
                          }
                        },
                        onError: (result: any) => {
                          console.error("Payment error:", result);
                          toast.error("Payment failed. Please try again.");
                          setProcessing(false);
                        },
                        onClose: () => {
                          console.log("Payment popup closed");
                          setProcessing(false);
                        },
                      });
                    };
                    script.onerror = () => {
                      toast.error("Failed to load payment gateway");
                      setProcessing(false);
                    };
                    document.body.appendChild(script);
                  } catch (error: any) {
                    console.error("Payment error:", error);
                    toast.error(error.message || "Failed to process payment");
                    setProcessing(false);
                  }
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Complete Payment • Rp ${(Math.max(0, baseAmount - appliedDiscount)).toLocaleString('id-ID')}`
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                By completing payment, you agree to our terms of service
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
