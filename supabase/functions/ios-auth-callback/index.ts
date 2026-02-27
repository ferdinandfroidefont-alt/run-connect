// iOS Auth Callback — Handles redirect from Supabase Auth after Google OAuth
// Uses HTTP 302 redirect to custom scheme deep link
// Falls back to HTML+JS redirect if 302 doesn't work in SFSafariViewController

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
      headers: { "Location": deepLink },
    });
  }

  if (!code) {
    const deepLink = `app.runconnect://auth?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    console.log(`[ios-auth-callback] No code received`);
    return new Response(null, {
      status: 302,
      headers: { "Location": deepLink },
    });
  }

  const deepLink = `app.runconnect://auth?code=${encodeURIComponent(code)}`;
  console.log(`[ios-auth-callback] Redirecting with code (length: ${code.length})`);

  // Try 302 redirect first — modern iOS SFSafariViewController supports this
  // If it doesn't work, the HTML fallback page will handle it
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RunConnect</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5}
.c{text-align:center;padding:2rem}
.s{width:40px;height:40px;border:4px solid #e0e0e0;border-top-color:#007AFF;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem}
@keyframes spin{to{transform:rotate(360deg)}}
p{color:#333;font-size:17px}
.f{display:none;margin-top:2rem}
.f a{display:inline-block;padding:14px 28px;background:#007AFF;color:#fff;text-decoration:none;border-radius:12px;font-size:17px;font-weight:600}
</style>
</head>
<body>
<div class="c">
<div class="s"></div>
<p>Redirection vers RunConnect...</p>
<div class="f" id="f">
<p style="color:#888;font-size:14px">Appuyez sur le bouton ci-dessous</p>
<a href="${deepLink}">Ouvrir RunConnect</a>
</div>
</div>
<script>
window.location.replace("${deepLink}");
setTimeout(function(){document.getElementById("f").style.display="block"},2000);
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
});
