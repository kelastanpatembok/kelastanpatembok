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
    const { platformId, communityId, userId, userName, userEmail, amount } = body;

    if (!platformId || !communityId || !userId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate shorter order ID (max 50 chars for Midtrans)
    const shortPlatformId = platformId.substring(0, 8);
    const shortCommunityId = communityId.substring(0, 8);
    const shortUserId = userId.substring(0, 8);
    const timestamp = Date.now().toString().slice(-8);
    const orderId = `${shortPlatformId}-${shortCommunityId}-${shortUserId}-${timestamp}`;
    
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
          id: communityId,
          price: amount,
          quantity: 1,
          name: `Community Access`,
          category: "Community Subscription",
        },
      ],
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/callback?platform=${platformId}&community=${communityId}`,
        unfinish: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/callback?platform=${platformId}&community=${communityId}`,
        error: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/callback?platform=${platformId}&community=${communityId}`,
      },
      custom_field1: JSON.stringify({ platformId, communityId, userId }),
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

