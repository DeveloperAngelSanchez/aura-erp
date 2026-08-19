// @ts-nocheck
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

    const { code, empresa_id, redirect_uri } = await req.json();

    if (!code || !empresa_id) {
      return new Response(JSON.stringify({ error: "Faltan parámetros requeridos: code, empresa_id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Obtener la configuración actual de TikTok para extraer client_key y client_secret
    const { data: config, error: configError } = await adminClient
      .from("crm_config_tiktok")
      .select("*")
      .eq("empresa_id", empresa_id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "No se encontró configuración de TikTok para la empresa." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tiktok_app_id, tiktok_app_secret } = config;

    if (!tiktok_app_id || !tiktok_app_secret) {
      return new Response(JSON.stringify({ error: "Falta configurar TikTok App ID o App Secret en el ERP primero." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Realizar petición de intercambio de token a la API v2 de TikTok
    // Endpoint oficial v2: https://open.tiktokapis.com/v2/oauth/token/
    const exchangeUrl = "https://open.tiktokapis.com/v2/oauth/token/";
    
    const bodyParams = new URLSearchParams();
    bodyParams.append("client_key", tiktok_app_id);
    bodyParams.append("client_secret", tiktok_app_secret);
    bodyParams.append("code", code);
    bodyParams.append("grant_type", "authorization_code");
    if (redirect_uri) {
      bodyParams.append("redirect_uri", redirect_uri);
    }

    const res = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const resData = await res.json();

    if (resData.error) {
      return new Response(JSON.stringify({ 
        error: "Error retornado por la API de TikTok al intercambiar token.", 
        details: resData.error_description || resData.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = resData.access_token;
    const refreshToken = resData.refresh_token;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "No se recibió un access_token válido de TikTok." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obtener perfil comercial para capturar el ID único de la cuenta de TikTok
    let tiktokBusinessId = null;
    try {
      const infoRes = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/info/", {
        headers: {
          "Access-Token": accessToken,
        },
      });
      const infoData = await infoRes.json();
      if (infoData.code === 0 && infoData.data) {
        tiktokBusinessId = infoData.data.open_id || infoData.data.advertiser_id || infoData.data.username || null;
      }
    } catch (err) {
      console.warn("No se pudo obtener el perfil de negocio comercial:", err);
    }

    // 3. Guardar el access_token, refresh_token y tiktok_business_id en la base de datos
    const { error: updateError } = await adminClient
      .from("crm_config_tiktok")
      .update({
        access_token: accessToken,
        refresh_token: refreshToken || null,
        tiktok_business_id: tiktokBusinessId,
        activo: true,
        actualizado_en: new Date().toISOString(),
      })
      .eq("empresa_id", empresa_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Error al actualizar las credenciales de la base de datos.", details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Conexión de TikTok realizada exitosamente.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
