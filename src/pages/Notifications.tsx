import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Loader2, Trash2, CalendarDays } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Notif = {
  id: string;
  sender_id: string;
  recipient_id: string;
  plan_date: string | null;
  message: string | null;
  read_at: string | null;
  created_at: string;
  sender?: { display_name: string | null } | null;
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("partner_notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });

    const senderIds = Array.from(new Set((data ?? []).map((n) => n.sender_id)));
    const senderMap: Record<string, { display_name: string | null }> = {};
    if (senderIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", senderIds);
      profs?.forEach((p) => (senderMap[p.id] = { display_name: p.display_name }));
    }

    setItems((data ?? []).map((n) => ({ ...n, sender: senderMap[n.sender_id] ?? null })));
    setLoading(false);

    // Mark unread as read
    const unread = (data ?? []).filter((n) => !n.read_at).map((n) => n.id);
    if (unread.length > 0) {
      await supabase
        .from("partner_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    await supabase.from("partner_notifications").delete().eq("id", id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    toast.success("Removed");
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">Inbox</p>
          <h1 className="text-3xl font-display font-extrabold mt-1">Notifications</h1>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-full bg-muted grid place-items-center mx-auto mb-4">
            <Bell className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl">All caught up</h2>
          <p className="text-muted-foreground mt-2">When your partner pings you, it'll show up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const senderName = n.sender?.display_name || "Your partner";
            const dayLabel = n.plan_date ? format(parseISO(n.plan_date), "EEEE, MMM d") : null;
            return (
              <li key={n.id} className="bg-card rounded-2xl p-4 shadow-soft flex gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent-foreground grid place-items-center shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {senderName} has dinner suggestions ready{dayLabel ? <> for <span className="text-primary">{dayLabel}</span></> : ""}
                  </p>
                  {n.message && <p className="text-sm text-muted-foreground mt-0.5 italic">"{n.message}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="hero"
                      onClick={() => navigate(n.plan_date ? `/matches` : `/matches`)}
                    >
                      <CalendarDays className="h-4 w-4 mr-1.5" /> View matches
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Notifications;
