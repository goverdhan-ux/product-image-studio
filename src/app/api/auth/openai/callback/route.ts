import { NextRequest, NextResponse } from "next/server";

const OPENAI_CLIENT_ID = process.env.OPENAI_CLIENT_ID;
const OPENAI_CLIENT_SECRET = process.env.OPENAI_CLIENT_SECRET;
const REDIRECT_URI = process.env.OPENAI_REDIRECT_URI || "http://localhost:3000/api/auth/openai/callback";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Check for OAuth errors
  if (error) {
    return NextResponse.redirect(new URL("/?error=oauth_error", request.url));
  }

  // Verify state to prevent CSRF
  const savedState = request.cookies.get("oauth_state")?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: OPENAI_CLIENT_ID || "",
        client_secret: OPENAI_CLIENT_SECRET || "",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return NextResponse.redirect(new URL("/?error=token_exchange_failed", request.url));
    }

    const tokens = await tokenResponse.json();
    
    // Get user info
    const userResponse = await fetch("https://api.openai.com/v1/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    let userEmail = "";
    if (userResponse.ok) {
      const userData = await userResponse.json();
      userEmail = userData.email || "";
    }

    // Create response with redirect
    const response = NextResponse.redirect(new URL("/?success=oauth_connected", request.url));
    
    // Set cookies (httpOnly for security)
    response.cookies.set("openai_access_token", tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      response.cookies.set("openai_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?error=oauth_failed", request.url));
  }
}
