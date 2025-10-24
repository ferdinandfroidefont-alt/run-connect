import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // This contains the user ID
    const error = url.searchParams.get('error');

    console.log('Strava callback received:', { code: !!code, state, error });

    if (error || !code || !state) {
      console.error('Error in Strava callback:', error);
      return new Response(
        `
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Erreur de connexion Strava</h1>
            <p>Une erreur s'est produite lors de la connexion à Strava.</p>
            <p>Erreur: ${error || 'Code d\'autorisation manquant'}</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 3000);
            </script>
          </body>
        </html>
        `,
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/html' 
          } 
        }
      );
    }

    // Exchange code for access token
    const stravaTokenResponse = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        code: code,
        grant_type: 'authorization_code',
      }),
    });

    if (!stravaTokenResponse.ok) {
      const errorText = await stravaTokenResponse.text();
      console.error('Failed to exchange code for token:', errorText);
      
      // Handle 403 Athlete quota exceeded
      if (stravaTokenResponse.status === 403) {
        return new Response(
          `
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
              <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; max-width: 400px; margin: 0 auto;">
                <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                <h1 style="margin: 0 0 20px 0;">Connexion temporairement indisponible</h1>
                <p style="margin: 0 0 20px 0; opacity: 0.9;">Le quota d'API Strava a été atteint.</p>
                <p style="margin: 0; opacity: 0.8; font-size: 14px;">Veuillez réessayer dans quelques heures.</p>
              </div>
              <script>
                setTimeout(() => {
                  if (window.opener) {
                    window.opener.location.href = window.opener.location.origin + '/profile';
                  }
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
          `,
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'text/html' 
            } 
          }
        );
      }
      
      throw new Error('Failed to get access token from Strava');
    }

    const tokenData = await stravaTokenResponse.json();
    console.log('Token exchange successful for user:', state);

    // Update user profile with Strava info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        strava_connected: true,
        strava_user_id: tokenData.athlete.id.toString(),
        strava_access_token: tokenData.access_token,
        strava_refresh_token: tokenData.refresh_token,
        strava_verified_at: new Date().toISOString(),
      })
      .eq('user_id', state);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    console.log('Profile updated successfully for user:', state);

    // Detect if running in native app or web
    const userAgent = req.headers.get('user-agent') || '';
    const isNativeApp = userAgent.includes('wv') || userAgent.includes('WebView');
    
    // Return success page with redirect
    const webUrl = 'https://runconnectlovable.app/profile';
    const nativeUrl = 'runconnect://auth/strava/success';
    const redirectUrl = isNativeApp ? nativeUrl : webUrl;
    
    return new Response(
      `
      <html>
        <head>
          <meta http-equiv="refresh" content="2;url=${redirectUrl}">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; max-width: 400px; margin: 0 auto;">
            <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
            <h1 style="margin: 0 0 20px 0;">Connexion Strava réussie !</h1>
            <p style="margin: 0 0 20px 0; opacity: 0.9;">Votre compte Strava a été connecté et vérifié avec succès.</p>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Redirection automatique...</p>
          </div>
          <script>
            // Try to redirect to app first, fallback to web
            setTimeout(() => {
              const nativeAppUrl = '${nativeUrl}';
              const webAppUrl = '${webUrl}';
              
              // Try native app redirect
              window.location.href = nativeAppUrl;
              
              // Fallback to web after 500ms if native doesn't work
              setTimeout(() => {
                window.location.href = webAppUrl;
              }, 500);
            }, 2000);
          </script>
        </body>
      </html>
      `,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in Strava callback:', error);
    
    const webUrl = 'https://runconnectlovable.app/profile';
    
    return new Response(
      `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; max-width: 400px; margin: 0 auto;">
            <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
            <h1 style="margin: 0 0 20px 0;">Erreur de connexion Strava</h1>
            <p style="margin: 0 0 20px 0; opacity: 0.9;">Une erreur s'est produite lors de la connexion.</p>
            <p style="margin: 0; opacity: 0.8; font-size: 14px;">Veuillez réessayer plus tard.</p>
          </div>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.location.href = '${webUrl}';
              }
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
      `,
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html' 
        } 
      }
    );
  }
});