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

    // Determine if we're in a native app or web browser
    const userAgent = req.headers.get('user-agent') || '';
    const isNative = userAgent.includes('RunConnect') || 
                     userAgent.includes('wv') || 
                     userAgent.includes('Android');

    console.log('User agent:', userAgent);
    console.log('Is native app:', isNative);

    // Return success page with automatic redirect
    // ✅ FIXED: Use correct deep link scheme app.runconnect://
    const redirectUrl = isNative 
      ? `app.runconnect://auth/strava/success`
      : `https://run-connect.lovable.app/profile`;

    console.log('Redirecting to:', redirectUrl);

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Strava Connected</title>
          <meta http-equiv="refresh" content="0;url=${redirectUrl}">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; max-width: 400px; margin: 0 auto;">
            <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
            <h2 style="color: #FC4C02;">Connexion Strava réussie !</h2>
            <p>Retour à RunConnect...</p>
          </div>
          <script>
            // For native app - trigger redirect immediately
            if (${isNative}) {
              window.location.href = '${redirectUrl}';
              // Close this window after redirect
              setTimeout(() => {
                try {
                  window.close();
                } catch (e) {
                  console.log('Cannot close window:', e);
                }
              }, 500);
            } else {
              // For web - use postMessage to parent window
              if (window.opener) {
                window.opener.postMessage({ type: 'strava_auth_success' }, '*');
                setTimeout(() => window.close(), 500);
              } else {
                window.location.href = '${redirectUrl}';
              }
            }
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