import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LogOut, Users, Copy, X, Bell, ShoppingCart, Camera, BookOpen, ChevronRight, Shield, Languages, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setLanguage, SupportedLang } from "@/i18n";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsCreator, setViewMode } from "@/hooks/useIsCreator";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Profile = Tables<"profiles">;

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const unread = useUnreadNotifications();
  const { isAdmin } = useIsAdmin();
  const { hasCreatorProfile, viewMode } = useIsCreator();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLang: SupportedLang = (i18n.language?.startsWith("en") ? "en" : "nl");

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(p);

    const { data: partnership } = await supabase
      .from("partnerships")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .maybeSingle();

    if (partnership) {
      setPartnershipId(partnership.id);
      const partnerId = partnership.user_a === user.id ? partnership.user_b : partnership.user_a;
      const { data: pp } = await supabase.from("profiles").select("*").eq("id", partnerId).maybeSingle();
      setPartner(pp);
    } else {
      setPartner(null);
      setPartnershipId(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const copyCode = () => {
    if (!profile?.invite_code) return;
    navigator.clipboard.writeText(profile.invite_code);
    toast.success(t("profile.inviteCodeCopied"));
  };

  const connect = async () => {
    if (!user) return;
    const c = code.trim().toUpperCase();
    if (c.length !== 6) {
      toast.error(t("profile.enter6CharCode"));
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("connect_partner_by_code", { _invite_code: c });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("profile.connectedToast"));
    setCode("");
    load();
  };

  const disconnect = async () => {
    if (!partnershipId) return;
    await supabase.from("partnerships").delete().eq("id", partnershipId);
    toast.success(t("profile.disconnected"));
    load();
  };

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("profile.imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadCropped = async (blob: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    const path = `avatars/${user.id}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("lovable-uploads")
      .upload(path, blob, { cacheControl: "3600", upsert: true, contentType: "image/jpeg" });
    if (upErr) {
      setUploadingAvatar(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("lovable-uploads").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setUploadingAvatar(false);
    setCropSrc(null);
    if (updErr) {
      toast.error(updErr.message);
      return;
    }
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    toast.success(t("profile.photoUpdated"));
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 pb-28 animate-fade-in relative">
      {hasCreatorProfile && (
        <button
          onClick={() => {
            setViewMode(viewMode === "creator" ? "consumer" : "creator");
            if (viewMode !== "creator") navigate("/creator/dashboard");
          }}
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-30 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-foreground text-background pl-4 pr-5 py-3 text-sm font-semibold shadow-[0_8px_24px_-4px_hsl(var(--foreground)/0.35)] hover:scale-[1.03] active:scale-[0.98] transition-transform"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {viewMode === "creator" ? t("profile.switchToChef") : t("profile.switchToCreator")}
        </button>
      )}
      {/* Profile header */}
      <section className="flex flex-col items-center mb-8">
        <div className="relative h-20 w-20 shrink-0 mb-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-full w-full rounded-full overflow-hidden active:scale-95 transition-transform"
            aria-label={t("profile.changePhoto")}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full gradient-primary grid place-items-center text-primary-foreground font-display font-extrabold text-3xl">
                {(profile?.display_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-background/40 opacity-0 hover:opacity-100 grid place-items-center transition-opacity">
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-foreground animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-foreground" />
              )}
            </div>
          </button>
          <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-soft border-2 border-background pointer-events-none">
            {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickAvatar}
        />
        <h1 className="font-display font-extrabold text-xl">{profile?.display_name ?? t("profile.cook")}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </section>

      {/* Menu items */}
      <section className="bg-card rounded-3xl shadow-soft overflow-hidden mb-5">
        <button
          onClick={() => navigate("/favorites")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">{t("profile.myRecipeBook")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="mx-5 h-px bg-border" />
        <button
          onClick={() => navigate("/shopping")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <ShoppingCart className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">{t("profile.groceryList")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="mx-5 h-px bg-border" />
        <button
          onClick={() => navigate("/notifications")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <Bell className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">{t("profile.notifications")}</span>
          {unread > 0 ? (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <div className="mx-5 h-px bg-border" />
        <button
          onClick={() => navigate("/onboarding?replay=1")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">{t("onboarding.replay")}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </section>

      {/* Language toggle */}
      <section className="bg-card rounded-3xl shadow-soft overflow-hidden mb-5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Languages className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-base">{t("profile.language")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-muted/60 rounded-xl p-1">
          {(["nl", "en"] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => setLanguage(lng)}
              className={cn(
                "py-2 rounded-lg text-sm font-semibold transition-colors",
                currentLang === lng ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={currentLang === lng}
            >
              {lng === "nl" ? t("profile.languageDutch") : t("profile.languageEnglish")}
            </button>
          ))}
        </div>
      </section>

      {isAdmin && (
        <section className="bg-card rounded-3xl shadow-soft overflow-hidden mb-5">
          <button
            onClick={() => navigate("/admin/creators")}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
          >
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <span className="flex-1 font-semibold text-sm">{t("profile.admin")}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </section>
      )}

      {/* Cooking pair */}
      <section className="bg-card rounded-3xl p-4 shadow-soft mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-base">{t("profile.cookingPair")}</h2>
        </div>
        {partner ? (
          <div className="flex items-center gap-2.5">
            {partner.avatar_url ? (
              <img src={partner.avatar_url} alt={partner.display_name ?? "Partner"} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full gradient-warm grid place-items-center text-primary-foreground text-sm font-bold">
                {partner.display_name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{partner.display_name}</p>
              <p className="text-xs text-muted-foreground">{t("profile.connected")}</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground text-xs h-8 px-2.5 gap-1">
                  <X className="h-3.5 w-3.5" /> {t("profile.disconnect")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("profile.disconnectTitle", { name: partner.display_name ?? t("profile.disconnectFromPartner") })}</AlertDialogTitle>
                  <AlertDialogDescription>{t("profile.disconnectDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("profile.keepConnected")}</AlertDialogCancel>
                  <AlertDialogAction onClick={disconnect}>{t("profile.disconnect")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">{t("profile.shareCode")}</p>
            <button onClick={copyCode} className="w-full bg-muted rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.99] transition-transform mb-3">
              <span className="font-mono font-bold text-lg tracking-[0.3em]">{profile?.invite_code}</span>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
            <p className="text-xs text-muted-foreground mb-1.5">{t("profile.partnerCodeLabel")}</p>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" className="rounded-xl uppercase tracking-[0.3em] font-mono font-bold h-10" />
              <Button variant="hero" onClick={connect} disabled={busy} className="h-10 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("profile.connect")}</Button>
            </div>
          </>
        )}
      </section>

      {/* Sign out */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="w-full py-4 text-sm text-muted-foreground font-medium hover:text-destructive transition-colors flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" /> {t("profile.signOut")}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profile.signOutTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("profile.signOutDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("profile.staySignedIn")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut().then(() => navigate("/auth", { replace: true }))}>
              {t("profile.signOut")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AvatarCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={uploadCropped}
      />
    </div>
  );
};

export default Profile;
