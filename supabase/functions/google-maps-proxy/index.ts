import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface GeocodeRequest {
  address?: string;
  lat?: number;
  lng?: number;
  type: 'geocode' | 'reverse' | 'get-key';
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use browser-specific key for client-side Maps JS API, fallback to general key
    const browserApiKey = Deno.env.get("GOOGLE_MAPS_BROWSER_API_KEY");
    const serverApiKey = Deno.env.get("GOOGLE_MAPS_SERVER_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    const body = await req.json();
    const { address, lat, lng, type }: GeocodeRequest = body || {};
    
    // Si on demande juste la clé API (pour le navigateur)
    if (type === 'get-key') {
      const keyToReturn = browserApiKey || serverApiKey;
      if (!keyToReturn) {
        throw new Error("Aucune clé API Google Maps configurée");
      }
      return new Response(JSON.stringify({ apiKey: keyToReturn }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    if (!serverApiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY n'est pas configuré");
    }
    const apiKey = serverApiKey;

    let url = "";

    if (type === 'geocode' && address) {
      // Géocodage : adresse -> coordonnées
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=fr`;
    } else if (type === 'reverse' && lat && lng) {
      // Géocodage inverse : coordonnées -> adresse
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=fr`;
    } else {
      throw new Error("Paramètres invalides");
    }

    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Erreur dans google-maps-proxy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);