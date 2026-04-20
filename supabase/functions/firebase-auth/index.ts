import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logDbError, logException, logHttpUpstream, logStructured, logUserRef } from "../_shared/secureLog.ts";

// firebase-auth is called from native WebView without Origin header — keep permissive CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { idToken } = body;

    logStructured("firebase-auth", "body", { has_id_token: !!idToken });

    if (!idToken) {
      console.error("[firebase-auth] missing id_token");
      throw new Error('Missing Firebase ID Token');
    }

    // Token length validated, proceeding with verification

    // 1. Vérifier le Firebase ID Token avec Firebase API
    const firebaseServiceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    logStructured("firebase-auth", "env", { has_service_account_json: !!firebaseServiceAccountRaw });

    if (!firebaseServiceAccountRaw) {
      console.error("[firebase-auth] FIREBASE_SERVICE_ACCOUNT_JSON missing");
      throw new Error('Firebase service account not configured');
    }

    const firebaseServiceAccount = JSON.parse(firebaseServiceAccountRaw);
    logStructured("firebase-auth", "service_account", {
      has_project_id: !!firebaseServiceAccount.project_id,
    });

    if (!firebaseServiceAccount.project_id) {
      console.error("[firebase-auth] project_id missing in service account");
      throw new Error('Firebase service account missing project_id');
    }

    // Vérifier le token avec Google's token verification endpoint
    const verifyResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    if (!verifyResponse.ok) {
      await verifyResponse.text().catch(() => "");
      logHttpUpstream("firebase-auth", verifyResponse.status, "tokeninfo");
      
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Firebase ID Token',
          status: verifyResponse.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      );
    }

    const tokenInfo = await verifyResponse.json();
    logStructured("firebase-auth", "token_ok", { sub_prefix: typeof tokenInfo.sub === "string" ? logUserRef(tokenInfo.sub) : "—" });

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

    // Générer un mot de passe temporaire sécurisé qui respecte les exigences Supabase
    // Doit contenir: minuscules, majuscules, chiffres (min 6 caractères)
    const generateSecurePassword = (): string => {
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const special = '!@#$%^&*';
      
      // Garantir au moins un de chaque type
      let password = '';
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
      password += numbers[Math.floor(Math.random() * numbers.length)];
      password += special[Math.floor(Math.random() * special.length)];
      
      // Ajouter des caractères aléatoires pour atteindre 16 caractères
      const allChars = lowercase + uppercase + numbers + special;
      for (let i = 0; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
      }
      
      // Mélanger le mot de passe
      return password.split('').sort(() => Math.random() - 0.5).join('');
    };
    
    const tempPassword = generateSecurePassword();
    logStructured("firebase-auth", "temp_password_ready", {});

    if (!supabaseUser) {
      logStructured("firebase-auth", "create_user", {});
      
      // Créer un nouvel utilisateur avec un mot de passe
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: tokenInfo.email,
        email_confirm: true,
        password: tempPassword,
        user_metadata: {
          full_name: tokenInfo.name || '',
          avatar_url: tokenInfo.picture || '',
          provider: 'google',
          firebase_uid: tokenInfo.sub
        }
      });

      if (createError) {
        logDbError("firebase-auth", createError);
        throw createError;
      }
      
      supabaseUser = newUser.user;
      logStructured("firebase-auth", "user_created", { user: logUserRef(supabaseUser?.id) });
    } else {
      logStructured("firebase-auth", "user_exists", { user: logUserRef(supabaseUser.id) });
      
      // Utilisateur existant : mettre à jour le mot de passe
      logStructured("firebase-auth", "password_rotate", {});
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        supabaseUser.id,
        { password: tempPassword }
      );
      
      if (updateError) {
        logDbError("firebase-auth", updateError);
        throw updateError;
      }
      
      logStructured("firebase-auth", "password_updated", {});
    }

    if (!supabaseUser) {
      throw new Error('Failed to create or retrieve user');
    }

    // 3. Générer une session Supabase via magic link (contourne le captcha)
    logStructured("firebase-auth", "generate_link", {});
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: tokenInfo.email,
    });

    if (linkError || !linkData) {
      logDbError("firebase-auth", linkError);
      throw linkError || new Error('Failed to generate magic link');
    }

    logStructured("firebase-auth", "link_ok", {});

    // Extraire le token du lien et l'échanger contre une session
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      console.error("[firebase-auth] no action_link");
      throw new Error('No action_link in generated link');
    }

    const url = new URL(actionLink);
    const token_hash = url.searchParams.get('token');
    
    if (!token_hash) {
      console.error("[firebase-auth] no token_hash in magic link");
      throw new Error('No token in generated link');
    }

    logStructured("firebase-auth", "verify_otp", {});

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: sessionData, error: sessionError } = await supabaseClient.auth.verifyOtp({
      token_hash,
      type: 'magiclink'
    });

    if (sessionError || !sessionData.session) {
      logDbError("firebase-auth", sessionError);
      throw sessionError || new Error('Failed to create session');
    }

    const signInData = sessionData;

    logStructured("firebase-auth", "session_ok", { user: logUserRef(signInData.user?.id) });

    return new Response(
      JSON.stringify({
        user: {
          id: signInData.user!.id,
          email: signInData.user!.email,
          user_metadata: signInData.user!.user_metadata
        },
        session: {
          access_token: signInData.session!.access_token,
          refresh_token: signInData.session!.refresh_token,
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    logException("firebase-auth", error);
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
