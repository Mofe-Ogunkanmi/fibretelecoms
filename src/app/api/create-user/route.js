import { NextResponse } from "next/server";
import fetch from "node-fetch";

export async function POST(request) {
  try {
    const { uid, name } = await request.json();

    if (!uid || !name) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // CometChat API details from environment variables
    const COMETCHAT_APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID;
    const COMETCHAT_REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION;
    const COMETCHAT_AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;
    const COMETCHAT_API_URL = `https://${COMETCHAT_APP_ID}.api-${COMETCHAT_REGION}.cometchat.io/v3`;

    // Create user in CometChat
    const response = await fetch(`${COMETCHAT_API_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: COMETCHAT_AUTH_KEY,
        Accept: "application/json",
      },
      body: JSON.stringify({
        uid: uid,
        name: name,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to create user in CometChat" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
