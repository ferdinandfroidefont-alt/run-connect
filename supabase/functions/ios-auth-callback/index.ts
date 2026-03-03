// iOS Auth Callback — Redirect from Supabase Auth after Google OAuth
// Returns an HTML page that triggers the deep link via JavaScript
// SFSafariViewController doesn't handle 302 to custom schemes properly

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  let redirectUrl: string;

  if (error) {
    redirectUrl = `runconnect://auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`;
    console.log(`[ios-auth-callback] Error: ${error}, redirecting via HTML`);
  } else if (!code) {
    redirectUrl = `runconnect://auth/callback?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    console.log(`[ios-auth-callback] No code received`);
  } else {
    redirectUrl = `runconnect://auth/callback?code=${encodeURIComponent(code)}`;
    console.log(`[ios-auth-callback] Redirecting with code (length: ${code.length})`);
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;">
<p>Redirection vers RunConnect...</p>
<script>
  window.location.href = '${redirectUrl}';
  setTimeout(function() {
    document.body.innerHTML = '<p style="font-family:-apple-system,sans-serif;text-align:center;padding:60px 20px;">Si l\\'application ne s\\'ouvre pas, <a href="${redirectUrl}">appuyez ici</a>.</p>';
  }, 2000);
</script>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
