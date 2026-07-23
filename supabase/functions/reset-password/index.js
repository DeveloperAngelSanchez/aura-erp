import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { code, new_password } = await req.json();

    if (!code || !new_password) {
      return new Response(JSON.stringify({ error: "Campos requeridos: code, new_password." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: "La contraseña debe tener al menos 6 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar token válido
    const { data: token, error: tokenError } = await adminClient
      .from("password_reset_tokens")
      .select("id, user_id, expires_at")
      .eq("code", code)
      .is("used_at", null)
      .single();

    if (tokenError || !token) {
      return new Response(JSON.stringify({ error: "Código inválido o ya fue usado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar expiración
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    if (now > expiresAt) {
      return new Response(JSON.stringify({ error: "El código ha expirado. Solicita uno nuevo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Actualizar contraseña
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      token.user_id,
      { password: new_password }
    );

    if (updateError) {
      return new Response(JSON.stringify({ error: "Error al actualizar la contraseña.", details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marcar token como usado
    const { error: markError } = await adminClient
      .from("password_reset_tokens")
      .update({ used_at: now.toISOString() })
      .eq("id", token.id);

    if (markError) {
      console.error("Error marking token as used:", markError);
    }

    return new Response(JSON.stringify({
      message: "Contraseña actualizada exitosamente.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});