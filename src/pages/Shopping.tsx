import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShoppingCart, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Item = Tables<"shopping_list_items">;

const Shopping = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: partnership } = await supabase
      .from("partnerships")
      .select("user_a, user_b")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .maybeSingle();
    const partnerId = partnership ? (partnership.user_a === user.id ? partnership.user_b : partnership.user_a) : null;
    const ids = partnerId ? [user.id, partnerId] : [user.id];
    const { data } = await supabase.from("shopping_list_items").select("*").in("user_id", ids).order("created_at", { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel("shopping_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_list_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggle = async (item: Item) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    await supabase.from("shopping_list_items").update({ checked: !item.checked }).eq("id", item.id);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("shopping_list_items").delete().eq("id", id);
  };

  const add = async () => {
    if (!user || !newName.trim()) return;
    const name = newName.trim().slice(0, 80);
    setNewName("");
    const { error } = await supabase.from("shopping_list_items").insert({ user_id: user.id, name });
    if (error) toast.error(error.message);
  };

  const clearChecked = async () => {
    if (!user) return;
    const ids = items.filter((i) => i.checked && i.user_id === user.id).map((i) => i.id);
    if (ids.length === 0) return;
    await supabase.from("shopping_list_items").delete().in("id", ids);
    toast.success(`Removed ${ids.length} items`);
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const active = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div className="max-w-md mx-auto w-full px-5 pt-6 animate-fade-in">
      <header className="mb-6">
        
        <h1 className="text-3xl font-display font-extrabold mt-1">Shopping</h1>
        <p className="text-muted-foreground mt-1">Tap to check off. Synced live with your partner.</p>
      </header>

      <div className="flex gap-2 mb-5">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add item…" onKeyDown={(e) => e.key === "Enter" && add()} className="rounded-full h-12" maxLength={80} />
        <Button variant="hero" size="icon" className="h-12 w-12 shrink-0" onClick={add}><Plus className="h-5 w-5" /></Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-20 w-20 rounded-full bg-muted grid place-items-center mx-auto mb-4">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-display font-bold text-xl">List is empty</h2>
          <p className="text-muted-foreground mt-2">Add items above or from a recipe page.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {active.map((i) => (
              <li key={i.id} className="flex items-center gap-3 bg-card rounded-2xl p-3 shadow-soft">
                <button onClick={() => toggle(i)} className="h-6 w-6 rounded-full border-2 border-border shrink-0" aria-label="Check" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{i.name}</p>
                  {i.quantity && <p className="text-xs text-muted-foreground">{i.quantity}</p>}
                </div>
                {i.user_id === user?.id && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => remove(i.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>

          {done.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Done ({done.length})</p>
                <Button variant="ghost" size="sm" onClick={clearChecked}>Clear</Button>
              </div>
              <ul className="space-y-2">
                {done.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3">
                    <button onClick={() => toggle(i)} className="h-6 w-6 rounded-full bg-primary grid place-items-center shrink-0" aria-label="Uncheck">
                      <svg className="h-3.5 w-3.5 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 011.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" /></svg>
                    </button>
                    <p className={cn("flex-1 truncate line-through text-muted-foreground")}>{i.name}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Shopping;
