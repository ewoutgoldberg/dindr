# Plan: Creator Claim Flow afmaken

Doel: de ontbrekende stukken uit de oorspronkelijke prompt invullen zodat Dindr op schaal creators kan onboarden.

## 1. Invite-flow (status `invited` + e-mail)

- Knop **"Verstuur uitnodiging"** in `AdminCreatorForm.tsx` en in de rij-acties van `AdminCreators.tsx`.
- Vraag bij invite om een e-mailadres (nieuw veld `invite_email` op `food_creators`, optioneel — of inline input bij verzenden).
- Edge function `send-creator-invite` die:
  - de claim-link ophaalt via `get_creator_claim_token`
  - de e-mail verstuurt via Lovable's ingebouwde transactional email
  - `status` op `invited` zet en `invited_at` vult
- Mail bevat: welkomsttekst, claim-link (`/claim/{token}`), korte uitleg.

## 2. Verify-actie voor admin

- Knop **"Verifieer"** in `AdminCreators.tsx` rij + in detailformulier, alleen zichtbaar als `status = claimed`.
- Update zet `status = verified` en `verified_at = now()`.
- Kleine badge "Verified" in `CreatorCard.tsx`.

## 3. Bulk import van creators

- Nieuwe pagina `/admin/creators/import` met CSV-upload (drag & drop).
- Verwachte kolommen: `name, handle, bio, instagram_url, tiktok_url, website_url, avatar_url, cover_url, location, specialty`.
- Parser (papaparse) + preview-tabel + "Importeer X creators"-knop.
- Inserts gaan in batch, status standaard `unclaimed`, `badge_new = true`.
- Toon resultaat: aangemaakt / overgeslagen (dubbele handle) / fouten.

## 4. Recept importeren uit URL

- In `AdminRecipeForm.tsx` extra knop **"Importeer uit URL"** (Instagram / TikTok / YouTube / website).
- Edge function `import-recipe` die de URL haalt en via Lovable AI Gateway (gemini-2.5-flash) titel, beschrijving, ingrediënten en stappen extraheert.
- Resultaat vult het formulier voorin; admin kan nog editen.
- `content_source` automatisch op `imported` gezet.

## 5. Welkomstscherm voor creator

- `CreatorDashboard.tsx` krijgt bovenaan een welkomstkaart die alleen verschijnt bij eerste bezoek na claim (bv. `claimed_at` < 24u of localStorage-flag):
  - Titel: "Welkom op Dindr 👋"
  - Tekst: "We hebben alvast een profiel en recepten voor je voorbereid."
  - Drie cijfers: profielgegevens compleet, # concepten, # gepubliceerd.
  - Acties: Profiel aanpassen · Recepten bekijken · Alles publiceren.

## 6. Kleine opruim

- `AdminCreators.tsx`: knop "Markeer als uitgenodigd" wordt overbodig na stap 1 — vervangen door invite-knop.
- `CreatorCard.tsx`: badge ook tonen voor `invited` (nu alleen verborgen bij `claimed`/`verified` — al correct, geen wijziging).

---

## Technische details

**Database migraties:**
- `food_creators.invite_email text` (nullable) — optioneel, alleen als we e-mailadres willen bewaren.
- Geen schemawijzigingen verder nodig; alle benodigde kolommen bestaan al.

**Edge functions (nieuw):**
- `send-creator-invite` — input `{ creator_id, email }`, valideert admin, haalt token, stuurt mail, update status.
- `import-recipe` — input `{ url }`, scrape + AI-extractie, return JSON voor formulier.

**E-mail:** via Lovable's ingebouwde transactional email systeem (geen externe service). Vereist eenmalig opzet van een sender domain — eerste keer popup met `<presentation-open-email-setup>`.

**AI voor recept-import:** Lovable AI Gateway met `google/gemini-2.5-flash`, geen API key nodig.

## Volgorde van uitvoer

1. Migratie + invite-flow + verify-knop (kortste pad, meeste impact)
2. Welkomstscherm (puur frontend, snel)
3. Bulk import CSV
4. Recept import uit URL (vereist edge function + AI)

Wil je dat ik alles in één keer doe, of stap voor stap? Bij twijfel begin ik met **1 + 2** zodat je direct creators kunt uitnodigen en verifiëren.
