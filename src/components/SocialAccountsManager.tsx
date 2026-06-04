import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Instagram, Music2, Loader2, Plug, Unplug, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Connection = {
  id: string;
  creator_id: string;
  platform: "instagram" | "tiktok";
  platform_username: string | null;
  status: "connected" | "disconnected" | "error";
  last_synced_at: string | null;
  last_error: string | null;
  connected_at: string;
};

const PLATFORMS: Array<{ key: "instagram" | "tiktok"; label: string; Icon: any; brand: string }> = [
  { key: "instagram", label: "Instagram", Icon: Instagram, brand: "text-pink-500" },
  { key: "tiktok", label: "TikTok", Icon: Music2, brand: "text-foreground" },
];

export const SocialAccountsManager = ({
  creatorId,
  isAdmin = false,
}: {
  creatorId: string;
  isAdmin?: boolean;
}) => {
  const [conns, setConns] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("creator_social_connections")
      .select("id, creator_id, platform, platform_username, status, last_synced_at, last_error, connected_at")
      .eq("creator_id", creatorId);
    setConns((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [creatorId]);

  const connect = async (platform: "instagram" | "tiktok") => {
    setBusy(`connect-${platform}`);
    try {
      const { data, error } = await supabase.functions.invoke("social-oauth-start", {
        body: { platform, creator_id: creatorId, return_url: window.location.pathname },
      });
      let payload: any = data;
      if (error && (error as any).context?.json) {
        try { payload = await (error as any).context.json(); } catch { /* ignore */ }
      }
      if (payload?.error === "credentials_not_configured") {
        toast.error(`${platform} OAuth is nog niet geconfigureerd door de beheerder.`);
        return;
      }
      if (error) throw error;
      if (payload?.url) {
        window.location.href = payload.url;
      } else {
        throw new Error("Geen OAuth URL ontvangen");
      }
    } catch (e) {
      toast.error(`Kon ${platform} niet verbinden: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (conn: Connection) => {
    if (!confirm(`${conn.platform} ontkoppelen?`)) return;
    setBusy(`dc-${conn.id}`);
    try {
      const { error } = await supabase.functions.invoke("social-disconnect", {
        body: { connection_id: conn.id, delete_posts: isAdmin },
      });
      if (error) throw error;
      toast.success("Ontkoppeld");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const syncNow = async () => {
    setBusy("sync");
    try {
      const { data, error } = await supabase.functions.invoke("social-sync", {
        body: { creator_id: creatorId },
      });
      if (error) throw error;
      const total = (data?.results ?? []).reduce((a: number, r: any) => a + (r.added ?? 0), 0);
      toast.success(`Sync klaar — ${total} nieuwe posts`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-soft">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-sm">Social accounts</h2>
        </div>
        {conns.some((c) => c.status === "connected") && (
          <Button size="sm" variant="ghost" onClick={syncNow} disabled={busy === "sync"}>
            {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="ml-1">Sync nu</span>
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Koppel Instagram en TikTok om je posts automatisch te tonen op je creator profiel.
      </p>

      <div className="space-y-2">
        {PLATFORMS.map(({ key, label, Icon, brand }) => {
          const conn = conns.find((c) => c.platform === key);
          const isConnected = conn?.status === "connected";
          return (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl border bg-background/40">
              <Icon className={`h-5 w-5 ${brand}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{label}</span>
                  {conn && (
                    <Badge
                      variant={isConnected ? "default" : conn.status === "error" ? "destructive" : "secondary"}
                      className="rounded-full text-[10px]"
                    >
                      {conn.status}
                    </Badge>
                  )}
                </div>
                {conn?.platform_username && (
                  <p className="text-xs text-muted-foreground truncate">@{conn.platform_username}</p>
                )}
                {conn?.last_error && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                    <AlertCircle className="h-3 w-3" /> {conn.last_error.slice(0, 80)}
                  </p>
                )}
              </div>
              {isConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => disconnect(conn!)}
                  disabled={busy === `dc-${conn!.id}`}
                >
                  {busy === `dc-${conn!.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                  <span className="ml-1">Ontkoppel</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => connect(key)}
                  disabled={busy === `connect-${key}`}
                >
                  {busy === `connect-${key}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verbind"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
