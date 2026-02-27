// iOS Auth Callback — Redirect from Supabase Auth after Google OAuth
// Uses HTTP 302 redirect to custom scheme deep link

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle errors
  if (error) {
    const deepLink = `app.runconnect://auth?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`;
    console.log(`[ios-auth-callback] Error: ${error}, redirecting to app`);
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": deepLink,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  if (!code) {
    const deepLink = `app.runconnect://auth?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    console.log(`[ios-auth-callback] No code received`);
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": deepLink,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Build deep link with all query params forwarded
  const deepLink = `app.runconnect://auth?code=${encodeURIComponent(code)}`;
  console.log(`[ios-auth-callback] Redirecting with code (length: ${code.length})`);

  // Force direct redirect for all clients (Safari/WebView included)
  // to avoid raw HTML being displayed instead of executed.
  return new Response(null, {
    status: 302,
    headers: {
      "Location": deepLink,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
});
