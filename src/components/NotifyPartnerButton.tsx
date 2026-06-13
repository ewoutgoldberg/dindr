import { useEffect, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/hooks/usePartner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  planDate?: string; // YYYY-MM-DD; omit for "general" ping
  message?: string;
  variant?: "hero" | "outline" | "ghost" | "secondary" | "default";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
  disabled?: boolean;
};

export const NotifyPartnerButton = ({
  planDate,
  message,
  variant = "outline",
  size = "default",
  className,
  label,
  disabled,
}: Props) => {
  const { user } = useAuth();
  const { partner, loading } = usePartner();
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const timer = setTimeout(() => setConfirmOpen(false), 7000);
    return () => clearTimeout(timer);
  }, [confirmOpen]);

  if (loading) return null;
  if (!partner) return null;

  const partnerName = partner.display_name || "je partner";
  const buttonLabel = label || `Notify ${partnerName}`;
  const dayLabel = planDate ? format(parseISO(planDate), "EEEE d MMMM") : null;

  const send = async () => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("partner_notifications").insert({
      sender_id: user.id,
      recipient_id: partner.id,
      plan_date: planDate ?? null,
      message: message ?? null,
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send notification");
      return;
    }
    // Fire-and-forget push to partner
    const senderName =
      (user.user_metadata as { display_name?: string } | undefined)?.display_name ||
      user.email?.split("@")[0] ||
      "Je partner";
    supabase.functions
      .invoke("send-push", {
        body: {
          recipientUserId: partner.id,
          title: "Nieuwe eetsuggesties 🍽️",
          body: `${senderName} heeft suggesties klaargezet, maak een match!`,
          data: { type: "suggestions", planDate: planDate ?? null },
        },
      })
      .catch((e) => console.error("send-push failed", e));
    setConfirmOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={send}
        disabled={disabled || sending}
        className={cn(className)}
      >
        {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
        {buttonLabel}
      </Button>

      {confirmOpen && (
        <div
          className="fixed inset-x-0 top-4 z-[100] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="shrink-0 h-10 w-10 rounded-full bg-success/15 text-success grid place-items-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-bold text-foreground">
                  {partnerName} is op de hoogte 💌
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Je eetsuggesties{dayLabel ? <> voor <span className="font-semibold text-foreground">{dayLabel}</span></> : null} zijn gedeeld.
                  Nu is het afwachten of {partnerName} een <span className="font-semibold text-foreground">final pick</span> maakt of zelf met <span className="font-semibold text-foreground">suggesties</span> komt.
                </p>
              </div>
            </div>
            <div className="h-1 bg-primary/15 overflow-hidden">
              <div className="h-full bg-primary animate-[shrink_7s_linear_forwards] origin-left" style={{ transform: "scaleX(1)", animation: "notify-shrink 7s linear forwards" }} />
            </div>
          </div>
          <style>{`@keyframes notify-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`}</style>
        </div>
      )}
    </>
  );
};
