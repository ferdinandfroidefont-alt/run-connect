import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportedUserId, reportedUsername, reason, description }: ReportRequest = await req.json();

    console.log('Processing user report:', {
      reportedUserId,
      reportedUsername,
      reason,
      descriptionLength: description.length
    });

    // Validate required fields
    if (!reportedUserId || !reportedUsername || !reason || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "RunConnect <no-reply@lovable.app>",
      to: ["support@runconnect.app"], // Remplacez par l'email de support réel
      subject: `🚨 Signalement utilisateur - @${reportedUsername}`,
      html: `
        <h1>Nouveau signalement d'utilisateur</h1>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>Informations du signalement</h2>
          <p><strong>Utilisateur signalé:</strong> @${reportedUsername}</p>
          <p><strong>ID utilisateur:</strong> ${reportedUserId}</p>
          <p><strong>Raison:</strong> ${reasonLabels[reason] || reason}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        </div>

        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Description détaillée:</h3>
          <p style="white-space: pre-wrap;">${description}</p>
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
  } catch (error: any) {
    console.error("Error in report-user function:", error);
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