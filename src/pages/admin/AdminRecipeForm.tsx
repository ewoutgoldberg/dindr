import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Recipe = Tables<"recipes">;

const empty: Partial<Recipe> = {
  title: "",
  description: "",
  image_url: "",
  category: "dinner",
  difficulty: "medium",
  cuisine: "",
  cooking_time_minutes: 30,
  servings: 2,
  ingredients: [],
  instructions: [],
  content_source: "admin_created",
  creator_approved: false,
  published: false,
};

const AdminRecipeForm = () => {
  const { id: creatorId, recipeId } = useParams<{ id: string; recipeId?: string }>();
  const isNew = !recipeId;
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Recipe>>(empty);
  const [ingredientsText, setIngredientsText] = useState("");
  const [instructionsText, setInstructionsText] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await supabase.from("recipes").select("*").eq("id", recipeId!).maybeSingle();
      if (data) {
        setForm(data);
        setIngredientsText(Array.isArray(data.ingredients) ? (data.ingredients as string[]).join("\n") : "");
        setInstructionsText(Array.isArray(data.instructions) ? (data.instructions as string[]).join("\n") : "");
      }
      setLoading(false);
    })();
  }, [recipeId, isNew]);

  const set = <K extends keyof Recipe>(k: K, v: Recipe[K] | string | number | boolean | null) =>
    setForm((f) => ({ ...f, [k]: v as never }));

  const save = async () => {
    if (!form.title?.trim()) return toast.error("Title required");
    setSaving(true);
    const payload = {
      ...form,
      creator_id: creatorId,
      ingredients: ingredientsText.split("\n").map((s) => s.trim()).filter(Boolean),
      instructions: instructionsText.split("\n").map((s) => s.trim()).filter(Boolean),
    };
    const op = isNew
      ? supabase.from("recipes").insert(payload as never).select("id").single()
      : supabase.from("recipes").update(payload as never).eq("id", recipeId!).select("id").single();
    const { error } = await op;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    navigate(`/admin/creators/${creatorId}`);
  };

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto w-full px-5 py-6 animate-fade-in pb-24">
      <button onClick={() => navigate(`/admin/creators/${creatorId}`)} className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="font-display font-extrabold text-2xl mb-5">{isNew ? "New recipe" : "Edit recipe"}</h1>

      <div className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
        <div><Label>Title</Label><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
        <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Category</Label><Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} /></div>
          <div><Label>Cuisine</Label><Input value={form.cuisine ?? ""} onChange={(e) => set("cuisine", e.target.value)} /></div>
          <div><Label>Difficulty</Label><Input value={form.difficulty ?? ""} onChange={(e) => set("difficulty", e.target.value)} /></div>
          <div><Label>Time (min)</Label><Input type="number" value={form.cooking_time_minutes ?? 0} onChange={(e) => set("cooking_time_minutes", Number(e.target.value))} /></div>
          <div><Label>Servings</Label><Input type="number" value={form.servings ?? 2} onChange={(e) => set("servings", Number(e.target.value))} /></div>
          <div>
            <Label>Source</Label>
            <select value={form.content_source ?? "admin_created"} onChange={(e) => set("content_source", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="admin_created">admin_created</option>
              <option value="creator_created">creator_created</option>
              <option value="imported">imported</option>
            </select>
          </div>
        </div>
        <div><Label>Ingredients (one per line)</Label><Textarea rows={6} value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} /></div>
        <div><Label>Instructions (one step per line)</Label><Textarea rows={6} value={instructionsText} onChange={(e) => setInstructionsText(e.target.value)} /></div>

        <div className="flex items-center justify-between border-t pt-3">
          <Label htmlFor="published">Published</Label>
          <Switch id="published" checked={!!form.published} onCheckedChange={(v) => set("published", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="approved">Creator approved</Label>
          <Switch id="approved" checked={!!form.creator_approved} onCheckedChange={(v) => set("creator_approved", v)} />
        </div>

        <Button variant="hero" onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save recipe"}
        </Button>
      </div>
    </div>
  );
};

export default AdminRecipeForm;
