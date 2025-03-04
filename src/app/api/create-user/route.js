import { NextResponse } from "next/server";
import fetch from "node-fetch";
import connectToDatabase from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs"; // For password hashing, install with: npm install bcryptjs

export async function POST(request) {
  try {
    const { uid, name, password } = await request.json();

    if (!uid || !name || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ username: uid });
    if (existingUser) {
      return NextResponse.json(
        { message: "Username already exists" },
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const newUser = new User({
      username: uid,
      fullname: name,
      password: hashedPassword,
    });

    await newUser.save();

    return NextResponse.json({
      success: true,
      user: { username: uid, fullname: name },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
