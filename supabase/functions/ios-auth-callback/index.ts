// iOS Auth Callback — Pure HTTP redirect, NO JavaScript client, NO Supabase SDK
// Receives ?code=XXX from Supabase Auth and 302-redirects to app.runconnect://auth?code=XXX
// This avoids the PKCE issue where SFSafariViewController doesn't have the code_verifier

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Handle error from OAuth provider
  if (error) {
    const deepLink = `app.runconnect://auth?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`;
    return new Response(null, {
      status: 302,
      headers: { Location: deepLink },
    });
  }

  // No code received — redirect with error
  if (!code) {
    const deepLink = `app.runconnect://auth?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    return new Response(null, {
      status: 302,
      headers: { Location: deepLink },
    });
  }

  // Success: redirect code to the app via deep link
  const deepLink = `app.runconnect://auth?code=${encodeURIComponent(code)}`;
  
  console.log(`[ios-auth-callback] Redirecting to deep link with code (length: ${code.length})`);

  return new Response(null, {
    status: 302,
    headers: { Location: deepLink },
  });
});
