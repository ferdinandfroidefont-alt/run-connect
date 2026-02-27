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

  // Try 302 redirect first
  // If 302 doesn't work with custom schemes in SFSafariViewController,
  // fall back to a minimal HTML page that forces the redirect
  const userAgent = req.headers.get("user-agent") || "";
  const isSafari = userAgent.includes("Safari") && !userAgent.includes("Chrome");
  
  // For Safari/SFSafariViewController, use HTML with meta refresh + JS as backup
  // because some iOS versions block 302 to custom schemes
  if (isSafari) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${deepLink}"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Redirection...</title></head><body><script>window.location.replace("${deepLink}");</script></body></html>`;
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }

  // For non-Safari (WebView, etc.), use direct 302
  return new Response(null, {
    status: 302,
    headers: { 
      "Location": deepLink,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
