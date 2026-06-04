import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";

type Notif = {
  id: string;
  sender_id: string;
  plan_date: string | null;
  message: string | null;
  created_at: string;
  sender_name?: string | null;
};

export const PingPopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState<Notif | null>(null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!user || shown) return;
    const load = async () => {
      const { data } = await supabase
        .from("partner_notifications")
        .select("id, sender_id, plan_date, message, created_at")
        .eq("recipient_id", user.id)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", data.sender_id)
        .maybeSingle();
      setNotif({ ...data, sender_name: prof?.display_name ?? null });
      setOpen(true);
      setShown(true);
    };
    load();
  }, [user, shown]);

  const dismiss = async () => {
    if (notif) {
      await supabase
        .from("partner_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notif.id);
    }
    setOpen(false);
  };

  const view = async () => {
    await dismiss();
    navigate("/matches");
  };

  if (!notif) return null;
  const senderName = notif.sender_name || "Your partner";
  const dayLabel = notif.plan_date ? format(parseISO(notif.plan_date), "EEEE, MMM d") : null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="h-12 w-12 rounded-2xl bg-accent/15 text-accent-foreground grid place-items-center mb-2">
            <Bell className="h-6 w-6" />
          </div>
          <DialogTitle>{senderName} pinged you 💌</DialogTitle>
          <DialogDescription>
            {senderName} has dinner suggestions ready{dayLabel ? <> for <span className="text-primary font-semibold">{dayLabel}</span></> : ""}.
          </DialogDescription>
        </DialogHeader>
        {notif.message && (
          <p className="text-sm italic text-muted-foreground">"{notif.message}"</p>
        )}
        <div className="flex gap-2 mt-2">
          <Button variant="hero" className="flex-1" onClick={view}>
            <CalendarDays className="h-4 w-4 mr-1.5" /> View matches
          </Button>
          <Button variant="ghost" onClick={dismiss}>Later</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
