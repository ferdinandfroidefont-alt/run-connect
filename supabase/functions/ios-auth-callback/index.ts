// iOS Auth Callback — Redirect from Supabase Auth after Google OAuth
// Redirects to HTTPS URL (not custom scheme) so InAppBrowser can intercept it

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle errors
  if (error) {
    const redirectUrl = `https://run-connect.lovable.app/auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`;
    console.log(`[ios-auth-callback] Error: ${error}, redirecting to HTTPS callback`);
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  if (!code) {
    const redirectUrl = `https://run-connect.lovable.app/auth/callback?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    console.log(`[ios-auth-callback] No code received`);
    return new Response(null, {
      status: 302,
      headers: { 
        "Location": redirectUrl,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  // Redirect to HTTPS URL that InAppBrowser can intercept via urlChangeEvent
  const redirectUrl = `https://run-connect.lovable.app/auth/callback?code=${encodeURIComponent(code)}`;
  console.log(`[ios-auth-callback] Redirecting to HTTPS callback with code (length: ${code.length})`);

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
