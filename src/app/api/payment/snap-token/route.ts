import { NextRequest, NextResponse } from "next/server";
import midtransClient from "midtrans-client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    
    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY is not set in environment variables");
      return NextResponse.json(
        { error: "Payment gateway configuration error. Please contact support." },
        { status: 500 }
      );
    }

    const snap = new midtransClient.Snap({
      isProduction: false, // Change to true for production
      serverKey: serverKey,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
    });

    const body = await request.json();
    const { platformId, communityId, membershipTypeId, paymentType, userId, userName, userEmail, amount } = body;

    // Validate required fields - either communityId or membershipTypeId must be present
    if (!platformId || !userId || !amount || (!communityId && !membershipTypeId)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate shorter order ID (max 50 chars for Midtrans)
    const shortPlatformId = platformId.substring(0, 8);
    const shortUserId = userId.substring(0, 8);
    const timestamp = Date.now().toString().slice(-8);
    
    let orderId: string;
    let itemName: string;
    let itemId: string;
    let callbackParams: string;
    
    if (membershipTypeId) {
      // Membership type payment
      const shortMembershipTypeId = membershipTypeId.substring(0, 8);
      orderId = `${shortPlatformId}-mtype-${shortMembershipTypeId}-${shortUserId}-${timestamp}`;
      itemName = `Membership Subscription`;
      itemId = membershipTypeId;
      callbackParams = `platform=${platformId}&membershipType=${membershipTypeId}&paymentType=${paymentType || 'oneTime'}`;
    } else {
      // Community payment
      const shortCommunityId = communityId.substring(0, 8);
      orderId = `${shortPlatformId}-${shortCommunityId}-${shortUserId}-${timestamp}`;
      itemName = `Community Access`;
      itemId = communityId;
      callbackParams = `platform=${platformId}&community=${communityId}`;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: userName || "Customer",
        email: userEmail || "customer@example.com",
      },
      item_details: [
        {
          id: itemId,
          price: amount,
          quantity: 1,
          name: itemName,
          category: membershipTypeId ? "Membership Subscription" : "Community Subscription",
        },
      ],
      callbacks: {
        finish: `${baseUrl}/payment/callback?${callbackParams}`,
        unfinish: `${baseUrl}/payment/callback?${callbackParams}`,
        error: `${baseUrl}/payment/callback?${callbackParams}`,
      },
      custom_field1: JSON.stringify({ 
        platformId, 
        communityId: communityId || null,
        membershipTypeId: membershipTypeId || null,
        paymentType: paymentType || null,
        userId 
      }),
    };

    const transaction = await snap.createTransaction(parameter);
    
    return NextResponse.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error: any) {
    console.error("Midtrans Snap error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment token" },
      { status: 500 }
    );
  }
}

