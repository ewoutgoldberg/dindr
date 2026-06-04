import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IG_CLIENT_ID = Deno.env.get("INSTAGRAM_CLIENT_ID");
const TT_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");

const CALLBACK_BASE = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const { platform, creator_id, return_url } = await req.json();
    if (!["instagram", "tiktok"].includes(platform)) return json({ error: "invalid_platform" }, 400);
    if (!creator_id) return json({ error: "missing_creator_id" }, 400);

    // verify the caller owns the creator (or is admin)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: creator } = await admin
      .from("food_creators")
      .select("id, user_id")
      .eq("id", creator_id)
      .maybeSingle();
    if (!creator) return json({ error: "creator_not_found" }, 404);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;
    if (creator.user_id !== user.id && !isAdmin) return json({ error: "forbidden" }, 403);

    // state = base64({creator_id, platform, user_id, return_url, nonce})
    const statePayload = {
      creator_id,
      platform,
      user_id: user.id,
      return_url: return_url ?? "",
      nonce: crypto.randomUUID(),
    };
    const state = btoa(JSON.stringify(statePayload));

    let authUrl: string;
    if (platform === "instagram") {
      if (!IG_CLIENT_ID) return json({ error: "credentials_not_configured", platform }, 501);
      const redirect = `${CALLBACK_BASE}?platform=instagram`;
      const scopes = "instagram_basic,pages_show_list,instagram_manage_insights,pages_read_engagement";
      authUrl =
        `https://www.facebook.com/v19.0/dialog/oauth?client_id=${IG_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirect)}` +
        `&state=${encodeURIComponent(state)}` +
        `&scope=${encodeURIComponent(scopes)}&response_type=code`;
    } else {
      if (!TT_CLIENT_KEY) return json({ error: "credentials_not_configured", platform }, 501);
      const redirect = `${CALLBACK_BASE}?platform=tiktok`;
      const scopes = "user.info.basic,video.list";
      authUrl =
        `https://www.tiktok.com/v2/auth/authorize/?client_key=${TT_CLIENT_KEY}` +
        `&response_type=code&scope=${encodeURIComponent(scopes)}` +
        `&redirect_uri=${encodeURIComponent(redirect)}` +
        `&state=${encodeURIComponent(state)}`;
    }

    return json({ url: authUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
