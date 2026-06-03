import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, LogOut, Users, Copy, Heart, X, Bell, ShoppingCart, Camera, BookOpen, ChevronRight, Shield, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";


type Profile = Tables<"profiles">;

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadNotifications();
  const { isAdmin } = useIsAdmin();
  const [hasCreatorProfile, setHasCreatorProfile] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(p);

    const { data: cp } = await supabase.from("food_creators").select("id").eq("user_id", user.id).maybeSingle();
    setHasCreatorProfile(!!cp);

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
    toast.success("Invite code copied!");
  };

  const connect = async () => {
    if (!user) return;
    const c = code.trim().toUpperCase();
    if (c.length !== 6) {
      toast.error("Enter a 6-character code");
      return;
    }
    setBusy(true);
    const { data: target } = await supabase.from("profiles").select("id").eq("invite_code", c).maybeSingle();
    if (!target) {
      setBusy(false);
      toast.error("Invalid code");
      return;
    }
    if (target.id === user.id) {
      setBusy(false);
      toast.error("That's your own code!");
      return;
    }
    const [a, b] = [user.id, target.id].sort();
    const { error } = await supabase.from("partnerships").insert({ user_a: a, user_b: b });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connected!");
    setCode("");
    load();
  };

  const disconnect = async () => {
    if (!partnershipId) return;
    await supabase.from("partnerships").delete().eq("id", partnershipId);
    toast.success("Disconnected");
    load();
  };

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB");
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
    toast.success("Photo updated");
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;


  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      {/* Profile header — compact & centered */}
      <section className="flex flex-col items-center mb-8">
        <div className="relative h-20 w-20 shrink-0 mb-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative h-full w-full rounded-full overflow-hidden active:scale-95 transition-transform"
            aria-label="Change profile photo"
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
        <h1 className="font-display font-extrabold text-xl">{profile?.display_name ?? "Cook"}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </section>

      {/* Menu items — single grouped card */}
      <section className="bg-card rounded-3xl shadow-soft overflow-hidden mb-5">
        <button
          onClick={() => navigate("/favorites")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">My recipe book</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="mx-5 h-px bg-border" />
        <button
          onClick={() => navigate("/shopping")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <ShoppingCart className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">Grocery list</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="mx-5 h-px bg-border" />
        <button
          onClick={() => navigate("/notifications")}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
        >
          <Bell className="h-5 w-5 text-primary shrink-0" />
          <span className="flex-1 font-semibold text-sm">Notifications</span>
          {unread > 0 ? (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {hasCreatorProfile && (
          <>
            <div className="mx-5 h-px bg-border" />
            <button
              onClick={() => navigate("/creator/dashboard")}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
            >
              <ChefHat className="h-5 w-5 text-primary shrink-0" />
              <span className="flex-1 font-semibold text-sm">Creator dashboard</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}
        {isAdmin && (
          <>
            <div className="mx-5 h-px bg-border" />
            <button
              onClick={() => navigate("/admin/creators")}
              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
            >
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <span className="flex-1 font-semibold text-sm">Admin · Creators</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}
      </section>

      {/* Cooking pair — compact */}
      <section className="bg-card rounded-3xl p-4 shadow-soft mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-display font-bold text-base">Cooking pair</h2>
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
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
            <Button variant="ghost" size="sm" onClick={disconnect} className="text-muted-foreground text-xs h-8 px-2.5 gap-1">
              <X className="h-3.5 w-3.5" /> Disconnect
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">Share your code to sync likes &amp; picks.</p>
            <button onClick={copyCode} className="w-full bg-muted rounded-xl px-4 py-3 flex items-center justify-between active:scale-[0.99] transition-transform mb-3">
              <span className="font-mono font-bold text-lg tracking-[0.3em]">{profile?.invite_code}</span>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" className="rounded-xl uppercase tracking-[0.3em] font-mono font-bold h-10" />
              <Button variant="hero" onClick={connect} disabled={busy} className="h-10 px-4">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}</Button>
            </div>
          </>
        )}
      </section>

      {/* Sign out — subtle */}
      <button
        onClick={signOut}
        className="w-full py-4 text-sm text-muted-foreground font-medium hover:text-destructive transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>

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
