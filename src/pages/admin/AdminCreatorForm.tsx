import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Creator = Tables<"food_creators">;
type Recipe = Tables<"recipes">;

const empty: Partial<Creator> = {
  name: "",
  handle: "",
  bio: "",
  story: "",
  specialty: "",
  location: "",
  avatar_url: "",
  cover_url: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  website_url: "",
  status: "unclaimed",
};

const AdminCreatorForm = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Creator>>(empty);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("food_creators").select("*").eq("id", id!).maybeSingle(),
        supabase.from("recipes").select("*").eq("creator_id", id!).order("created_at", { ascending: false }),
      ]);
      if (c) setForm(c);
      setRecipes(r ?? []);
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = (k: keyof Creator, v: string | null) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name?.trim() || !form.handle?.trim()) {
      toast.error("Name & handle required");
      return;
    }
    setSaving(true);
    if (isNew) {
      const { data, error } = await supabase
        .from("food_creators")
        .insert({ ...form, name: form.name!, handle: form.handle! })
        .select("*")
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Creator created");
      navigate(`/admin/creators/${data.id}`, { replace: true });
    } else {
      const { error } = await supabase.from("food_creators").update(form).eq("id", id!);
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Saved");
    }
  };

  const updateStatus = async (status: string) => {
    if (isNew) return;
    const patch: Partial<Creator> = { status };
    if (status === "invited") patch.invited_at = new Date().toISOString();
    if (status === "verified") patch.verified_at = new Date().toISOString();
    const { error } = await supabase.from("food_creators").update(patch).eq("id", id!);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, ...patch }));
    toast.success(`Status: ${status}`);
  };

  const copyClaim = async () => {
    if (!id) return;
    const { data: token, error } = await supabase.rpc("get_creator_claim_token", { _creator_id: id });
    if (error || !token) return toast.error("Could not fetch claim link");
    const url = `${window.location.origin}/claim/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Claim link copied");
  };

  const removeRecipe = async (rid: string) => {
    if (!confirm("Delete this recipe?")) return;
    const { error } = await supabase.from("recipes").delete().eq("id", rid);
    if (error) return toast.error(error.message);
    setRecipes((rs) => rs.filter((r) => r.id !== rid));
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-5 py-6 animate-fade-in pb-24">
      <button onClick={() => navigate("/admin/creators")} className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" /> Creators
      </button>

      <h1 className="font-display font-extrabold text-2xl mb-1">
        {isNew ? "New creator" : form.name}
      </h1>
      {!isNew && (
        <div className="flex items-center gap-2 mb-5">
          <Badge variant="secondary">{form.status}</Badge>
          <Button size="sm" variant="ghost" onClick={copyClaim}><Copy className="h-3.5 w-3.5" /> Copy claim link</Button>
        </div>
      )}

      <div className="bg-card rounded-2xl p-4 shadow-soft space-y-3 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Handle</Label><Input value={form.handle ?? ""} onChange={(e) => set("handle", e.target.value)} /></div>
        </div>
        <div><Label>Specialty</Label><Input value={form.specialty ?? ""} onChange={(e) => set("specialty", e.target.value)} /></div>
        <div><Label>Location</Label><Input value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} /></div>
        <div><Label>Bio</Label><Textarea rows={2} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} /></div>
        <div><Label>Story</Label><Textarea rows={4} value={form.story ?? ""} onChange={(e) => set("story", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Avatar URL</Label><Input value={form.avatar_url ?? ""} onChange={(e) => set("avatar_url", e.target.value)} /></div>
          <div><Label>Cover URL</Label><Input value={form.cover_url ?? ""} onChange={(e) => set("cover_url", e.target.value)} /></div>
          <div><Label>Instagram URL</Label><Input value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value)} /></div>
          <div><Label>TikTok URL</Label><Input value={form.tiktok_url ?? ""} onChange={(e) => set("tiktok_url", e.target.value)} /></div>
          <div><Label>YouTube URL</Label><Input value={form.youtube_url ?? ""} onChange={(e) => set("youtube_url", e.target.value)} /></div>
          <div><Label>Website URL</Label><Input value={form.website_url ?? ""} onChange={(e) => set("website_url", e.target.value)} /></div>
        </div>
        <Button variant="hero" onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </div>

      {!isNew && (
        <>
          <div className="bg-card rounded-2xl p-4 shadow-soft mb-5">
            <h2 className="font-display font-bold mb-3">Status</h2>
            <div className="flex flex-wrap gap-2">
              {(["unclaimed", "invited", "claimed", "verified"] as const).map((s) => (
                <Button key={s} size="sm" variant={form.status === s ? "default" : "outline"} onClick={() => updateStatus(s)}>
                  {form.status === s && <CheckCircle2 className="h-3.5 w-3.5" />} {s}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-4 shadow-soft">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold">Recipes ({recipes.length})</h2>
              <Button size="sm" asChild variant="outline">
                <Link to={`/admin/creators/${id}/recipes/new`}><Plus className="h-3.5 w-3.5" /> Add</Link>
              </Button>
            </div>
            {recipes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recipes yet.</p>
            ) : (
              <ul className="space-y-2">
                {recipes.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50">
                    <img src={r.image_url ?? ""} alt="" className="h-10 w-10 rounded-lg object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{r.title}</p>
                      <div className="flex gap-1 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{r.content_source}</Badge>
                        {r.published ? (
                          <Badge className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">published</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">draft</Badge>
                        )}
                      </div>
                    </div>
                    <Button asChild size="sm" variant="ghost"><Link to={`/admin/creators/${id}/recipes/${r.id}`}>Edit</Link></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeRecipe(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCreatorForm;
