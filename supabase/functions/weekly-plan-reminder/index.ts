// Weekly meal-plan reminder. Pushes to users without any meal_plan rows for the upcoming 7 days.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // All users with at least one device token
  const { data: tokenRows, error: tErr } = await admin
    .from("device_tokens")
    .select("user_id");
  if (tErr) {
    return new Response(JSON.stringify({ error: tErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userIds = Array.from(new Set((tokenRows ?? []).map((r) => r.user_id)));
  if (userIds.length === 0) {
    return new Response(JSON.stringify({ notified: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = new Date();
  const start = today.toISOString().slice(0, 10);
  const endDate = new Date(today);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const end = endDate.toISOString().slice(0, 10);

  const { data: plans } = await admin
    .from("meal_plans")
    .select("user_id")
    .gte("plan_date", start)
    .lte("plan_date", end)
    .in("user_id", userIds);
  const planned = new Set((plans ?? []).map((p) => p.user_id));
  const needsReminder = userIds.filter((u) => !planned.has(u));

  let notified = 0;
  for (const uid of needsReminder) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        recipientUserId: uid,
        title: "Weekplanning 📅",
        body: "Vergeet je planning niet door te geven!",
        data: { type: "weekly_reminder" },
      }),
    });
    if (res.ok) notified++;
  }

  return new Response(JSON.stringify({ candidates: needsReminder.length, notified }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
