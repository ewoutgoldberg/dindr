import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

type Creator = Tables<"food_creators">;

const CreatorProfileEdit = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [form, setForm] = useState<Partial<Creator>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("food_creators")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setCreator(data);
        setForm(data);
      }
      setLoading(false);
    })();
  }, [user]);

  const set = (k: keyof Creator, v: string | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const uploadImage = async (field: "avatar_url" | "cover_url", file: File) => {
    if (!creator) return;
    setUploading(field === "avatar_url" ? "avatar" : "cover");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `creators/${creator.id}-${field}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("lovable-uploads")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("lovable-uploads").getPublicUrl(path);
      set(field, data.publicUrl);
      toast.success("Foto geüpload");
    } catch (e) {
      toast.error(`Upload mislukt: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!creator) return;
    if (!form.name?.trim()) {
      toast.error("Naam is verplicht");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("food_creators")
      .update({
        name: form.name,
        bio: form.bio,
        story: form.story,
        specialty: form.specialty,
        location: form.location,
        avatar_url: form.avatar_url,
        cover_url: form.cover_url,
        instagram_url: form.instagram_url,
        tiktok_url: form.tiktok_url,
        youtube_url: form.youtube_url,
        website_url: form.website_url,
      })
      .eq("id", creator.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profiel opgeslagen");
    navigate("/creator/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="max-w-md mx-auto px-5 py-10 text-center">
        <p className="text-muted-foreground mb-4">Je hebt nog geen creator-profiel.</p>
        <Button onClick={() => navigate("/")}>Terug naar home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-5 py-6 animate-fade-in pb-24">
      <button
        onClick={() => navigate("/creator/dashboard")}
        className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </button>

      <h1 className="font-display font-extrabold text-2xl mb-5">Profiel bewerken</h1>

      <div className="bg-card rounded-2xl p-4 shadow-soft space-y-4">
        <div>
          <Label>Naam</Label>
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </div>

        <div>
          <Label>Specialiteit</Label>
          <Input
            placeholder="bijv. Italiaanse pasta"
            value={form.specialty ?? ""}
            onChange={(e) => set("specialty", e.target.value)}
          />
        </div>

        <div>
          <Label>Locatie</Label>
          <Input
            placeholder="bijv. Amsterdam"
            value={form.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
          />
        </div>

        <div>
          <Label>Bio</Label>
          <Textarea
            rows={2}
            placeholder="Korte introductie"
            value={form.bio ?? ""}
            onChange={(e) => set("bio", e.target.value)}
          />
        </div>

        <div>
          <Label>Verhaal</Label>
          <Textarea
            rows={4}
            placeholder="Vertel iets over jezelf en je keuken"
            value={form.story ?? ""}
            onChange={(e) => set("story", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Profielfoto</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover bg-muted"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && uploadImage("avatar_url", e.target.files[0])
                  }
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    {uploading === "avatar" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Upload
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div>
            <Label>Omslagfoto</Label>
            <div className="flex items-center gap-2 mt-1">
              {form.cover_url ? (
                <img
                  src={form.cover_url}
                  alt=""
                  className="h-12 w-20 rounded-lg object-cover bg-muted"
                />
              ) : (
                <div className="h-12 w-20 rounded-lg bg-muted shrink-0" />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && uploadImage("cover_url", e.target.files[0])
                  }
                />
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    {uploading === "cover" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Upload
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Instagram</Label>
            <Input
              placeholder="https://instagram.com/..."
              value={form.instagram_url ?? ""}
              onChange={(e) => set("instagram_url", e.target.value)}
            />
          </div>
          <div>
            <Label>TikTok</Label>
            <Input
              placeholder="https://tiktok.com/@..."
              value={form.tiktok_url ?? ""}
              onChange={(e) => set("tiktok_url", e.target.value)}
            />
          </div>
          <div>
            <Label>YouTube</Label>
            <Input
              placeholder="https://youtube.com/@..."
              value={form.youtube_url ?? ""}
              onChange={(e) => set("youtube_url", e.target.value)}
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              placeholder="https://..."
              value={form.website_url ?? ""}
              onChange={(e) => set("website_url", e.target.value)}
            />
          </div>
        </div>

        <Button variant="hero" onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
        </Button>
      </div>
    </div>
  );
};

export default CreatorProfileEdit;
