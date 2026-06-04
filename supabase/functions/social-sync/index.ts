import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: { creator_id?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const query = admin
    .from("creator_social_connections")
    .select("*")
    .eq("status", "connected");
  if (body.creator_id) query.eq("creator_id", body.creator_id);

  const { data: connections, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const results: Array<{ id: string; platform: string; added: number; error?: string }> = [];

  for (const conn of connections ?? []) {
    try {
      const posts = conn.platform === "instagram"
        ? await fetchInstagramPosts(conn)
        : await fetchTikTokPosts(conn);

      let added = 0;
      if (posts.length) {
        const { data: existing } = await admin
          .from("social_posts")
          .select("external_id")
          .eq("creator_id", conn.creator_id)
          .eq("platform", conn.platform)
          .in("external_id", posts.map((p) => p.external_id));
        const have = new Set((existing ?? []).map((r) => r.external_id));
        const fresh = posts.filter((p) => !have.has(p.external_id));
        if (fresh.length) {
          const rows = fresh.map((p) => ({ ...p, creator_id: conn.creator_id, platform: conn.platform }));
          const { error: insErr } = await admin.from("social_posts").insert(rows);
          if (insErr) throw insErr;
          added = fresh.length;
        }
      }

      await admin
        .from("creator_social_connections")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("id", conn.id);

      await admin.from("social_sync_logs").insert({
        connection_id: conn.id,
        creator_id: conn.creator_id,
        platform: conn.platform,
        status: "success",
        posts_added: added,
      });
      results.push({ id: conn.id, platform: conn.platform, added });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await admin
        .from("creator_social_connections")
        .update({ last_error: msg.slice(0, 500), status: "error" })
        .eq("id", conn.id);
      await admin.from("social_sync_logs").insert({
        connection_id: conn.id,
        creator_id: conn.creator_id,
        platform: conn.platform,
        status: "error",
        error_message: msg.slice(0, 1000),
      });
      results.push({ id: conn.id, platform: conn.platform, added: 0, error: msg });
    }
  }

  return json({ ok: true, processed: results.length, results });
});

type IncomingPost = {
  external_id: string;
  media_type: "image" | "video" | "carousel";
  media_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  post_url: string | null;
  posted_at: string | null;
};

async function fetchInstagramPosts(conn: any): Promise<IncomingPost[]> {
  if (!conn.access_token || !conn.platform_user_id) return [];
  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${conn.platform_user_id}/media?fields=${fields}&limit=25&access_token=${conn.access_token}`,
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`ig_media: ${JSON.stringify(json)}`);
  return (json.data ?? []).map((m: any): IncomingPost => ({
    external_id: String(m.id),
    media_type: m.media_type === "VIDEO" ? "video" : m.media_type === "CAROUSEL_ALBUM" ? "carousel" : "image",
    media_url: m.media_url ?? null,
    thumbnail_url: m.thumbnail_url ?? m.media_url ?? null,
    caption: m.caption ?? null,
    post_url: m.permalink ?? null,
    posted_at: m.timestamp ?? null,
  }));
}

async function fetchTikTokPosts(conn: any): Promise<IncomingPost[]> {
  if (!conn.access_token) return [];
  const fields = "id,title,cover_image_url,video_description,share_url,create_time,duration,embed_link";
  const res = await fetch(
    `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 20 }),
    },
  );
  const data = await res.json();
  if (!res.ok || data.error?.code && data.error.code !== "ok") {
    throw new Error(`tt_video_list: ${JSON.stringify(data)}`);
  }
  const list = data?.data?.videos ?? [];
  return list.map((v: any): IncomingPost => ({
    external_id: String(v.id),
    media_type: "video",
    media_url: v.embed_link ?? v.share_url ?? null,
    thumbnail_url: v.cover_image_url ?? null,
    caption: v.video_description ?? v.title ?? null,
    post_url: v.share_url ?? null,
    posted_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
  }));
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
