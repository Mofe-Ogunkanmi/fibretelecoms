import { NextResponse } from "next/server";
import connectToDatabase from "../../lib/mongodb";
import User from "../../models/User";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Find the user
    const user = await User.findOne({ username });

    // Check if user exists and password matches
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 }
      );
    }

    // User authenticated successfully
    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        fullname: user.fullname,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
