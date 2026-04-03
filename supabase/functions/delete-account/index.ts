import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireUserJwt } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authResult = await requireUserJwt(req, supabaseAdmin)
    if (authResult instanceof Response) {
      const body = await authResult.text()
      return new Response(body, {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { user } = authResult

    console.log('Deleting account for user:', user.id)

    try {
      // First, delete all user data using the new function
      const { error: deleteDataError } = await supabaseAdmin.rpc('delete_user_data', {
        target_user_id: user.id
      })

      if (deleteDataError) {
        console.error('Error deleting user data:', deleteDataError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete user data' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Then delete the auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

      if (deleteError) {
        console.error('Delete user error:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete account' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Account successfully deleted for user:', user.id)
    } catch (error) {
      console.error('Unexpected error during account deletion:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})