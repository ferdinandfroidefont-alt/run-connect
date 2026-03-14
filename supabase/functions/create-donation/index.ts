import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders } from "../_shared/cors.ts";

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-DONATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Parse request body
    const { amount, currency = "eur", donorName, donorEmail, message } = await req.json();
    logStep("Request parsed", { amount, currency, donorName, donorEmail });

    // Validate amount (minimum 1 euro, maximum 10000 euros)
    if (!amount || amount < 100 || amount > 1000000) {
      throw new Error("Le montant doit être entre 1€ et 10 000€");
    }

    // Try to get authenticated user (optional for donations)
    let user = null;
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        user = data.user;
        logStep("User authenticated", { userId: user?.id, email: user?.email });
      }
    } catch (error) {
      logStep("No authenticated user, proceeding as guest donation");
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Determine customer email
    const customerEmail = user?.email || donorEmail || "guest@example.com";
    
    // Check if a Stripe customer record exists for this email
    const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    }

    // Create a one-time payment session for donation
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: { 
              name: "Don",
              description: message ? `Message: ${message}` : "Don pour soutenir l'application"
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/donation-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/donation-canceled`,
      metadata: {
        type: "donation",
        donor_name: donorName || "Anonyme",
        user_id: user?.id || "guest",
        message: message || ""
      }
    });

    logStep("Stripe checkout session created", { sessionId: session.id, url: session.url });

    // Optional: Record donation in Supabase (using service role key to bypass RLS)
    try {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // You could create a donations table to track donations
      // For now, we'll just log it
      logStep("Donation session recorded", { 
        sessionId: session.id, 
        amount, 
        currency, 
        donorName, 
        userId: user?.id 
      });
    } catch (error) {
      logStep("Failed to record donation in database", { error: error instanceof Error ? error.message : "Unknown error" });
      // Don't fail the request if database recording fails
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-donation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});