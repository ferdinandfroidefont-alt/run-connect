import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logException, logStripeRef, logStructured, logUserRef } from "../_shared/secureLog.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const logStep = (step: string, details?: Record<string, unknown>) => {
  if (details) logStructured("STRIPE-WEBHOOK", step, details);
  else console.log(`[STRIPE-WEBHOOK] ${step}`);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature || !webhookSecret) {
      logStep("Missing signature or webhook secret");
      return new Response(JSON.stringify({ error: "Missing signature" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook event verified", { type: event.type, event: logStripeRef(event.id) });
    } catch (err) {
      logException("stripe-webhook-verify", err);
      return new Response(JSON.stringify({ error: "Webhook verification failed" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          session: logStripeRef(session.id), 
          customer: typeof session.customer === "string" ? logStripeRef(session.customer) : "—",
          subscription: session.subscription ? logStripeRef(String(session.subscription)) : "—",
          mode: session.mode ?? "",
          meta_keys: session.metadata ? Object.keys(session.metadata).join(",") : "",
        });

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await updateSubscription(subscription, session.customer_email || session.metadata?.user_email);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscription: logStripeRef(subscription.id), 
          status: subscription.status,
          customer: typeof subscription.customer === "string" ? logStripeRef(subscription.customer) : "—",
        });
        
        // Get customer email
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const email = (customer as Stripe.Customer).email;
        await updateSubscription(subscription, email);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscription: logStripeRef(subscription.id) });
        
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const email = (customer as Stripe.Customer).email;
        
        if (email) {
          await supabaseAdmin
            .from("subscribers")
            .update({
              subscribed: false,
              subscription_status: "canceled",
              subscription_tier: null,
              subscription_end: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            })
            .eq("email", email);
          
          logStep("Subscription marked as canceled", { subscriber: "by_email" });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { 
          invoice: logStripeRef(invoice.id),
          subscription: invoice.subscription ? logStripeRef(String(invoice.subscription)) : "—",
        });
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const email = (customer as Stripe.Customer).email;
          await updateSubscription(subscription, email);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment failed", { 
          invoice: logStripeRef(invoice.id), 
          has_customer_email: !!invoice.customer_email,
        });
        
        if (invoice.customer_email) {
          await supabaseAdmin
            .from("subscribers")
            .update({
              subscription_status: "past_due",
              last_synced_at: new Date().toISOString(),
            })
            .eq("email", invoice.customer_email);
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    logException("stripe-webhook", error);
    return new Response(JSON.stringify({ error: "Webhook handler error" }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function updateSubscription(subscription: Stripe.Subscription, email: string | null | undefined) {
  if (!email) {
    logStep("No email found for subscription update");
    return;
  }

  // Determine tier based on price interval
  const priceId = subscription.items.data[0]?.price?.id;
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  const tier = interval === "year" ? "Annuel" : "Mensuel";

  const updateData = {
    email: email,
    subscribed: subscription.status === "active" || subscription.status === "trialing",
    subscription_status: subscription.status,
    subscription_tier: tier,
    subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
    stripe_subscription_id: subscription.id,
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    last_synced_at: new Date().toISOString(),
  };

  logStep("Updating subscription in database", { tier, status: subscription.status });

  // First try to find by email
  const { data: existingSubscriber } = await supabaseAdmin
    .from("subscribers")
    .select("id, user_id")
    .eq("email", email)
    .maybeSingle();

  if (existingSubscriber) {
    await supabaseAdmin
      .from("subscribers")
      .update(updateData)
      .eq("email", email);
    logStep("Updated existing subscriber", { email });
  } else {
    // Create new subscriber record - we'll need to get user_id from auth
    const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
    const user = authUser?.users?.find(u => u.email === email);
    
    if (user) {
      await supabaseAdmin
        .from("subscribers")
        .insert({
          ...updateData,
          user_id: user.id,
        });
      logStep("Created new subscriber", { user: logUserRef(user.id) });
    } else {
      logStep("User not found in auth, cannot create subscriber", {});
    }
  }
}
