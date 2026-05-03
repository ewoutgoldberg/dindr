import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
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

  if (loading) return null;
  if (!partner) return null;

  const partnerName = partner.display_name || "your partner";
  const buttonLabel = label || `Notify ${partnerName}`;

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
    toast.success(`${partnerName} has been notified 💌`);
  };

  return (
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
  );
};
