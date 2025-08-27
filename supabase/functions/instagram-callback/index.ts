import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // user_id
  const error = url.searchParams.get('error')

  if (error) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Erreur de connexion Instagram</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Erreur de connexion Instagram</h1>
          <p>Une erreur s'est produite lors de la connexion à Instagram.</p>
          <p>Erreur: ${error}</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  if (!code || !state) {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Erreur de connexion Instagram</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Erreur de connexion Instagram</h1>
          <p>Paramètres manquants dans la réponse d'Instagram.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const instagramClientId = Deno.env.get('INSTAGRAM_CLIENT_ID')
    const instagramClientSecret = Deno.env.get('INSTAGRAM_CLIENT_SECRET')
    
    if (!instagramClientId || !instagramClientSecret) {
      throw new Error('Instagram credentials not configured')
    }

    // Exchange code for access token
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-callback`
    
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: instagramClientId,
        client_secret: instagramClientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Instagram token exchange failed:', errorText)
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    console.log('Instagram token data:', tokenData)

    // Get user info from Instagram
    const userResponse = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`)
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error('Instagram user info failed:', errorText)
      throw new Error('Failed to get user info from Instagram')
    }

    const userData = await userResponse.json()
    console.log('Instagram user data:', userData)

    // Update user profile in Supabase
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        instagram_connected: true,
        instagram_verified_at: new Date().toISOString(),
        instagram_user_id: userData.id,
        instagram_access_token: tokenData.access_token,
        instagram_username: userData.username,
      })
      .eq('user_id', state)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      throw updateError
    }

    console.log('Instagram connection successful for user:', state)

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Connexion Instagram réussie</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>✅ Instagram connecté avec succès!</h1>
          <p>Votre compte Instagram a été connecté à votre profil.</p>
          <p>Vous allez être redirigé vers votre profil...</p>
          <script>
            setTimeout(() => {
              window.location.href = '/profile';
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Error in instagram-callback function:', error)
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Erreur de connexion Instagram</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Erreur de connexion Instagram</h1>
          <p>Une erreur s'est produite lors de la connexion à Instagram.</p>
          <p>Veuillez réessayer plus tard.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
})