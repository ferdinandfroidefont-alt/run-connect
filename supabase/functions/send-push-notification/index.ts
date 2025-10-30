import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  data?: any;
  type?: string;
}

// Firebase service account interface 
interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Simple JWT creation for Firebase using Web Crypto API
async function createFirebaseJWT(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
  };

  // Base64URL encode helper
  const base64UrlEncode = (obj: any): string => {
    const jsonString = JSON.stringify(obj);
    const base64 = btoa(jsonString);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload); 
  const message = `${encodedHeader}.${encodedPayload}`;

  try {
    // Clean and prepare the private key
    const privateKeyPem = serviceAccount.private_key
      .replace(/\\n/g, '\n')
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '');

    // Convert base64 to ArrayBuffer
    const binaryDer = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));

    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the message
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(message)
    );

    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature);
    const signatureB64 = btoa(String.fromCharCode(...signatureArray));
    const signatureB64Url = signatureB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return `${message}.${signatureB64Url}`;
  } catch (error) {
    console.error('❌ Error creating JWT:', error);
    throw new Error(`JWT creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get Firebase access token 
async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  try {
    console.log('🔑 Creating Firebase JWT...');
    const jwt = await createFirebaseJWT(serviceAccount);
    console.log('✅ JWT created, length:', jwt.length);
    console.log('📋 JWT preview:', jwt.substring(0, 50) + '...');
    
    console.log('🔑 Requesting Firebase access token from OAuth2...');
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      console.error('❌ OAuth2 token request failed');
      console.error('📋 Status:', response.status, response.statusText);
      console.error('📋 Response:', JSON.stringify(tokenData, null, 2));
      throw new Error(`Token request failed: ${JSON.stringify(tokenData)}`);
    }

    console.log('✅ Firebase access token obtained');
    console.log('📋 Token length:', tokenData.access_token?.length || 0);
    console.log('📋 Token type:', tokenData.token_type);
    console.log('📋 Expires in:', tokenData.expires_in, 'seconds');
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Error getting Firebase access token:', error);
    throw error;
  }
}

// Send FCM notification with retry
async function sendFCMNotification(
  accessToken: string, 
  projectId: string, 
  token: string, 
  title: string, 
  body: string, 
  data?: any,
  retryCount: number = 0,
  maxRetries: number = 3
): Promise<boolean> {
  try {
    const fcmPayload = {
      message: {
        token: token,
        notification: {
          title,
          body,
        },
        data: data ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ) : {},
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#007AFF',
            sound: 'default',
            channel_id: 'runconnect_channel'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body
              },
              sound: 'default',
              badge: 1
            }
          }
        }
      }
    };

    console.log('🚀 Sending FCM notification to project:', projectId);
    console.log('📱 Token preview:', token.substring(0, 20) + '...');

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ FCM send failed');
      console.error('📋 Status:', response.status, response.statusText);
      console.error('📋 Response Data:', JSON.stringify(responseData, null, 2));
      console.error('📋 Token preview:', token.substring(0, 30) + '...');
      console.error('📋 Project ID:', projectId);
      console.error('📋 Attempt:', retryCount + 1, '/', maxRetries);
      
      // Log du payload FCM envoyé (pour debug)
      console.error('📋 FCM Payload sent:', JSON.stringify({
        message: {
          token: token.substring(0, 30) + '...',
          notification: { title, body },
          android: {
            priority: 'high',
            notification: {
              channel_id: 'runconnect_channel'
            }
          }
        }
      }, null, 2));
      
      // Retry logic for transient errors (5xx, network issues)
      if (retryCount < maxRetries && (response.status >= 500 || response.status === 429)) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s
        console.log(`🔄 Retrying FCM send in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendFCMNotification(accessToken, projectId, token, title, body, data, retryCount + 1, maxRetries);
      }
      
      return false;
    }

    console.log('✅ FCM notification sent successfully:', responseData.name);
    return true;
  } catch (error) {
    console.error('❌ FCM send error:', error);
    
    // Retry on network errors
    if (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
      console.log(`🔄 Retrying FCM send after error in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendFCMNotification(accessToken, projectId, token, title, body, data, retryCount + 1, maxRetries);
    }
    
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, title, body, data, type }: NotificationPayload = await req.json()

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'user_id, title et body sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔔 Processing push notification:', { user_id, title, body, type })

    // 1. Get Firebase service account from environment
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!firebaseServiceAccountJson) {
      console.error('❌ Firebase service account not configured');
      return new Response(
        JSON.stringify({ error: 'Firebase service account not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let serviceAccount: FirebaseServiceAccount;
    try {
      serviceAccount = JSON.parse(firebaseServiceAccountJson);
      console.log('✅ Firebase service account loaded');
      console.log('📋 Project ID:', serviceAccount.project_id);
      console.log('📋 Client Email:', serviceAccount.client_email);
      console.log('📋 Private Key ID:', serviceAccount.private_key_id);
      console.log('📋 Private Key present:', !!serviceAccount.private_key);
      console.log('📋 Private Key length:', serviceAccount.private_key?.length || 0);
      console.log('📋 Private Key starts with:', serviceAccount.private_key?.substring(0, 30) + '...');
    } catch (error) {
      console.error('❌ Invalid Firebase service account JSON:', error);
      console.error('📋 Raw JSON length:', firebaseServiceAccountJson?.length || 0);
      console.error('📋 JSON preview:', firebaseServiceAccountJson?.substring(0, 100) + '...');
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase service account configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get user profile and push token
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_token, notifications_enabled, notif_message, notif_session_request, notif_follow_request, notif_friend_session')
      .eq('user_id', user_id)
      .single()

    if (profileError || !profile) {
      console.log('❌ User profile not found:', profileError)
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Check if notifications are enabled
    if (!profile.notifications_enabled) {
      console.log('⚠️ Notifications disabled for user')
      return new Response(
        JSON.stringify({ message: 'Notifications désactivées pour cet utilisateur' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check notification preferences by type
    const checkPreference = (notificationType: string): boolean => {
      switch (notificationType) {
        case 'message':
          return profile.notif_message === true
        case 'session_request':
          return profile.notif_session_request === true  
        case 'follow_request':
          return profile.notif_follow_request === true
        case 'friend_session':
          return profile.notif_friend_session === true
        default:
          return true // Default enabled for other types
      }
    }

    if (type && !checkPreference(type)) {
      console.log(`⚠️ Notifications ${type} disabled for user`)
      return new Response(
        JSON.stringify({ message: `Notifications ${type} désactivées` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Create notification record in database
    const { data: notificationData, error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        title,
        message: body,
        type: type || 'info',
        data: data || {}
      })
      .select('id')
      .single()

    let notificationId: string | null = null;
    if (notifError) {
      console.error('❌ Error creating notification in database:', notifError)
      // Continue with push notification anyway
    } else {
      notificationId = notificationData?.id;
      console.log('✅ Notification saved to database with ID:', notificationId)
    }

    // 6. If no push token, return early
    if (!profile.push_token) {
      console.log('⚠️ No push token found, database notification only')
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Notification créée en base (pas de push token)' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Get Firebase access token and send FCM push notification
    console.log('🔐 Getting Firebase access token...');
    
    // Customize notification content based on type
    let finalTitle = title;
    let finalBody = body;
    let fcmData = { ...data, type: type || 'info' };

    // Handle different notification types with enhanced messaging
    if (type && data) {
      switch (type) {
        case 'message':
          finalTitle = 'Nouveau message';
          finalBody = `${data.sender_name || 'Quelqu\'un'} vous a envoyé un message`;
          if (data.message_preview) {
            finalBody += `: ${data.message_preview.length > 50 ? data.message_preview.substring(0, 50) + '...' : data.message_preview}`;
          }
          break;
          
        case 'friend_session':
          finalTitle = 'Session d\'ami créée';
          finalBody = `${data.organizer_name || 'Un ami'} a créé une session: ${data.session_title || 'Session'}`;
          break;
          
        case 'follow_request':
          finalTitle = 'Demande de suivi';
          finalBody = `${data.follower_name || 'Quelqu\'un'} souhaite vous suivre`;
          break;
          
        case 'session_request':
          finalTitle = 'Demande de participation';
          finalBody = `${data.requester_name || 'Quelqu\'un'} souhaite rejoindre votre session`;
          break;
          
        case 'club_invitation':
          finalTitle = 'Invitation à un club';
          finalBody = `${data.inviter_name || 'Quelqu\'un'} vous invite à rejoindre "${data.club_name || 'un club'}"`;
          break;
          
        case 'session_accepted':
          finalTitle = 'Session acceptée';
          finalBody = `${data.participant_name || 'Quelqu\'un'} a rejoint votre session: ${data.session_title || 'Session'}`;
          break;
          
        default:
          // Use original payload values
          break;
      }
    }
    
    try {
      const accessToken = await getFirebaseAccessToken(serviceAccount);
      console.log('✅ Access token obtained, length:', accessToken.length);
      
      console.log('🚀 Sending FCM notification...');
      console.log('📋 Project ID:', serviceAccount.project_id);
      console.log('📋 Token preview:', profile.push_token.substring(0, 30) + '...');
      console.log('📋 Channel ID: runconnect_channel');
      console.log('📋 Title:', finalTitle);
      console.log('📋 Body preview:', finalBody.substring(0, 50) + '...');
      
      const fcmSuccess = await sendFCMNotification(
        accessToken,
        serviceAccount.project_id,
        profile.push_token,
        finalTitle,
        finalBody,
        fcmData
      );
      
      console.log('📊 FCM Result:', fcmSuccess ? '✅ SUCCESS' : '❌ FAILED');

      // Log notification attempt
      if (notificationId) {
        try {
          await supabaseClient
            .from('notification_logs')
            .insert({
              notification_id: notificationId,
              user_id,
              push_token: profile.push_token,
              fcm_success: fcmSuccess,
              fcm_error: fcmSuccess ? null : 'FCM send failed',
              fcm_response: { type, title: finalTitle, body: finalBody }
            });
          console.log('✅ Notification logged');
        } catch (logErr) {
          console.error('❌ Failed to log notification:', logErr);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: fcmSuccess ? 'Notification push envoyée avec succès' : 'Notification créée, échec envoi push',
          fcm_sent: fcmSuccess,
          token_preview: profile.push_token.substring(0, 20) + '...',
          type,
          preferences_checked: true,
          project_id: serviceAccount.project_id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (fcmError) {
      console.error('❌ FCM error:', fcmError);
      
      // Log the error
      if (notificationId) {
        try {
          await supabaseClient
            .from('notification_logs')
            .insert({
              notification_id: notificationId,
              user_id,
              push_token: profile.push_token,
              fcm_success: false,
              fcm_error: String(fcmError),
              fcm_response: { error: String(fcmError) }
            });
        } catch (logErr) {
          console.error('❌ Failed to log error:', logErr);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification créée en base, erreur envoi push',
          fcm_sent: false,
          fcm_error: String(fcmError),
          type
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ General error:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})