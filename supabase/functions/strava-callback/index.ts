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
      console.error('Failed to exchange code for token:', await stravaTokenResponse.text());
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

    // Return success page
    return new Response(
      `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>✅ Connexion Strava réussie !</h1>
          <p>Votre compte Strava a été connecté avec succès.</p>
          <p>Vous pouvez maintenant fermer cette fenêtre et retourner à l'application.</p>
          <script>
            setTimeout(() => {
              window.close();
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
    
    return new Response(
      `
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>❌ Erreur de connexion Strava</h1>
          <p>Une erreur s'est produite lors de la connexion à Strava.</p>
          <p>Veuillez réessayer plus tard.</p>
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
});