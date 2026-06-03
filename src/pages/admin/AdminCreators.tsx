import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

type Creator = Tables<"food_creators">;
type Status = "all" | "unclaimed" | "invited" | "claimed" | "verified";

const statusColors: Record<string, string> = {
  unclaimed: "bg-muted text-foreground",
  invited: "bg-accent text-accent-foreground",
  claimed: "bg-primary/20 text-primary",
  verified: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

const AdminCreators = () => {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("food_creators")
      .select("*")
      .order("created_at", { ascending: false });
    setCreators(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "all" ? creators : creators.filter((c) => c.status === filter);

  const copyClaim = (token: string | null) => {
    if (!token) return;
    const url = `${window.location.origin}/claim/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Claim link copied");
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-5 py-6 animate-fade-in">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display font-extrabold text-2xl">Creators</h1>
          <p className="text-sm text-muted-foreground">Manage profiles &amp; claim links</p>
        </div>
        <Button asChild variant="hero" size="sm">
          <Link to="/admin/creators/new"><Plus className="h-4 w-4" /> New</Link>
        </Button>
      </header>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Status)} className="mb-5">
        <TabsList className="w-full grid grid-cols-5">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unclaimed">Unclaimed</TabsTrigger>
          <TabsTrigger value="invited">Invited</TabsTrigger>
          <TabsTrigger value="claimed">Claimed</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No creators yet.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => (
            <li key={c.id} className="bg-card rounded-2xl p-3 shadow-soft flex items-center gap-3">
              <img
                src={c.avatar_url ?? ""}
                alt=""
                className="h-12 w-12 rounded-full object-cover bg-muted shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{c.name}</p>
                  <Badge className={`${statusColors[c.status] ?? ""} rounded-full text-[10px]`}>{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">@{c.handle}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => copyClaim(c.claim_token)} title="Copy claim link">
                <Copy className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link to={`/admin/creators/${c.id}`}><ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminCreators;
