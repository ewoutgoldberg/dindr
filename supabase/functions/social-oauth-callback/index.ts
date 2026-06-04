import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IG_CLIENT_ID = Deno.env.get("INSTAGRAM_CLIENT_ID");
const IG_CLIENT_SECRET = Deno.env.get("INSTAGRAM_CLIENT_SECRET");
const TT_CLIENT_KEY = Deno.env.get("TIKTOK_CLIENT_KEY");
const TT_CLIENT_SECRET = Deno.env.get("TIKTOK_CLIENT_SECRET");

const CALLBACK_BASE = `${SUPABASE_URL}/functions/v1/social-oauth-callback`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) return htmlResponse(`OAuth error: ${errorParam}`, "");
  if (!platform || !code || !stateRaw) return htmlResponse("Missing parameters", "");

  let state: { creator_id: string; platform: string; user_id: string; return_url?: string };
  try {
    state = JSON.parse(atob(stateRaw));
  } catch {
    return htmlResponse("Invalid state", "");
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    let tokens: {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      platform_user_id?: string;
      platform_username?: string;
      scope?: string;
    };

    if (platform === "instagram") {
      if (!IG_CLIENT_ID || !IG_CLIENT_SECRET) throw new Error("instagram_credentials_missing");
      const redirect = `${CALLBACK_BASE}?platform=instagram`;
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?` +
          new URLSearchParams({
            client_id: IG_CLIENT_ID,
            client_secret: IG_CLIENT_SECRET,
            redirect_uri: redirect,
            code,
          }),
      );
      const tok = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`ig_token_exchange: ${JSON.stringify(tok)}`);

      // fetch IG business user id via /me/accounts -> instagram_business_account
      const me = await fetch(
        `https://graph.facebook.com/v19.0/me/accounts?access_token=${tok.access_token}`,
      ).then((r) => r.json());
      const page = me?.data?.[0];
      let igId: string | undefined;
      let igUsername: string | undefined;
      if (page) {
        const pageDetail = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${tok.access_token}`,
        ).then((r) => r.json());
        igId = pageDetail?.instagram_business_account?.id;
        if (igId) {
          const igInfo = await fetch(
            `https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${tok.access_token}`,
          ).then((r) => r.json());
          igUsername = igInfo?.username;
        }
      }
      tokens = {
        access_token: tok.access_token,
        expires_in: tok.expires_in,
        platform_user_id: igId,
        platform_username: igUsername,
      };
    } else if (platform === "tiktok") {
      if (!TT_CLIENT_KEY || !TT_CLIENT_SECRET) throw new Error("tiktok_credentials_missing");
      const redirect = `${CALLBACK_BASE}?platform=tiktok`;
      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: TT_CLIENT_KEY,
          client_secret: TT_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirect,
        }),
      });
      const tok = await tokenRes.json();
      if (!tokenRes.ok || tok.error) throw new Error(`tt_token_exchange: ${JSON.stringify(tok)}`);

      const userInfo = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,username,display_name",
        { headers: { Authorization: `Bearer ${tok.access_token}` } },
      ).then((r) => r.json());

      tokens = {
        access_token: tok.access_token,
        refresh_token: tok.refresh_token,
        expires_in: tok.expires_in,
        scope: tok.scope,
        platform_user_id: tok.open_id ?? userInfo?.data?.user?.open_id,
        platform_username: userInfo?.data?.user?.username ?? userInfo?.data?.user?.display_name,
      };
    } else {
      throw new Error("unknown_platform");
    }

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await admin.from("creator_social_connections").upsert(
      {
        creator_id: state.creator_id,
        platform,
        platform_user_id: tokens.platform_user_id ?? null,
        platform_username: tokens.platform_username ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: expiresAt,
        scope: tokens.scope ?? null,
        status: "connected",
        last_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "creator_id,platform" },
    );

    // Trigger an initial sync (fire & forget)
    fetch(`${SUPABASE_URL}/functions/v1/social-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ creator_id: state.creator_id }),
    }).catch(() => {});

    const ret = state.return_url || "/creator/dashboard";
    return htmlResponse(`${platform} connected`, ret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from("creator_social_connections").upsert(
      {
        creator_id: state.creator_id,
        platform,
        status: "error",
        last_error: msg.slice(0, 500),
      },
      { onConflict: "creator_id,platform" },
    );
    return htmlResponse(`OAuth failed: ${msg}`, state.return_url || "/creator/dashboard");
  }
});

function htmlResponse(message: string, returnUrl: string) {
  const safeReturn = returnUrl ? returnUrl.replace(/[<>"']/g, "") : "";
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>${message}</title>
<style>body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#0d0d10;color:#fff;text-align:center;padding:24px}</style></head>
<body><div><h1>${message}</h1><p>Je wordt teruggestuurd...</p></div>
<script>setTimeout(function(){ if(${JSON.stringify(safeReturn)}) location.href=${JSON.stringify(safeReturn)}; else window.close(); }, 1200);</script>
</body></html>`;
  return new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
