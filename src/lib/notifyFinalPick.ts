import { supabase } from "@/integrations/supabase/client";

export const FINAL_PICK_PREFIX = "__final_pick__:";

export const isFinalPickMessage = (msg?: string | null) =>
  !!msg && msg.startsWith(FINAL_PICK_PREFIX);

export const finalPickTitle = (msg?: string | null) =>
  isFinalPickMessage(msg) ? (msg as string).slice(FINAL_PICK_PREFIX.length) : "";

export async function notifyPartnerFinalPick(
  userId: string,
  planDate: string,
  recipeTitle: string,
) {
  const { data: partnership } = await supabase
    .from("partnerships")
    .select("user_a, user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .maybeSingle();
  if (!partnership) return;
  const partnerId =
    partnership.user_a === userId ? partnership.user_b : partnership.user_a;
  await supabase.from("partner_notifications").insert({
    sender_id: userId,
    recipient_id: partnerId,
    plan_date: planDate,
    message: `${FINAL_PICK_PREFIX}${recipeTitle}`,
  });

  // Look up sender name for the push body
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const senderName = senderProfile?.display_name || "Je partner";

  supabase.functions
    .invoke("send-push", {
      body: {
        recipientUserId: partnerId,
        title: "Keuze gemaakt ✅",
        body: `${senderName} heeft gekozen wat jullie eten`,
        data: { type: "choice", planDate, recipeTitle },
      },
    })
    .catch((e) => console.error("send-push failed", e));
}
