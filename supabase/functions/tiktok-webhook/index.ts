// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // =============================================================================
  // 1. MANEJO DE VERIFICACIÓN DEL WEBHOOK (GET)
  // =============================================================================
  if (req.method === "GET") {
    const challenge = url.searchParams.get("challenge") || url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("verify_token") || url.searchParams.get("hub.verify_token");

    if (challenge) {
      console.log(`Verificación de webhook recibida. Challenge: ${challenge}, VerifyToken: ${verifyToken}`);
      // En producción puedes validar el verifyToken contra la base de datos si lo deseas
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    return new Response("No challenge parameter provided", { status: 400 });
  }

  // =============================================================================
  // 2. RECEPCIÓN DE EVENTOS DE MENSAJES (POST)
  // =============================================================================
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    console.log("Evento de Webhook de TikTok recibido:", JSON.stringify(payload));

    // Validar si es un evento de webhook de TikTok
    if (payload.event) {
      const clientKey = payload.client_key;
      const createTime = payload.create_time;
      
      // Resolver datos de remitente y contenido del mensaje
      let sender_id = payload.user_openid;
      let rawContent = payload.content || "";
      let messageContent = "";

      // Intentar parsear el contenido si viene como un JSON serializado
      if (rawContent && typeof rawContent === "string" && rawContent.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(rawContent);
          messageContent = parsed.text || parsed.content || rawContent;
        } catch {
          messageContent = rawContent;
        }
      } else {
        messageContent = rawContent;
      }

      // Soporte para simulaciones previas locales
      if (payload.message) {
        sender_id = payload.message.sender_id || sender_id;
        messageContent = payload.message.content || messageContent;
      }

      if (!sender_id) {
        return new Response(JSON.stringify({ message: "Evento recibido pero sin identificador de usuario remitente." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Intentar resolver la empresa dueña de la cuenta de TikTok
      let empresaId = url.searchParams.get("empresa_id");
      
      if (!empresaId) {
        // Buscar empresa por su Client Key (tiktok_app_id) directo del payload
        if (clientKey) {
          const { data: config } = await adminClient
            .from("crm_config_tiktok")
            .select("empresa_id")
            .eq("tiktok_app_id", clientKey)
            .maybeSingle();

          if (config) {
            empresaId = config.empresa_id;
          }
        }
        
        // Fallback: Si no se encuentra, buscar por el primer activo en desarrollo
        if (!empresaId) {
          const { data: fallbackConfig } = await adminClient
            .from("crm_config_tiktok")
            .select("empresa_id")
            .eq("activo", true)
            .limit(1)
            .maybeSingle();
          
          if (fallbackConfig) {
            empresaId = fallbackConfig.empresa_id;
          }
        }
      }

      if (!empresaId) {
        return new Response(JSON.stringify({ error: "No se pudo determinar la empresa del destinatario." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Buscar si ya existe la conversación en crm_conversaciones
      let { data: conv } = await adminClient
        .from("crm_conversaciones")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("tiktok_user_id", sender_id)
        .maybeSingle();

      const msgTimeStr = createTime 
        ? new Date(createTime * 1000).toISOString() 
        : new Date().toISOString();

      if (!conv) {
        // Intentar resolver el perfil del remitente llamando a la API de TikTok si se tiene Token de la empresa
        let nombreContacto = `Usuario TikTok (${sender_id.slice(-6)})`;
        let usernameContacto = `@user_${sender_id.slice(-6)}`;
        let avatarUrl = null;

        // Intentar obtener el token de acceso para consultar el perfil
        const { data: tokenData } = await adminClient
          .from("crm_config_tiktok")
          .select("access_token")
          .eq("empresa_id", empresaId)
          .maybeSingle();

        if (tokenData?.access_token) {
          try {
            const profileRes = await fetch(`https://business-api.tiktok.com/open_api/v1.3/business/im/user/profile/?user_id=${sender_id}`, {
              headers: {
                "Access-Token": tokenData.access_token,
              },
            });
            const profileData = await profileRes.json();
            if (profileData.code === 0 && profileData.data) {
              nombreContacto = profileData.data.display_name || nombreContacto;
              usernameContacto = profileData.data.username ? `@${profileData.data.username}` : usernameContacto;
              avatarUrl = profileData.data.avatar_url || avatarUrl;
            }
          } catch (err) {
            console.warn("Error al consultar perfil del usuario en TikTok:", err);
          }
        }

        // Crear la conversación
        const { data: newConv, error: errNewConv } = await adminClient
          .from('crm_conversaciones')
          .insert({
            empresa_id: empresaId,
            tiktok_user_id: sender_id,
            nombre_contacto: nombreContacto,
            username_contacto: usernameContacto,
            avatar_url: avatarUrl,
            estado: "pendiente",
            no_leidos: 1,
            ultimo_mensaje: messageContent,
            ultimo_mensaje_at: msgTimeStr,
          })
          .select("*")
          .single();

        if (errNewConv) throw errNewConv;
        conv = newConv;
      } else {
        // Actualizar la conversación existente
        const { error: errUpdate } = await adminClient
          .from('crm_conversaciones')
          .update({
            ultimo_mensaje: messageContent,
            ultimo_mensaje_at: msgTimeStr,
            no_leidos: conv.no_leidos + 1,
            estado: conv.estado === "cerrado" ? "pendiente" : conv.estado,
            actualizado_en: new Date().toISOString(),
          })
          .eq("id", conv.id);

        if (errUpdate) console.error("Error al actualizar conversación:", errUpdate);
      }

      // 2. Insertar el mensaje entrante en crm_mensajes
      const { error: errMsgError } = await adminClient
        .from('crm_mensajes')
        .insert({
          conversacion_id: conv.id,
          direccion: "inbound",
          contenido: messageContent,
          leido: false,
          creado_en: msgTimeStr,
        });

      if (errMsgError) throw errMsgError;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Evento ignorado o no soportado." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error en webhook handler:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
