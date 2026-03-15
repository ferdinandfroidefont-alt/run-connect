import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface GeocodeRequest {
  address?: string;
  lat?: number;
  lng?: number;
  type: 'geocode' | 'reverse' | 'get-key';
}

// Infer native platform from request signals (Origin, User-Agent)
function inferNative(req: Request, platformBody?: string): { isNative: boolean; originKind: string; uaKind: string } {
  const origin = req.headers.get('Origin') || '';
  const ua = req.headers.get('User-Agent') || '';

  // Classify origin
  let originKind = 'web';
  if (!origin || origin === 'null') {
    originKind = 'empty_or_null';
  } else if (/^capacitor:/.test(origin) || /^ionic:/.test(origin) || /^file:/.test(origin)) {
    originKind = 'native_scheme';
  }

  // Classify UA
  let uaKind = 'browser';
  if (/RunConnect/i.test(ua)) {
    uaKind = 'runconnect_marker';
  } else if (/iPhone|iPad|iPod/i.test(ua) && /AppleWebKit/i.test(ua)) {
    const isRegularSafari = /Safari\//.test(ua) && /Version\//.test(ua);
    const isKnownBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    if (!isRegularSafari && !isKnownBrowser) {
      uaKind = 'ios_webview';
    }
  } else if (/Android/i.test(ua) && /wv/.test(ua)) {
    uaKind = 'android_webview';
  }

  // Determine native
  const isNative =
    platformBody === 'ios' || platformBody === 'android' ||
    originKind === 'native_scheme' || originKind === 'empty_or_null' ||
    uaKind === 'runconnect_marker' || uaKind === 'ios_webview' || uaKind === 'android_webview';

  return { isNative, originKind, uaKind };
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const browserApiKey = Deno.env.get("GOOGLE_MAPS_BROWSER_API_KEY");
    const serverApiKey = Deno.env.get("GOOGLE_MAPS_SERVER_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    const body = await req.json();
    const { address, lat, lng, type, platform }: GeocodeRequest & { platform?: string } = body || {};
    
    if (type === 'get-key') {
      const { isNative, originKind, uaKind } = inferNative(req, platform);

      const keyToReturn = isNative
        ? (serverApiKey || browserApiKey)
        : (browserApiKey || serverApiKey);

      if (!keyToReturn) {
        throw new Error("Aucune clé API Google Maps configurée");
      }

      console.log(`[google-maps-proxy] get-key platform_body=${platform || 'none'} origin_kind=${originKind} ua_kind=${uaKind} native_inferred=${isNative}`);

      return new Response(JSON.stringify({ apiKey: keyToReturn }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!serverApiKey) {
      throw new Error("GOOGLE_MAPS_API_KEY n'est pas configuré");
    }

    let url = "";
    if (type === 'geocode' && address) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${serverApiKey}&language=fr`;
    } else if (type === 'reverse' && lat && lng) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${serverApiKey}&language=fr`;
    } else {
      throw new Error("Paramètres invalides");
    }

    const response = await fetch(url);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Erreur dans google-maps-proxy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
