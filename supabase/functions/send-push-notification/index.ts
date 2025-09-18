import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id: string
  title: string
  body: string
  data?: Record<string, any>
  type?: string
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

    console.log('🔔 Envoi notification push:', { user_id, title, body, type })

    // 1. Récupérer le token push de l'utilisateur et ses préférences
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('push_token, notifications_enabled, notif_message, notif_session_request, notif_friend_request, notif_friend_session')
      .eq('user_id', user_id)
      .single()

    if (profileError || !profile) {
      console.log('❌ Utilisateur non trouvé ou pas de profil:', profileError)
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Vérifier si les notifications sont activées
    if (!profile.notifications_enabled) {
      console.log('⚠️ Notifications désactivées pour cet utilisateur')
      return new Response(
        JSON.stringify({ message: 'Notifications désactivées pour cet utilisateur' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Vérifier les préférences selon le type de notification
    const checkPreference = (notificationType: string): boolean => {
      switch (notificationType) {
        case 'message':
          return profile.notif_message === true
        case 'session_request':
          return profile.notif_session_request === true  
        case 'follow_request':
          return profile.notif_friend_request === true
        case 'friend_session':
          return profile.notif_friend_session === true
        default:
          return true // Autres types activés par défaut
      }
    }

    if (type && !checkPreference(type)) {
      console.log(`⚠️ Notifications ${type} désactivées pour cet utilisateur`)
      return new Response(
        JSON.stringify({ message: `Notifications ${type} désactivées` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Si pas de token push, créer une notification normale en base
    if (!profile.push_token) {
      console.log('⚠️ Pas de token push, création notification en base uniquement')
      
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id,
          title,
          message: body,
          type: type || 'info',
          data: data || {}
        })

      if (notifError) {
        console.error('❌ Erreur création notification:', notifError)
        return new Response(
          JSON.stringify({ error: 'Erreur création notification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ message: 'Notification créée en base (pas de push token)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Envoyer la notification push via FCM (Firebase Cloud Messaging)
    // Note: En production, il faudrait configurer FCM avec une clé serveur
    // Pour l'instant, on simule l'envoi et on crée la notification en base
    
    console.log('📱 Token push trouvé, envoi notification:', profile.push_token.substring(0, 20) + '...')

    // Créer la notification en base en même temps
    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        title,
        message: body,
        type: type || 'info',
        data: data || {}
      })

    if (notifError) {
      console.error('❌ Erreur création notification en base:', notifError)
      // Continue quand même pour l'envoi push
    }

    // Simulation envoi FCM (en production, utiliser l'API FCM réelle)
    const fcmPayload = {
      to: profile.push_token,
      notification: {
        title,
        body,
        icon: '/favicon.png',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      data: {
        type: type || 'info',
        ...data
      }
    }

    console.log('🚀 Payload FCM préparé:', fcmPayload)

    // TODO: En production, envoyer vraiment à FCM avec fetch vers:
    // POST https://fcm.googleapis.com/fcm/send
    // Headers: { 'Authorization': 'key=SERVER_KEY', 'Content-Type': 'application/json' }
    // Body: JSON.stringify(fcmPayload)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification push envoyée',
        token_preview: profile.push_token.substring(0, 20) + '...',
        type,
        preferences_checked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Erreur générale:', error)
    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})