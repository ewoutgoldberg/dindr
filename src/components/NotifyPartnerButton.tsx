import { useState } from "react";
import { Send, Loader2, CheckCircle2, CalendarDays, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartner } from "@/hooks/usePartner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm overflow-hidden p-0">
          <div className="relative bg-gradient-to-br from-primary/15 via-accent/10 to-background px-6 pt-6 pb-4">
            <div className="h-14 w-14 rounded-2xl bg-success text-success-foreground grid place-items-center shadow-soft mb-3">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-xl font-display font-extrabold">
                {partnerName} is op de hoogte 💌
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                We hebben {partnerName} laten weten dat jouw eetsuggesties
                {dayLabel ? (
                  <> voor <span className="text-primary font-semibold">{dayLabel}</span> </>
                ) : (
                  " "
                )}
                klaarstaan.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-2 space-y-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3 flex gap-3">
              <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Wacht nu tot {partnerName} een <span className="font-semibold text-foreground">final pick</span> maakt.
                Daarna zie je het gekozen gerecht terug onder <span className="font-semibold text-foreground">Plan</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 flex-row gap-2 sm:justify-stretch">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Sluiten
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={() => {
                setConfirmOpen(false);
                navigate("/plan");
              }}
            >
              <CalendarDays className="h-4 w-4 mr-1.5" /> Naar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
