// iOS Auth Callback — Redirect from Supabase Auth after Google OAuth
// Redirects to runconnect:// deep link so iOS app intercepts via appUrlOpen

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle errors
  if (error) {
    const redirectUrl = `runconnect://auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`;
    console.log(`[ios-auth-callback] Error: ${error}, redirecting to deep link`);
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  if (!code) {
    const redirectUrl = `runconnect://auth/callback?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    console.log(`[ios-auth-callback] No code received`);
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Redirect to deep link so iOS intercepts via appUrlOpen
  const redirectUrl = `runconnect://auth/callback?code=${encodeURIComponent(code)}`;
  console.log(`[ios-auth-callback] Redirecting to deep link with code (length: ${code.length})`);

  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
