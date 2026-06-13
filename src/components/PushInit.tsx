import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { initPushNotifications } from "@/lib/push";

export const PushInit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) return;
    initPushNotifications((path) => navigate(path));
  }, [user, navigate]);
  return null;
};
