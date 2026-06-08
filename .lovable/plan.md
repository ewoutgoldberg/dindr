## App-analyse (user-flow: auth → plan → swipe → matches → shopping)

Hieronder per onderdeel de bevindingen. Daarna een prioriteitslijst en welke fixes ik in deze ronde meeneem.

### 1. Auth (`/auth`, `RequireAuth`, `useAuth`)
- **Geen "Forgot password" flow.** Geen `/reset-password` route, geen link op de Auth-pagina. Bij e-mail/wachtwoord login is dit een blocker voor terugkerende users.
- **Sign-up zonder e-mailbevestiging-uitleg.** Toast zegt "Welcome! Account created." maar als e-mailconfirmatie aan staat, blijft de user op `/auth` zonder uitleg dat ze hun mailbox moeten openen.
- **`Auth.tsx` redirect na login.** Werkt prima via `useEffect`, maar Google OAuth `redirect_uri` is hardcoded naar `/plan` en negeert `?redirect=` in de URL → bij `/claim/:token` flow gaat de user na Google-login naar `/plan` i.p.v. terug naar de claim-pagina.
- **`Claim.tsx`** verwijst correct naar `/auth?redirect=...`, dus de Google-redirect-bug breekt deze flow concreet.
- **AuthProvider** loading-flag wordt soms 2× geset; ongevaarlijk.

### 2. Plan (`/plan`)
- **Pagina-header heeft een lege `<div>`** (regel 146) — overblijfsel van eerdere refactor.
- **`handleSwap`-query mist `user_id`-filter** op `swipes`. Werkt door RLS, maar logisch onjuist en bevat partner-likes als RLS dat ooit verbreedt. Telt liked-swipes over alle datums i.p.v. de geselecteerde (wacht, `.eq("plan_date", dateKey)` is er — OK; `user_id` ontbreekt echter wel).
- **"Swap"-knop op een planned recipe** stuurt je naar Matches als er ≥1 like is — dat is onverwacht. Verwacht gedrag: terug naar Swipe om door te bladeren. Of expliciet de keuze geven.
- **Geen "remove final pick"-actie** op een planned dag. Je kunt alleen swappen.
- **`planAllWeek`** maakt lege meal_plan-rijen aan zonder filters; geen visuele feedback per dag.
- **Navigatie naar Swipe geeft geen `dateConfirmed: true` mee** → date-picker dialog opent altijd opnieuw bij binnenkomst vanuit Plan (frictie).

### 3. Filters (`/filters`)
- **Date-picker dialog opent ook als `?date=...` al in URL staat** (bv. vanuit Plan). Onnodige stap.
- **`pickerOpen` initial = `true` altijd**, ongeacht of date al bekend is.
- **Veel filters, geen "preview count"** van hoeveel recipes voldoen → user kan onbedoeld 0 hits creëren en moet naar Swipe gaan om dat te zien.
- **Allergies/healthy/pantry zijn deels lokaal (localStorage), deels server (`meal_plans`)**. Pantry & healthy gaan niet mee als de user op een ander device swiped — inconsistent.

### 4. Swipe (`/swipe/:date`)
- **Date-picker bij elke entry** als `dateConfirmed` niet expliciet doorgegeven wordt (zie Plan-issue). Friction.
- **`handleSwipe` race-condition.** `setIndex` gebeurt vóór de Supabase upsert; bij netwerkfout schuift de user door zonder dat de like is opgeslagen. Geen retry/toast.
- **Match-check per swipe** doet een query naar `partnerships` en `swipes` voor elke liked swipe → onnodig. Partnership eenmalig cachen in state. (En de DB-trigger `auto_favorite_on_match` doet feitelijk al het matching-werk — UI kan via realtime listener of bij volgende load opvangen.)
- **Empty state `noRecipes`** triggert ook als de user alle recepten al heeft weggeswiped op een dag (excluded-set leegt de query). De copy zegt dan "No recipes match your filters" terwijl het in werkelijkheid "Je hebt alles al gezien" is. Onderscheid niet kloppend.
- **Geen `undo`-knop** op een swipe — Tinder-achtige apps hebben dit standaard; missen is een verwacht-feature gat.
- **Recipe image lazy-loading ontbreekt** in `SwipeCard` (alle volgende cards laden direct).

### 5. Matches (`/matches`)
- **`swipes`-query haalt ALLE liked swipes ever** voor beide users → groeit onbeperkt. Beperk tot bv. laatste 60 dagen + toekomst.
- **`setFinal` schrijft alleen `user_id: user.id`** → partner's `meal_plans` krijgt geen final_recipe_id. Op Plan ziet partner de pick niet. Optie: notificatie + suggestie aan partner, of via RPC beide kanten zetten.
- **"Match this"-knop** in partner-section forceert een like → goed bedoeld, maar er is geen confirmation; misklik = ongewenste like. Toast is "It's a match! 🎉" zelfs als partner-swipe inmiddels niet meer liked is.
- **`pastGroups` cap** ontbreekt — alles wordt opgehaald.
- **Lege dag-card "Start swiping"** linkt naar `/swipe?date=...` (zonder `:date` param!) → route matcht `/swipe/:date` niet → 404 via NotFound. **Broken link.** Moet `/swipe/${g.date}` zijn.
- **`initialDate` uit `sessionStorage("activeSwipeDate")`** kan stale zijn (vorige sessie).

### 6. Recipe detail (`/recipe/:id`)
- **`canReview`** vereist liked swipe; ok, maar als user de like opheft blijft review zichtbaar.
- **`addToShopping` voegt altijd toe**, geen dedupe / unit-merge → snel duplicates met partner.
- **`makeFinal` vereist `?date=` in URL**; bij directe link (vanuit Matches) werkt het, maar vanuit Swipe → openRecipeFromSwipe geeft géén date door → knop "Make this my pick" verschijnt niet.
- **`scaleQty`** gaat fout op fracties als "1/2" — krijgt NaN, valt terug op originele string (acceptabel maar onverwacht).
- **Tracking-insert** `recipe_views` geen guard tegen dubbele inserts in dezelfde sessie.

### 7. Shopping (`/shopping`)
- **Realtime listener reload de hele lijst** bij elke change van álle users (filter op user/partner ontbreekt in de channel). Op een drukke DB onnodig veel.
- **`clearChecked` veegt alleen eigen items** — partner-items blijven afgevinkt en zichtbaar onder Done. Verwarrend voor de samenwerkende user.
- **Geen item-edit** (quantity aanpassen na toevoegen).
- **Geen koppeling terug naar recipe** als item via recipe is toegevoegd (`recipe_id` is wel opgeslagen).

### 8. Navigatie & shell (`AppShell`)
- **"Swipe"-tab linkt altijd naar `/swipe/${today}`** ongeacht actieve plan-datum. Als user al swiping is voor morgen en op tab tikt → springt naar vandaag.
- **"Matches"-deeplink** met date werkt alleen wanneer URL al `/swipe/...` is. Vanuit Plan/profile geen date-context.
- **Creator vs Consumer mode-switch** in Profile (`setViewMode`) — bij switch naar creator wordt niet de juiste tab gehighlight als je al op `/profile` was.

### 9. Loading / error / empty states
- Veel pagina's hebben spinner OK, maar **geen error state** bij Supabase-falen (alleen `toast.error` flits en daarna lege pagina).
- **`Matches`, `Shopping`, `Plan`** doen geen retry / "Try again"-UI bij netwerkfout.
- **`recipes` ophalen op Swipe** met `limit(50)` zonder pagination — bij groei zijn er meer recipes dan dat.

### 10. Edge cases / overig
- **`Index` redirect** naar `/auth` bij geen user — als user op deeplink `/recipe/x` zit en uitlogt vlamt redirect naar `/auth` zonder `?redirect=` (gaat via `RequireAuth` die `state.from` zet — OK).
- **Sign-out**: geen confirmatie, geen redirect — user blijft op `/profile` waar `RequireAuth` daarna naar `/auth` schopt (werkt, maar voelt abrupt).
- **Disconnect partner**: geen confirm — destructief.
- **Geen 404-UI test**: NotFound bestaat maar bovenstaande broken link `/swipe?date=...` triggert hem onbedoeld.

---

## Prioritering

```text
KRITISCH (breekt of dataloss)
  K1  Matches: "Start swiping" link → /swipe?date=...  is broken (NotFound)
  K2  Auth: Google OAuth negeert ?redirect= → Claim-flow breekt
  K3  Auth: geen "Forgot password" + geen /reset-password route
  K4  Swipe: setIndex vóór upsert → like raakt zoek bij netwerkfout
  K5  Matches: setFinal schrijft alleen voor self, partner ziet geen pick

HOOG (frictie / verwarrend)
  H1  Swipe/Filters: date-picker opent altijd, ook bij geldig ?date / :date
  H2  Plan handleSwap stuurt onlogisch naar Matches; mist user_id-filter
  H3  Swipe empty-state onderscheidt "geen recipes" vs "alles gezien" niet
  H4  Shopping: clearChecked laat partner-items staan; realtime herlaadt te breed
  H5  Matches: "Match this" zonder confirm + zonder her-check partner

MIDDEN (kwaliteit)
  M1  Sign-out & disconnect partner zonder confirm
  M2  AppShell Swipe-tab negeert actieve plan-datum
  M3  RecipeDetail "Make it my pick" mist date wanneer geopend vanuit Swipe
  M4  Filters: geen "X recipes match" preview
  M5  Plan: geen "remove final pick" actie; lege <div> in header
  M6  Pantry/healthy lokaal (localStorage) vs server-filters inconsistent
  M7  Matches: query niet gebounded op datum-range
  M8  Generieke error-states ontbreken (alleen toast)

NICE-TO-HAVE
  N1  Undo-knop in Swipe
  N2  Lazy-load images in SwipeCard-stack
  N3  Shopping: dedupe ingredients, edit quantity, recipe-link
  N4  RecipeDetail: scaleQty fractie-support (1/2 etc.)
  N5  Recipe views: sessie-dedupe
  N6  planAllWeek visuele feedback per dag
```

## Wat ik in deze ronde direct fix (de "kritische fixes")

1. **K1** – `Matches.tsx`: `navigate('/swipe?date=...')` → `navigate('/swipe/${g.date}')` (+ `state: { dateConfirmed: true }`).
2. **K2** – `Auth.tsx`: gebruik `redirectParam` ook in Google `redirect_uri` (`${origin}${redirectParam ?? "/plan"}`).
3. **K3** – Forgot password: link op `/auth`, `resetPasswordForEmail` flow + nieuwe `/reset-password` pagina + route (publiek, geen RequireAuth).
4. **K4** – `Swipe.handleSwipe`: eerst `await upsert`, bij error toast + niet doorschuiven. Optimistic blijft maar met rollback bij fout.
5. **K5** – `Matches.setFinal`: ook upsert voor partner (`get_partner` of via partnership-state) zodat beide `meal_plans` de final krijgen. Notificatie blijft behouden.

Daarnaast meteen meegenomen omdat ze één-liners zijn en in dezelfde files staan:
- **H1** – `Plan` geeft `state: { dateConfirmed: true }` mee bij `navigate('/swipe/...')`; `Filters` slaat picker over als `dateParam` aanwezig.
- **H3** – Swipe empty-state: extra branch "Je hebt alle recepten al gezien" als `recipes.length > 0 && index === recipes.length`.
- **M5** – verwijder lege `<div>` in Plan-header.

De rest (M/N + H2/H4/H5) rapporteer ik en pak ik niet in deze ronde aan — laat het me weten als je wil dat ik er nog een batch oppak.

## Technische details

- Nieuwe route in `App.tsx`: `<Route path="/reset-password" element={<ResetPassword />} />` (geen `RequireAuth`).
- `Auth.tsx` krijgt:
  - "Forgot password?"-link → opent dialog of inline form die `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${origin}/reset-password\` })` aanroept.
  - Google OAuth gebruikt `redirect_uri: \`${origin}${from}\``.
- `ResetPassword.tsx`: luistert op `onAuthStateChange` `PASSWORD_RECOVERY` event, toont nieuw-wachtwoord-form, roept `supabase.auth.updateUser({ password })` en redirect naar `/plan`.
- `Swipe.handleSwipe`: `const { error } = await supabase.from("swipes").upsert(...); if (error) { toast.error; return; } setIndex(nextIndex); ...`. Match-check pas na succesvolle upsert.
- `Matches.setFinal`: na eigen upsert ook `partnerId` ophalen (uit `hasPartner`/partnership-state, die ik in state moet bewaren) en tweede upsert doen.
- Empty-state branch: voeg `alreadyDone` prop toe op basis van `recipes.length > 0 && index >= recipes.length`.

## Files die geraakt worden

- `src/App.tsx` (+1 route)
- `src/pages/Auth.tsx`
- `src/pages/ResetPassword.tsx` (nieuw)
- `src/pages/Plan.tsx`
- `src/pages/Filters.tsx`
- `src/pages/Swipe.tsx`
- `src/pages/Matches.tsx`
