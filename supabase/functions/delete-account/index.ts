import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireUserJwt } from "../_shared/auth.ts";
import { logDbError, logException, logStructured, logUserRef } from "../_shared/secureLog.ts";

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

    logStructured("delete-account", "start", { user: logUserRef(user.id) });

    try {
      // First, delete all user data using the new function
      const { error: deleteDataError } = await supabaseAdmin.rpc('delete_user_data', {
        target_user_id: user.id
      })

      if (deleteDataError) {
        logDbError("delete-account", deleteDataError);
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
        logDbError("delete-account-auth", deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete account' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      logStructured("delete-account", "done", { user: logUserRef(user.id) });
    } catch (error) {
      logException("delete-account", error);
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
    logException("delete-account-outer", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})