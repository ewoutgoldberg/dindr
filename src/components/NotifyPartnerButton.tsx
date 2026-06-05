import { useEffect, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
    const timer = setTimeout(() => setConfirmOpen(false), 2500);
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
        <DialogContent className="max-w-[280px] overflow-hidden p-0 text-center">
          <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-background px-5 pt-5 pb-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-success text-success-foreground grid place-items-center shadow-soft mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-display font-bold">
                {partnerName} is op de hoogte 💌
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed">
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

          <div className="px-5 pb-5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nu afwachten of {partnerName} een <span className="font-semibold text-foreground">final pick</span> maakt
              of zelf met <span className="font-semibold text-foreground">suggesties</span> komt.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
