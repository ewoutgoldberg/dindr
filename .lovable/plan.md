# Chef Mode — Implementatieplan

Veel onderdelen bestaan al (claim flow, social posts, recipe import, admin). Ik bouw uit en vervang creator-navigatie. Consumer-ervaring blijft ongemoeid.

## Fase 1 — Database-fundering (1 migratie)

Nieuwe kolommen / tabellen:
- `recipes.archived boolean default false`
- `recipes.subtitle text` (optioneel veld uit jouw lijst)
- `recipe_views` — anonieme + ingelogde view-tracking per recept (user_id nullable, recipe_id, created_at)
- `recipe_shares` — share-events (user_id nullable, recipe_id, channel text, created_at)
- `creator_followers` — (creator_id, user_id, created_at, unique)
- `recipe_status` afgeleid via view: draft / review / published / archived (combinatie van bestaande `published` + `creator_approved` + nieuwe `archived`)

Saves = bestaande `favorites`. Likes = bestaande `swipes.liked=true`. Volgers = nieuwe tabel.

RLS:
- views/shares: iedereen mag inserten (ook anon), alleen creator-eigenaar + admin mag lezen voor eigen recepten
- followers: ingelogde users mogen volgen/ontvolgen zichzelf, creator mag eigen volgers zien, iedereen mag aantal zien

Consumer-side tracking (minimale aanpassing):
- `RecipeDetail.tsx`: insert in `recipe_views` bij mount
- Bestaande share-knoppen → insert in `recipe_shares`

## Fase 2 — Navigatie + Recepten-tab

`AppShell.tsx` creatorTabs vervangen door: Dashboard / Recepten / Inspiratie / Inzichten / MyKitchen.

Nieuwe pagina `src/pages/creator/Recipes.tsx`:
- Filter-pills: Alles / Concepten / Review / Gepubliceerd / Gearchiveerd
- Lijst met thumbnail, titel, status-badge, stats (views/likes/saves)
- Acties per rij (overflow menu): Bewerken, Dupliceren, Publiceren/Unpublish, Archiveren, Verwijderen
- "Nieuw recept" CTA → `/admin/creators/:id/recipes/new` hergebruiken (creator-versie zonder admin-vereisten, of doorlinken naar bestaande form met creator-mode)

`AdminRecipeForm` is al uitgebreid; deze hergebruiken/aanpassen zodat creator hem ook kan openen zonder admin-rol (RLS staat creator al toe eigen recepten te beheren). Realtime preview = rechterpaneel met `CardFront` component.

## Fase 3 — Dashboard + Inspiratie

`CreatorDashboard.tsx` uitbreiden:
- Stat-tegels: totaal / gepubliceerd / concepten / views / likes / saves / volgers (queries aggregeren over eigen recepten)
- Quick actions: Nieuw recept, Importeren (bestaat), Social koppelen (scroll naar SocialAccountsManager), Bekijk MyKitchen
- Secties: Nieuwste prestaties (recepten met grootste view-groei laatste 7d), Snelst groeiende recepten, Recente activiteit (laatste likes/saves/follows)

Nieuwe pagina `src/pages/creator/Inspiration.tsx`:
- Combineerde feed uit `social_posts` (Instagram + TikTok) van eigen creator
- Platform-badge, caption, datum, thumbnail/video
- Sectie "Koppel accounts" → bestaande `SocialAccountsManager`

## Fase 4 — Inzichten

Nieuwe pagina `src/pages/creator/Insights.tsx`:
- Periode-toggle (7/30/90d)
- Per-recept tabel: views, likes, saves, shares, swipe-right %, swipe-left %
- Lijngrafiek (recharts) voor views + engagement over tijd
- Insight cards (regelgebaseerd, client-side berekend uit data — voorbeelden: "Recepten <20min worden X% vaker opgeslagen")
- Trending sectie: top tags / cuisines uit aggregate van alle recepten (admin-level data, beperk tot eigen creator + globale trends)

## Technische details

- Alle creator-pagina's onder route `/creator/...` beschermd door `RequireAuth` + check op `useIsCreator().isCreator`
- Bestaande consumer routes blijven onaangeroerd
- RLS doet de echte access control; UI-checks zijn ondersteunend
- Mobile-first, hergebruik bestaande tokens (`bg-card`, `rounded-2xl`, `shadow-soft/card`, `font-display`)
- Grafieken: `recharts` (al in shadcn/ui via `chart.tsx`)

## Volgorde van uitvoer

Ik start met **Fase 1 (migratie)** in deze beurt. Na jouw goedkeuring van de migratie ga ik door naar Fase 2 in een volgende beurt, dan 3, dan 4. Zo blijft elke stap reviewbaar en kunnen we onderweg bijsturen.

Akkoord met deze fasering? Of wil je iets anders eerst?
