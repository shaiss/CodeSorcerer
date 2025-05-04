import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Add timeout promise
const timeoutPromise = (ms: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout")), ms);
  });
};

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // Race between the auth logic and a timeout
    const result = await Promise.race([
      handleAuth(req),
      timeoutPromise(5000), // 5 second timeout
    ]);

    return result as NextResponse;
  } catch (error) {
    console.error("Auth error:", error);

    // More specific error messages
    if (error instanceof Error) {
      if (error.message === "Request timeout") {
        return NextResponse.json(
          { error: "Authentication request timed out. Please try again." },
          { status: 504 }
        );
      }
    }

    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}

async function handleAuth(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!process.env["CHAT_PASSWORD"]) {
      console.error("CHAT_PASSWORD environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check if password matches using bracket notation
    if (password !== process.env["CHAT_PASSWORD"]) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (!process.env["JWT_SECRET"]) {
      console.error("JWT_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Generate JWT token using bracket notation
    const token = jwt.sign({ authorized: true }, process.env["JWT_SECRET"], {
      expiresIn: "7d",
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Auth handler error:", error);
    throw error; // Let the parent handler deal with it
  }
}
