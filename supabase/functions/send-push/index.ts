// APNs push sender for Lovable Cloud
// Input: { recipientUserId: string, title: string, body: string, data?: Record<string, unknown> }
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID")!;
const APNS_DEFAULT_ENV = (Deno.env.get("APNS_DEFAULT_ENV") ?? "production").toLowerCase();

const APNS_HOSTS = {
  production: "https://api.push.apple.com",
  sandbox: "https://api.sandbox.push.apple.com",
} as const;

// --- ES256 JWT for APNs (cached 50min) ---
let cachedJwt: { token: string; exp: number } | null = null;

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.exp > now + 60) return cachedJwt.token;
  const key = await importPrivateKey(APNS_PRIVATE_KEY);
  const token = await create(
    { alg: "ES256", kid: APNS_KEY_ID, typ: "JWT" },
    { iss: APNS_TEAM_ID, iat: getNumericDate(0) },
    key,
  );
  cachedJwt = { token, exp: now + 50 * 60 };
  return token;
}

async function sendOne(
  host: string,
  token: string,
  payload: unknown,
  jwt: string,
): Promise<{ status: number; reason?: string }> {
  const res = await fetch(`${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  let reason: string | undefined;
  if (res.status !== 200) {
    try {
      const j = await res.json();
      reason = j?.reason;
    } catch { /* noop */ }
  }
  return { status: res.status, reason };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { recipientUserId, title, body, data } = await req.json();
    if (!recipientUserId || !title || !body) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: tokens, error } = await admin
      .from("device_tokens")
      .select("id, token, environment")
      .eq("user_id", recipientUserId);
    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = await getApnsJwt();
    const payload = {
      aps: { alert: { title, body }, sound: "default" },
      ...(data ?? {}),
    };

    let sent = 0;
    const removeIds: string[] = [];
    const results: Array<{ token: string; status: number; reason?: string }> = [];

    for (const row of tokens) {
      const envHost = row.environment === "sandbox" ? APNS_HOSTS.sandbox : APNS_HOSTS.production;
      let r = await sendOne(envHost, row.token, payload, jwt);

      // Fallback to opposite environment on BadDeviceToken / BadEnvironmentKeyInToken
      if (
        r.status !== 200 &&
        (r.reason === "BadDeviceToken" || r.reason === "BadEnvironmentKeyInToken")
      ) {
        const altHost = envHost === APNS_HOSTS.production ? APNS_HOSTS.sandbox : APNS_HOSTS.production;
        const r2 = await sendOne(altHost, row.token, payload, jwt);
        if (r2.status === 200) {
          await admin.from("device_tokens").update({
            environment: altHost === APNS_HOSTS.sandbox ? "sandbox" : "production",
          }).eq("id", row.id);
        }
        r = r2;
      }

      if (r.status === 200) {
        sent++;
      } else if (r.status === 410 || r.reason === "Unregistered" || r.reason === "BadDeviceToken") {
        removeIds.push(row.id);
      }
      results.push({ token: row.token.slice(0, 8) + "…", status: r.status, reason: r.reason });
    }

    if (removeIds.length > 0) {
      await admin.from("device_tokens").delete().in("id", removeIds);
    }

    return new Response(JSON.stringify({ sent, removed: removeIds.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
