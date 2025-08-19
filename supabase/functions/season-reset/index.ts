import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting seasonal reset...')

    // Calculate current season info
    const startRef = new Date('2024-08-15') // 15 août 2024
    const now = new Date()
    const seasonDuration = 45 * 24 * 60 * 60 * 1000 // 45 jours en millisecondes
    
    const timeSinceStart = now.getTime() - startRef.getTime()
    const seasonsElapsed = Math.floor(timeSinceStart / seasonDuration)
    const currentSeasonStart = new Date(startRef.getTime() + (seasonsElapsed * seasonDuration))
    const currentSeasonEnd = new Date(currentSeasonStart.getTime() + seasonDuration)
    
    // Check if we're at the start of a new season (within the first hour)
    const timeSinceSeasonStart = now.getTime() - currentSeasonStart.getTime()
    const oneHour = 60 * 60 * 1000
    
    if (timeSinceSeasonStart <= oneHour) {
      console.log(`New season detected! Season ${seasonsElapsed + 1} started at ${currentSeasonStart}`)
      
      // Reset all seasonal points to 0
      const { error: resetError } = await supabaseClient
        .from('user_scores')
        .update({ 
          seasonal_points: 0,
          last_seasonal_reset: now.toISOString()
        })
        .neq('user_id', '00000000-0000-0000-0000-000000000000') // Update all users
      
      if (resetError) {
        console.error('Error resetting seasonal points:', resetError)
        throw resetError
      }
      
      console.log('Seasonal points reset successfully!')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Season ${seasonsElapsed + 1} started, points reset`,
          seasonStart: currentSeasonStart,
          seasonEnd: currentSeasonEnd
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    } else {
      console.log('Not time for season reset yet')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reset needed',
          nextSeasonStart: currentSeasonEnd,
          currentSeason: seasonsElapsed + 1
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }
    
  } catch (error) {
    console.error('Error in season reset function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})