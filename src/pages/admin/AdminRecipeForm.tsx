import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Sparkles, Upload } from "lucide-react";
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
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `recipes/${recipeId ?? "new"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("lovable-uploads").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("lovable-uploads").getPublicUrl(path);
      set("image_url", data.publicUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(`Upload failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(false);
    }
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) return toast.error("Paste a recipe URL first");
    setImporting(true);
    const { data, error } = await supabase.functions.invoke("import-recipe", {
      body: { url: importUrl.trim() },
    });
    setImporting(false);
    if (error) return toast.error(error.message ?? "Import failed");
    if (data?.error) return toast.error(`Import failed: ${data.error}`);
    const r = data?.recipe;
    if (!r) return toast.error("No recipe returned");
    setForm((f) => ({
      ...f,
      title: r.title ?? f.title,
      description: r.description ?? f.description,
      image_url: r.image_url ?? f.image_url,
      category: r.category ?? f.category,
      cuisine: r.cuisine ?? f.cuisine,
      difficulty: r.difficulty ?? f.difficulty,
      cooking_time_minutes: r.cooking_time_minutes ?? f.cooking_time_minutes,
      servings: r.servings ?? f.servings,
      content_source: "imported",
    }));
    if (Array.isArray(r.ingredients)) setIngredientsText(r.ingredients.join("\n"));
    if (Array.isArray(r.instructions)) setInstructionsText(r.instructions.join("\n"));
    toast.success("Recipe imported — review and save");
  };

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

      {isNew && (
        <div className="bg-card rounded-2xl p-4 shadow-soft mb-4 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="https://… recipe URL (Instagram, blog, YouTube)"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={importFromUrl} disabled={importing} variant="outline">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Import</>}
          </Button>
        </div>
      )}

      <div className="bg-card rounded-2xl p-4 shadow-soft space-y-3">
        <div><Label>Title</Label><Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
        <div><Label>Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div>
          <Label>Image</Label>
          <div className="flex items-center gap-2">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="h-14 w-14 rounded-lg object-cover bg-muted" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-muted shrink-0" />
            )}
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              <Button type="button" variant="outline" size="sm" asChild>
                <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-3.5 w-3.5 mr-1" />Upload</>}</span>
              </Button>
            </label>
          </div>
          <Input className="mt-2" placeholder="or paste URL" value={form.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} />
        </div>
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
