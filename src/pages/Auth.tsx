import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero-pasta.jpg";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/plan";

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/plan` },
        });
        if (error) throw error;
        toast.success("Welcome! Account created.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/plan` });
      if (result.error) throw result.error;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative h-[42vh] overflow-hidden">
        <img src={hero} alt="Delicious pasta" className="absolute inset-0 w-full h-full object-cover" width={1024} height={1280} />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative h-full flex flex-col items-center justify-center px-6 text-center text-primary-foreground">
          <img src={logo} alt="Forkly logo" className="h-16 w-16 mb-4 drop-shadow-lg" width={64} height={64} />
          <h1 className="text-4xl font-display font-extrabold tracking-tight">Forkly</h1>
          <p className="mt-2 text-base font-medium opacity-95 max-w-xs">Swipe. Plan. Cook together.</p>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto px-6 -mt-8 z-10">
        <div className="bg-card rounded-3xl shadow-card p-6 animate-scale-in">
          <div className="flex bg-muted rounded-full p-1 mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all ${mode === m ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"}`}
              >
                {m === "signin" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signin" ? "Log in" : "Create account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" />
            <span>or</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <Button type="button" variant="outline" size="lg" className="w-full" onClick={google} disabled={busy}>
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3-3C17.2 1.7 14.8.7 12 .7 7.3.7 3.3 3.4 1.4 7.3l3.5 2.7C5.7 7 8.6 5 12 5z"/><path fill="#34A853" d="M23.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.5h6.5c-.3 1.5-1.2 2.7-2.5 3.6l3.4 2.6c2-1.8 3.1-4.5 3.1-8.4z"/><path fill="#4A90E2" d="M5 14L1.4 16.7C3.3 20.6 7.3 23.3 12 23.3c3.2 0 5.9-1 7.9-2.9L16.4 18c-1 .7-2.4 1.1-4.4 1.1-3.4 0-6.3-2-7.4-4.8L5 14z"/><path fill="#FBBC05" d="M1.4 7.3C.5 9 0 10.9 0 13s.5 4 1.4 5.7L5 16c-.3-.9-.5-1.9-.5-3s.2-2.1.5-3L1.4 7.3z"/></svg>
            Continue with Google
          </Button>

          <p className="mt-5 text-xs text-center text-muted-foreground">
            By continuing you agree to Forkly's terms & privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
