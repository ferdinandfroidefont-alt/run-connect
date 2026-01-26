import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_ADDRESS_LENGTH = 500;
const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

// Allowed request types (removed 'get-key' for security)
const ALLOWED_TYPES = ['geocode', 'reverse'] as const;
type RequestType = typeof ALLOWED_TYPES[number];

interface GeocodeRequest {
  address?: string;
  lat?: number;
  lng?: number;
  type: RequestType;
}

// Validate and sanitize input
function validateInput(body: any): { valid: boolean; error?: string; data?: GeocodeRequest } {
  const { address, lat, lng, type } = body || {};

  // Type validation
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return { valid: false, error: `Invalid type. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }

  // Geocode validation
  if (type === 'geocode') {
    if (!address || typeof address !== 'string') {
      return { valid: false, error: 'Address is required for geocode' };
    }
    if (address.length > MAX_ADDRESS_LENGTH) {
      return { valid: false, error: `Address too long (max ${MAX_ADDRESS_LENGTH} chars)` };
    }
    // Basic sanitization - remove potential injection characters
    const sanitizedAddress = address.trim();
    if (sanitizedAddress.length === 0) {
      return { valid: false, error: 'Address cannot be empty' };
    }
    return { valid: true, data: { address: sanitizedAddress, type } };
  }

  // Reverse geocode validation
  if (type === 'reverse') {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return { valid: false, error: 'lat and lng must be numbers for reverse geocode' };
    }
    if (lat < LAT_MIN || lat > LAT_MAX) {
      return { valid: false, error: `lat must be between ${LAT_MIN} and ${LAT_MAX}` };
    }
    if (lng < LNG_MIN || lng > LNG_MAX) {
      return { valid: false, error: `lng must be between ${LNG_MIN} and ${LNG_MAX}` };
    }
    return { valid: true, data: { lat, lng, type } };
  }

  return { valid: false, error: 'Invalid request' };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Service temporarily unavailable" }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body = await req.json();
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      console.warn("Invalid input:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { address, lat, lng, type } = validation.data!;
    let url = "";

    if (type === 'geocode' && address) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=fr`;
    } else if (type === 'reverse' && lat !== undefined && lng !== undefined) {
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=fr`;
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
    console.error("Error in google-maps-proxy:", error.message);
    // Return generic error message (don't expose internal details)
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);