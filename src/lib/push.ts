import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

let initialized = false;

export async function initPushNotifications(navigate: (path: string) => void) {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;
  initialized = true;

  try {
    // Register listeners BEFORE calling register(), otherwise the
    // `registration` event can fire before we're listening and the token
    // never reaches device_tokens.
    PushNotifications.addListener("registration", async ({ value }) => {
      try {
        console.log("APNs registration received, token prefix:", value?.slice(0, 12));
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !value) return;
        const env =
          (typeof window !== "undefined" &&
            (window as unknown as { __APNS_ENV__?: string }).__APNS_ENV__) ||
          "production";
        const { error } = await supabase
          .from("device_tokens")
          .upsert(
            { user_id: user.id, token: value, platform: "ios", environment: env },
            { onConflict: "token" },
          );
        if (error) console.error("device_tokens upsert error", error);
      } catch (e) {
        console.error("device_tokens upsert failed", e);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error", err);
    });

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      console.warn("Push permission not granted:", perm.receive);
      return;
    }

    await PushNotifications.register();


    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = (action.notification?.data ?? {}) as Record<string, unknown>;
      const type = data.type as string | undefined;
      try {
        if (type === "suggestions") {
          const today = new Date().toISOString().slice(0, 10);
          navigate(`/swipe/${today}`);
        } else if (type === "choice") {
          navigate("/plan");
        } else if (type === "weekly_reminder") {
          navigate("/plan");
        }
      } catch (e) {
        console.error("push navigation failed", e);
      }
    });
  } catch (e) {
    console.error("initPushNotifications failed", e);
  }
}
