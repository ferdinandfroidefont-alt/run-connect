import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, verifyCronSecret } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!verifyCronSecret(req)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const startRef = new Date('2024-08-15')
    const now = new Date()
    const seasonDuration = 45 * 24 * 60 * 60 * 1000
    const timeSinceStart = now.getTime() - startRef.getTime()
    const seasonsElapsed = Math.floor(timeSinceStart / seasonDuration)
    const currentSeasonStart = new Date(startRef.getTime() + (seasonsElapsed * seasonDuration))
    const currentSeasonEnd = new Date(currentSeasonStart.getTime() + seasonDuration)
    const timeSinceSeasonStart = now.getTime() - currentSeasonStart.getTime()
    const oneHour = 60 * 60 * 1000

    if (timeSinceSeasonStart <= oneHour) {
      const { error: resetError } = await supabaseClient
        .from('user_scores')
        .update({ seasonal_points: 0, last_seasonal_reset: now.toISOString() })
        .neq('user_id', '00000000-0000-0000-0000-000000000000')

      if (resetError) throw resetError

      return new Response(
        JSON.stringify({ success: true, message: `Season ${seasonsElapsed + 1} started, points reset`, seasonStart: currentSeasonStart, seasonEnd: currentSeasonEnd }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      return new Response(
        JSON.stringify({ success: true, message: 'No reset needed', nextSeasonStart: currentSeasonEnd, currentSeason: seasonsElapsed + 1 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
