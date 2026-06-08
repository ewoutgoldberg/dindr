import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

const schema = z.object({ password: z.string().min(6, "At least 6 characters").max(72) });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the recovery link is opened.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    // If user already has a session (link just processed), allow immediately.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate("/plan", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-card p-6 animate-scale-in">
        <div className="flex flex-col items-center mb-5">
          <img src={logo} alt="Dinder logo" className="h-12 w-12 mb-2" width={48} height={48} />
          <h1 className="text-2xl font-display font-extrabold">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Choose a new password for your Dinder account.
          </p>
        </div>
        {!ready ? (
          <div className="grid place-items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Verifying recovery link…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
