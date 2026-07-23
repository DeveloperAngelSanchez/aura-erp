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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Falta cabecera de autorización." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido.", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from("perfiles")
      .select("id, rol, sucursal_id, rol_sistema")
      .eq("id", user.id)
      .single();

    if (callerError || !callerProfile) {
      return new Response(JSON.stringify({ error: "Perfil no encontrado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerProfile.rol_sistema !== "sistema_admin" && callerProfile.rol !== "admin") {
      return new Response(JSON.stringify({ error: "No autorizado. Se requiere rol admin o permiso gestionar_usuarios." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, nombre, rol, sucursal_id, comision_porcentaje } = await req.json();

    if (!email || !password || !nombre || !rol || !sucursal_id) {
      return new Response(JSON.stringify({ error: "Campos requeridos: email, password, nombre, rol, sucursal_id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["cajero", "barbero", "admin"].includes(rol)) {
      return new Response(JSON.stringify({ error: "Rol inválido. Debe ser admin, cajero o barbero." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (rol === "admin" && callerProfile.rol_sistema !== "sistema_admin") {
      return new Response(JSON.stringify({ error: "Solo el sistema_admin puede crear usuarios con rol admin." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerProfile.rol_sistema !== "sistema_admin") {
      const { data: targetBranch, error: branchError } = await adminClient
        .from("sucursales")
        .select("empresa_id, id")
        .eq("id", sucursal_id)
        .single();

      if (branchError || !targetBranch) {
        return new Response(JSON.stringify({ error: "La sucursal destino no existe." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: callerBranch, error: callerBranchError } = await adminClient
        .from("sucursales")
        .select("empresa_id")
        .eq("id", callerProfile.sucursal_id)
        .single();

      if (callerBranchError || !callerBranch) {
        return new Response(JSON.stringify({ error: "Error al validar empresa del administrador." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (callerBranch.empresa_id !== targetBranch.empresa_id) {
        return new Response(JSON.stringify({ error: "La sucursal destino no pertenece a tu empresa." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userMetadata = {
      nombre,
      rol,
      sucursal_id,
      comision_porcentaje: rol === "barbero" ? (Number(comision_porcentaje) || null) : null,
    };

    const { data: newUserData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createUserError || !newUserData?.user) {
      return new Response(JSON.stringify({
        error: "Error al crear el usuario en Auth.",
        details: createUserError?.message,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      message: "Usuario creado exitosamente.",
      user: {
        id: newUserData.user.id,
        email: newUserData.user.email,
        nombre,
        rol,
        sucursal_id,
      },
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