import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@3.2.0";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ReportRequest {
  reportedUserId: string;
  reportedUsername: string;
  reason: string;
  description: string;
}

const reasonLabels: Record<string, string> = {
  harassment: "Harcèlement",
  fake_profile: "Faux profil",
  inappropriate_content: "Contenu inapproprié",
  spam: "Spam",
  dangerous_behavior: "Comportement dangereux",
  other: "Autre"
};

// Security: HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  return text.replace(/[&<>"'`=/]/g, (s) => map[s] || s);
}

// Security: Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Security: Validate username format
function isValidUsername(str: string): boolean {
  // Allow only alphanumeric, underscores, max 50 chars
  const usernameRegex = /^[a-zA-Z0-9_]{1,50}$/;
  return usernameRegex.test(str);
}

// Security: Validate reason
function isValidReason(reason: string): boolean {
  const validReasons = ['harassment', 'fake_profile', 'inappropriate_content', 'spam', 'dangerous_behavior', 'other'];
  return validReasons.includes(reason);
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { reportedUserId, reportedUsername, reason, description } = body as ReportRequest;

    console.log('Processing user report:', {
      reportedUserId,
      reportedUsername,
      reason,
      descriptionLength: description?.length || 0
    });

    // Security: Validate all required fields
    if (!reportedUserId || !reportedUsername || !reason || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Security: Validate input formats
    if (!isValidUUID(reportedUserId)) {
      console.error('Invalid UUID format:', reportedUserId);
      return new Response(
        JSON.stringify({ error: "Invalid user ID format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!isValidUsername(reportedUsername)) {
      console.error('Invalid username format:', reportedUsername);
      return new Response(
        JSON.stringify({ error: "Invalid username format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!isValidReason(reason)) {
      console.error('Invalid reason:', reason);
      return new Response(
        JSON.stringify({ error: "Invalid reason" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Security: Limit description length to prevent abuse
    if (description.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Description too long (max 5000 characters)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Security: Escape all user inputs before including in HTML email
    const safeUsername = escapeHtml(reportedUsername);
    const safeUserId = escapeHtml(reportedUserId);
    const safeReason = escapeHtml(reasonLabels[reason] || reason);
    const safeDescription = escapeHtml(description);

    const emailResponse = await resend.emails.send({
      from: "RunConnect Support <onboarding@resend.dev>",
      to: ["ferdinand.froidefont@gmail.com"],
      subject: `🚨 Signalement utilisateur - @${safeUsername}`,
      html: `
        <h1>Nouveau signalement d'utilisateur</h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>Informations du signalement</h2>
          <p><strong>Utilisateur signalé:</strong> @${safeUsername}</p>
          <p><strong>ID utilisateur:</strong> ${safeUserId}</p>
          <p><strong>Raison:</strong> ${safeReason}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Description détaillée:</h3>
          <p style="white-space: pre-wrap;">${safeDescription}</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p><strong>Actions recommandées:</strong></p>
          <ul>
            <li>Examiner le profil de l'utilisateur signalé</li>
            <li>Vérifier l'historique des signalements</li>
            <li>Prendre les mesures appropriées selon la politique de modération</li>
          </ul>
        </div>

        <p style="margin-top: 30px; color: #6c757d; font-size: 12px;">
          Ce signalement a été généré automatiquement par l'application RunConnect.
        </p>
      `,
    });

    console.log("Report email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in report-user function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
