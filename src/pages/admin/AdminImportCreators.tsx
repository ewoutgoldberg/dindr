import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Row = {
  name?: string;
  handle?: string;
  bio?: string;
  instagram_url?: string;
  tiktok_url?: string;
  youtube_url?: string;
  website_url?: string;
  avatar_url?: string;
  cover_url?: string;
  location?: string;
  specialty?: string;
};

type ResultRow = { row: Row; status: "ok" | "skipped" | "error"; message?: string };

const REQUIRED = ["name", "handle"] as const;
const ALLOWED = [
  "name", "handle", "bio", "instagram_url", "tiktok_url", "youtube_url",
  "website_url", "avatar_url", "cover_url", "location", "specialty",
] as const;

const AdminImportCreators = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);

  const onFile = (file: File) => {
    setFileName(file.name);
    setResults(null);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const cleaned = res.data
          .map((r) => {
            const out: Row = {};
            for (const key of ALLOWED) {
              const v = (r as Record<string, string | undefined>)[key];
              if (v && String(v).trim()) out[key] = String(v).trim();
            }
            return out;
          })
          .filter((r) => r.name || r.handle);
        setRows(cleaned);
      },
      error: (err) => toast.error(`CSV parse error: ${err.message}`),
    });
  };

  const runImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    const out: ResultRow[] = [];
    for (const r of rows) {
      const missing = REQUIRED.filter((k) => !r[k]);
      if (missing.length) {
        out.push({ row: r, status: "error", message: `missing ${missing.join(", ")}` });
        continue;
      }
      const { error } = await supabase
        .from("food_creators")
        .insert({
          name: r.name!,
          handle: r.handle!,
          bio: r.bio ?? null,
          instagram_url: r.instagram_url ?? null,
          tiktok_url: r.tiktok_url ?? null,
          youtube_url: r.youtube_url ?? null,
          website_url: r.website_url ?? null,
          avatar_url: r.avatar_url ?? null,
          cover_url: r.cover_url ?? null,
          location: r.location ?? null,
          specialty: r.specialty ?? null,
          status: "unclaimed",
          badge_new: true,
        });
      if (error) {
        const msg = error.message.includes("duplicate") || error.code === "23505"
          ? "duplicate handle"
          : error.message;
        out.push({ row: r, status: msg === "duplicate handle" ? "skipped" : "error", message: msg });
      } else {
        out.push({ row: r, status: "ok" });
      }
    }
    setResults(out);
    setImporting(false);
    const ok = out.filter((r) => r.status === "ok").length;
    toast.success(`Imported ${ok}/${rows.length} creators`);
  };

  const ok = results?.filter((r) => r.status === "ok").length ?? 0;
  const skipped = results?.filter((r) => r.status === "skipped").length ?? 0;
  const errored = results?.filter((r) => r.status === "error").length ?? 0;

  return (
    <div className="max-w-2xl mx-auto w-full px-5 py-6 animate-fade-in pb-24">
      <button
        onClick={() => navigate("/admin/creators")}
        className="text-sm text-muted-foreground inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Creators
      </button>

      <h1 className="font-display font-extrabold text-2xl mb-1">Bulk import creators</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Upload a CSV with creator profiles. Required columns: <code>name</code>, <code>handle</code>.
        Optional: bio, instagram_url, tiktok_url, youtube_url, website_url, avatar_url, cover_url, location, specialty.
      </p>

      <label className="bg-card rounded-2xl p-6 shadow-soft flex flex-col items-center justify-center text-center cursor-pointer border-2 border-dashed border-border hover:border-primary/40 transition mb-5">
        <Upload className="h-6 w-6 text-muted-foreground mb-2" />
        <p className="font-medium">{fileName || "Drop or choose a CSV file"}</p>
        <p className="text-xs text-muted-foreground mt-1">UTF-8 encoded, headers in first row</p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {rows.length > 0 && !results && (
        <div className="bg-card rounded-2xl p-4 shadow-soft mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold">Preview ({rows.length} rows)</h2>
            <Button variant="hero" onClick={runImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${rows.length}`}
            </Button>
          </div>
          <div className="max-h-72 overflow-auto border rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Handle</th>
                  <th className="text-left p-2">Bio</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.name || <span className="text-destructive">—</span>}</td>
                    <td className="p-2">@{r.handle || <span className="text-destructive">—</span>}</td>
                    <td className="p-2 truncate max-w-[200px]">{r.bio ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && (
              <p className="text-xs text-muted-foreground p-2">…and {rows.length - 50} more</p>
            )}
          </div>
        </div>
      )}

      {results && (
        <div className="bg-card rounded-2xl p-4 shadow-soft">
          <div className="flex gap-3 mb-4 text-sm">
            <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> {ok} imported
            </span>
            {skipped > 0 && <span className="text-muted-foreground">{skipped} skipped</span>}
            {errored > 0 && (
              <span className="text-destructive inline-flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errored} failed
              </span>
            )}
          </div>
          <ul className="space-y-1 max-h-80 overflow-auto">
            {results
              .filter((r) => r.status !== "ok")
              .map((r, i) => (
                <li key={i} className="text-xs flex gap-2">
                  <span className={r.status === "error" ? "text-destructive" : "text-muted-foreground"}>
                    {r.row.name ?? "(no name)"} @{r.row.handle ?? "—"}
                  </span>
                  <span className="text-muted-foreground">— {r.message}</span>
                </li>
              ))}
          </ul>
          <Button className="w-full mt-4" onClick={() => navigate("/admin/creators")}>
            Back to creators
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminImportCreators;
