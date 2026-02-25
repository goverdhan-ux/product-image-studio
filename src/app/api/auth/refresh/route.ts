import { NextRequest, NextResponse } from "next/server";

const OPENAI_CLIENT_ID = process.env.OPENAI_CLIENT_ID;
const OPENAI_CLIENT_SECRET = process.env.OPENAI_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("openai_refresh_token")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token available" },
        { status: 401 }
      );
    }

    // Refresh the access token
    const response = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: OPENAI_CLIENT_ID || "",
        client_secret: OPENAI_CLIENT_SECRET || "",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: 401 }
      );
    }

    const tokens = await response.json();

    // Create response
    const res = NextResponse.json({ success: true });

    // Update cookies
    res.cookies.set("openai_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      res.cookies.set("openai_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json(
      { error: "Token refresh failed" },
      { status: 500 }
    );
  }
}
