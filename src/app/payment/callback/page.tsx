"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, query, where, getDocs, serverTimestamp, setDoc, updateDoc, increment } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const platformId = searchParams.get("platform") || "";
  const communityId = searchParams.get("community") || "";
  const membershipTypeId = searchParams.get("membershipType") || "";
  const paymentType = searchParams.get("paymentType") || "";
  const status = searchParams.get("status") || "";

  useEffect(() => {
    (async () => {
      if (status === "success" && platformId && user?.id && (communityId || membershipTypeId)) {
        try {
          if (membershipTypeId) {
            // Handle membership type payment
            const membershipRef = doc(db, "platforms", platformId, "membershipTypes", membershipTypeId, "members", user.id);
            await setDoc(membershipRef, {
              userId: user.id,
              paymentType: paymentType,
              subscribedAt: serverTimestamp(),
              status: "active",
            });

            // Record the payment
            const paymentRef = doc(collection(db, "platforms", platformId, "payments"));
            await setDoc(paymentRef, {
              userId: user.id,
              membershipTypeId: membershipTypeId,
              paymentType: paymentType,
              status: "completed",
              amount: 0, // Will be updated from Midtrans callback if available
              currency: "IDR",
              completedAt: serverTimestamp(),
            });

            toast.success("Membership activated! You now have access to this membership type.");
          } else if (communityId) {
            // Handle community payment
            // Create or update membership
            const memberRef = doc(db, "platforms", platformId, "members", user.id);
            const memberDoc = await getDoc(memberRef);

            let isNewMember = false;
            if (memberDoc.exists()) {
              // Update existing membership
              const memberData = memberDoc.data();
              const communities = memberData.communities || [];
              if (!communities.includes(communityId)) {
                communities.push(communityId);
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
                communities: [communityId],
                joinedAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
              });
            }
            
            // Increment member count for the community if this is a new member
            if (isNewMember) {
              try {
                const communityRef = doc(db, "platforms", platformId, "communities", communityId);
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

            // Also record the payment
            const paymentRef = doc(collection(db, "platforms", platformId, "payments"));
            await setDoc(paymentRef, {
              userId: user.id,
              communityId,
              status: "completed",
              amount: 2999000,
              currency: "IDR",
              completedAt: serverTimestamp(),
            });

            toast.success("Access granted! You can now access the community.");
          }
        } catch (error) {
          console.error("Failed to grant access:", error);
          toast.error("Failed to grant access. Please contact support.");
        }
      }
    })();
  }, [status, platformId, communityId, membershipTypeId, paymentType, user?.id]);

  const handleContinue = async () => {
    if (membershipTypeId && platformId) {
      // Get platform slug to redirect properly
      try {
        const platformDoc = await getDoc(doc(db, "platforms", platformId));
        if (platformDoc.exists()) {
          const platformData = platformDoc.data() as any;
          const slug = platformData.slug || platformId;
          router.push(`/platforms/${slug}/membership`);
        } else {
          router.push("/platforms");
        }
      } catch (error) {
        console.error("Error fetching platform:", error);
        router.push("/platforms");
      }
    } else if (platformId && communityId) {
      // Get platform slug to redirect properly
      try {
        const platformDoc = await getDoc(doc(db, "platforms", platformId));
        if (platformDoc.exists()) {
          const platformData = platformDoc.data() as any;
          const slug = platformData.slug || platformId;
          router.push(`/platforms/${slug}/communities/${communityId}`);
        } else {
          router.push("/platforms");
        }
      } catch (error) {
        console.error("Error fetching platform:", error);
        router.push("/platforms");
      }
    } else {
      router.push("/platforms");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          {status === "success" ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
            </>
          ) : status === "pending" ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl text-yellow-600">Payment Pending</CardTitle>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">Payment Failed</CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {status === "success" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {membershipTypeId 
                  ? "Your payment has been processed successfully. Your membership has been activated!"
                  : "Your payment has been processed successfully. You now have full access to the community!"}
              </p>
              <Button onClick={handleContinue} size="lg" className="w-full">
                {membershipTypeId ? "Go to Membership" : "Go to Community"}
              </Button>
            </div>
          )}
          {status === "pending" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your payment is being processed. We'll notify you once it's confirmed.
              </p>
              <Button onClick={handleContinue} variant="outline" size="lg" className="w-full">
                {membershipTypeId ? "Go to Membership" : "Go to Community"}
              </Button>
            </div>
          )}
          {status !== "success" && status !== "pending" && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                There was an issue processing your payment. Please try again.
              </p>
              <Button onClick={() => router.push("/payment")} size="lg" className="w-full">
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  );
}
