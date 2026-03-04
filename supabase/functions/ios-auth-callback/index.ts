// iOS Auth Callback — Redirect to static HTML bridge page
// Supabase Edge Functions override Content-Type, so we use a 302 redirect
// to a static page hosted on the app domain where text/html is guaranteed

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const bridgeBase = "https://run-connect.lovable.app/ios-callback.html";
  const params = new URLSearchParams();

  if (error) {
    params.set("error", error);
    if (errorDescription) params.set("error_description", errorDescription);
    console.log(`[ios-auth-callback] Error: ${error}, redirecting to bridge page`);
  } else if (!code) {
    params.set("error", "no_code");
    params.set("error_description", "No authorization code received");
    console.log(`[ios-auth-callback] No code received`);
  } else {
    params.set("code", code);
    console.log(`[ios-auth-callback] Redirecting with code (length: ${code.length})`);
  }

  const redirectUrl = `${bridgeBase}?${params.toString()}`;

  return new Response(null, {
    status: 302,
    headers: {
      "Location": redirectUrl,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
