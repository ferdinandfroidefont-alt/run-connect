// iOS Auth Callback — HTML+JS redirect (SFSafariViewController ne supporte pas 302 vers custom schemes)
// Reçoit ?code=XXX de Supabase Auth et affiche une page HTML qui redirige via JavaScript

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const buildHtml = (deepLink: string, message: string) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RunConnect</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
    .container { text-align: center; padding: 2rem; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top-color: #007AFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #333; font-size: 17px; }
    .fallback { display: none; margin-top: 2rem; }
    .fallback a { display: inline-block; padding: 14px 28px; background: #007AFF; color: white; text-decoration: none; border-radius: 12px; font-size: 17px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>${message}</p>
    <div class="fallback" id="fallback">
      <p style="color:#888;font-size:14px;">La redirection automatique n'a pas fonctionné.</p>
      <a href="${deepLink}">Ouvrir RunConnect</a>
    </div>
  </div>
  <script>
    window.location.href = "${deepLink}";
    setTimeout(function() { document.getElementById('fallback').style.display = 'block'; }, 2500);
  </script>
</body>
</html>`;

  if (error) {
    const deepLink = `app.runconnect://auth?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`;
    return new Response(buildHtml(deepLink, "Erreur d'authentification..."), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!code) {
    const deepLink = `app.runconnect://auth?error=no_code&error_description=${encodeURIComponent("No authorization code received")}`;
    return new Response(buildHtml(deepLink, "Erreur : aucun code reçu"), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const deepLink = `app.runconnect://auth?code=${encodeURIComponent(code)}`;
  console.log(`[ios-auth-callback] Redirecting via HTML+JS with code (length: ${code.length})`);

  return new Response(buildHtml(deepLink, "Redirection vers RunConnect..."), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
