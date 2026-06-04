import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { SocialAccountsManager } from "@/components/SocialAccountsManager";
import { ScrollText } from "lucide-react";

type Log = {
  id: string;
  platform: string | null;
  status: "success" | "error";
  posts_added: number;
  error_message: string | null;
  created_at: string;
};

export const AdminSocialPanel = ({ creatorId }: { creatorId: string }) => {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_sync_logs")
        .select("id, platform, status, posts_added, error_message, created_at")
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
        .limit(15);
      setLogs((data as any) ?? []);
    })();
  }, [creatorId]);

  return (
    <div className="space-y-4">
      <SocialAccountsManager creatorId={creatorId} isAdmin />

      <div className="bg-card rounded-2xl p-4 shadow-soft">
        <div className="flex items-center gap-2 mb-3">
          <ScrollText className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-sm">Sync logs (laatste 15)</h2>
        </div>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nog geen syncs uitgevoerd.</p>
        ) : (
          <ul className="space-y-1">
            {logs.map((l) => (
              <li key={l.id} className="text-xs flex items-center gap-2 py-1 border-b last:border-0">
                <Badge
                  variant={l.status === "success" ? "default" : "destructive"}
                  className="text-[10px] rounded-full"
                >
                  {l.status}
                </Badge>
                <span className="capitalize font-medium">{l.platform}</span>
                <span className="text-muted-foreground">+{l.posts_added}</span>
                <span className="text-muted-foreground ml-auto">
                  {new Date(l.created_at).toLocaleString()}
                </span>
                {l.error_message && (
                  <span className="text-destructive truncate max-w-[60%]" title={l.error_message}>
                    {l.error_message.slice(0, 60)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
