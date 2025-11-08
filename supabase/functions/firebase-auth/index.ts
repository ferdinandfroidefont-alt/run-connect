import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [FIREBASE AUTH] Edge function called');
    
    const body = await req.json();
    const { idToken } = body;

    console.log('📦 [FIREBASE AUTH] Request body received:', { hasToken: !!idToken });

    if (!idToken) {
      console.error('❌ [FIREBASE AUTH] Missing idToken in request body');
      throw new Error('Missing Firebase ID Token');
    }

    console.log('🎫 [FIREBASE AUTH] Token length:', idToken.length);
    console.log('🎫 [FIREBASE AUTH] Token preview:', idToken.substring(0, 50) + '...');

    // 1. Vérifier le Firebase ID Token avec Firebase API
    const firebaseServiceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    console.log('🔐 [FIREBASE AUTH] Service account exists:', !!firebaseServiceAccountRaw);

    if (!firebaseServiceAccountRaw) {
      console.error('❌ [FIREBASE AUTH] FIREBASE_SERVICE_ACCOUNT_JSON env var not found');
      throw new Error('Firebase service account not configured');
    }

    const firebaseServiceAccount = JSON.parse(firebaseServiceAccountRaw);
    console.log('🔐 [FIREBASE AUTH] Service account parsed successfully');
    console.log('🔑 [FIREBASE AUTH] Project ID:', firebaseServiceAccount.project_id);

    if (!firebaseServiceAccount.project_id) {
      console.error('❌ [FIREBASE AUTH] project_id missing in service account JSON');
      throw new Error('Firebase service account missing project_id');
    }

    // Vérifier le token avec Google's token verification endpoint
    const verifyResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('❌ [FIREBASE AUTH] Token verification failed');
      console.error('❌ [FIREBASE AUTH] Status:', verifyResponse.status);
      console.error('❌ [FIREBASE AUTH] Response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Firebase ID Token',
          details: errorText,
          status: verifyResponse.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      );
    }

    const tokenInfo = await verifyResponse.json();
    console.log('✅ [FIREBASE AUTH] Token verified for email:', tokenInfo.email);

    // 2. Créer/récupérer l'utilisateur Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Chercher l'utilisateur existant par email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users.find(u => u.email === tokenInfo.email);

    if (!supabaseUser) {
      console.log('👤 [FIREBASE AUTH] Creating new Supabase user for:', tokenInfo.email);
      
      // Créer un nouvel utilisateur
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: tokenInfo.email,
        email_confirm: true,
        user_metadata: {
          full_name: tokenInfo.name || '',
          avatar_url: tokenInfo.picture || '',
          provider: 'google',
          firebase_uid: tokenInfo.sub
        }
      });

      if (createError) {
        console.error('❌ [FIREBASE AUTH] Error creating user:', createError);
        throw createError;
      }
      
      supabaseUser = newUser.user;
      console.log('✅ [FIREBASE AUTH] User created with ID:', supabaseUser?.id);
    } else {
      console.log('✅ [FIREBASE AUTH] Existing user found with ID:', supabaseUser.id);
    }

    if (!supabaseUser) {
      throw new Error('Failed to create or retrieve user');
    }

    // 3. Générer une session Supabase pour cet utilisateur
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: tokenInfo.email,
    });

    if (sessionError) {
      console.error('❌ [FIREBASE AUTH] Error generating session:', sessionError);
      throw sessionError;
    }

    console.log('✅ [FIREBASE AUTH] Session generated successfully');

    // Extraire les tokens de l'URL générée
    const url = new URL(sessionData.properties.action_link);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('❌ [FIREBASE AUTH] Missing tokens in generated link');
      throw new Error('Failed to generate session tokens');
    }

    return new Response(
      JSON.stringify({
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
          user_metadata: supabaseUser.user_metadata
        },
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ [FIREBASE AUTH] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }
});
