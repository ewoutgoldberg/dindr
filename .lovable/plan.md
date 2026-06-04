# Marley Spoon-stijl receptkaart

Een nieuwe horizontale kaartweergave die eruitziet als een fysieke Marley Spoon-kaart, met een flip-animatie van voorkant (foto + titel) naar achterkant (stappen met AI-gegenereerde foto's).

## Wat er komt

**Nieuwe pagina `/recipe/:id/card`**
- Landscape lay-out (forceert horizontale weergave op mobiel met CSS rotate als telefoon in portrait staat, of natuurlijke landscape als gebruiker draait)
- Detecteert device-oriëntatie via `window.matchMedia("(orientation: landscape)")`
- Toont prompt "Draai je telefoon" als toestel nog portrait is
- 3D flip-animatie tussen voor- en achterkant (tikken om te draaien)

**Voorkant**
- Grote hero-foto van het gerecht (volledige kaart)
- Titel onderaan in Marley Spoon-stijl typografie
- Kleine badges: kooktijd, moeilijkheid, porties
- Subtiele "tik om om te draaien" hint

**Achterkant**
- Linker kolom: ingrediëntenlijst (compact, Marley Spoon-stijl)
- Header: kooktijd, moeilijkheid, voedingswaarde (calorieën/eiwit/vet/koolhydraten — geschat via AI)
- Rechter blok: genummerde stappen, elk met een vierkante foto links en uitleg rechts

**Toegang tot kaartweergave**
- Knop op recept-detailpagina (`RecipeDetail.tsx`): "Bekijk als kaart"
- Icoontje op de swipe-kaart in `Swipe.tsx` en `SwipeFavorites.tsx`

**AI-stapfoto's & voedingswaarde**
- Eerste keer dat een recept als kaart wordt bekeken: edge function `generate-recipe-card-assets` genereert per stap een foto via Lovable AI image gen (`google/gemini-3.1-flash-image-preview`) en schat de voedingswaarde via tekstmodel
- Resultaat wordt opgeslagen op het recept zodat het maar één keer gegenereerd hoeft te worden
- Loading state met blur tijdens generatie

## Technische details

**Database-wijziging** (migratie)
- Nieuwe kolommen op `recipes`:
  - `step_images jsonb` — array met urls per stap, parallel aan `instructions`
  - `nutrition jsonb` — `{ calories, protein_g, fat_g, carbs_g }`
  - `card_assets_generated_at timestamptz` — markering dat assets klaar zijn

**Nieuwe bestanden**
- `src/pages/RecipeCard.tsx` — de horizontale flip-kaart pagina
- `src/components/recipe-card/CardFront.tsx`
- `src/components/recipe-card/CardBack.tsx`
- `src/components/recipe-card/OrientationGate.tsx` — toont "draai je telefoon" overlay tot landscape
- `supabase/functions/generate-recipe-card-assets/index.ts` — edge function die foto's per stap en voedingswaarde genereert en op de `recipes`-rij opslaat (gebruikt `LOVABLE_API_KEY`)

**Routing & navigatie**
- Nieuwe route in `App.tsx`: `/recipe/:id/card`
- Knop in `RecipeDetail.tsx` (naast favorieten-hart) en op de swipe-kaarten linkt door
- Geen wijziging aan bestaande recept-flow; kaartweergave is een extra view

**Storage**
- Stapfoto's worden als base64 ontvangen → geüpload naar bestaande `lovable-uploads` bucket → public URL in `step_images`

**Animatie**
- Framer Motion (al gebruikt in project) voor de 3D flip (`rotateY: 180`, `transformStyle: "preserve-3d"`, `backfaceVisibility: "hidden"`)
- Tailwind voor de Marley Spoon-stijl typografie en spacing

## Buiten scope
- Niet voor desktop geoptimaliseerd (kaart blijft mobile-first landscape)
- Geen handmatige upload van stapfoto's door admin/creator (kan later toegevoegd worden)
- Bestaande recept-detailpagina blijft ongewijzigd
