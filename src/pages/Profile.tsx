import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut, Users, Copy, Heart, X, Bell, ShoppingCart, Camera } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";


type Profile = Tables<"profiles">;

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(p);
    setName(p?.display_name ?? "");

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

  const saveName = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ display_name: name.trim().slice(0, 60) }).eq("id", user.id);
    toast.success("Saved");
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider">Account</p>
        <h1 className="text-3xl font-display font-extrabold mt-1">Profile</h1>
      </header>

      <section className="bg-card rounded-3xl p-5 shadow-soft mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full gradient-primary grid place-items-center text-primary-foreground font-display font-extrabold text-2xl">
            {(profile?.display_name ?? user?.email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg truncate">{profile?.display_name ?? "Cook"}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Label htmlFor="name">Display name</Label>
        <div className="flex gap-2 mt-1">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="rounded-xl" />
          <Button variant="secondary" onClick={saveName}>Save</Button>
        </div>
      </section>

      <section className="bg-card rounded-3xl p-5 shadow-soft mb-5">
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Cooking pair</h2>
        {partner ? (
          <div className="mt-3 flex items-center gap-3 bg-muted rounded-2xl p-3">
            <div className="h-12 w-12 rounded-full gradient-warm grid place-items-center text-primary-foreground font-bold">
              {partner.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold flex items-center gap-1.5"><Heart className="h-4 w-4 text-primary fill-primary" /> Connected</p>
              <p className="text-sm text-muted-foreground truncate">{partner.display_name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={disconnect} className="text-muted-foreground"><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mt-2 mb-4">Share your code with someone to plan meals together. Likes, shopping list and final picks will sync.</p>
            <Label>Your invite code</Label>
            <button onClick={copyCode} className="mt-1 w-full bg-muted rounded-2xl p-4 flex items-center justify-between active:scale-[0.99]">
              <span className="font-mono font-bold text-2xl tracking-[0.3em]">{profile?.invite_code}</span>
              <Copy className="h-5 w-5 text-muted-foreground" />
            </button>
            <Label htmlFor="code" className="mt-4 block">Enter partner's code</Label>
            <div className="flex gap-2 mt-1">
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" className="rounded-xl uppercase tracking-[0.3em] font-mono font-bold" />
              <Button variant="hero" onClick={connect} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}</Button>
            </div>
          </>
        )}
      </section>

      <Button variant="outline" className="w-full mb-2 justify-start" onClick={() => navigate("/favorites")}>
        <Heart className="h-4 w-4 mr-2" /> Favorites
      </Button>

      <Button variant="outline" className="w-full mb-2 justify-start" onClick={() => navigate("/shopping")}>
        <ShoppingCart className="h-4 w-4 mr-2" /> Grocery list
      </Button>

      <Button variant="outline" className="w-full mb-2 justify-between" onClick={() => navigate("/notifications")}>
        <span className="flex items-center"><Bell className="h-4 w-4 mr-2" /> Notifications</span>
        {unread > 0 && (
          <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold grid place-items-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>


      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="h-4 w-4 mr-2" /> Sign out
      </Button>
    </div>
  );
};

export default Profile;
