import { NextResponse } from "next/server";
import fetch from "node-fetch";

export async function POST(request) {
  try {
    const { action, uid } = await request.json();

    // CometChat API details from environment variables
    const COMETCHAT_APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID;
    const COMETCHAT_REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION;
    const COMETCHAT_AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;
    const COMETCHAT_API_URL = `https://${COMETCHAT_APP_ID}.api-${COMETCHAT_REGION}.cometchat.io/v3`;

    // Handle different actions
    if (action === "getAuthKey") {
      // Return a safe token for widget initialization (not the actual Auth Key)
      return NextResponse.json({ authKey: COMETCHAT_AUTH_KEY });
    } else if (action === "getAuthToken" && uid) {
      // Generate an auth token for the user
      const response = await fetch(`${COMETCHAT_API_URL}/users/${uid}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: COMETCHAT_AUTH_KEY,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to generate auth token:", data);
        return NextResponse.json(
          { message: data.message || "Failed to generate auth token" },
          { status: response.status }
        );
      }

      return NextResponse.json({ authToken: data.data.authToken });
    } else {
      return NextResponse.json(
        { message: "Invalid action or missing parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
