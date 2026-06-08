## Doel
Volledige user flow verifiëren: **login → Filters → Swipe → Match → Plan → Review → Shopping list**, inclusief partner-match scenario voor `ewoutgoldberg@gmail.com`.

## Aanpak: 2 fases

### Fase 1 — Statische code-walkthrough
Per stap loop ik de relevante code door en check ik:
- Routing & guards (`RequireAuth`, redirects)
- Data-flow (queries, mutations, state, sessionStorage)
- Edge cases (empty, error, loading, no-partner, geen recepten)
- Consistentie tussen schermen (datum-context, dateConfirmed, partner mirror)

Bestanden in scope:
`useAuth.tsx`, `Auth.tsx`, `Plan.tsx`, `Filters.tsx`, `Swipe.tsx`, `Matches.tsx`, `RecipeDetail.tsx`, `Shopping.tsx`, `AppShell.tsx`, plus DB-triggers (`auto_favorite_on_match`).

Output: tabel met **stap | verwacht gedrag | bevinding | status (✅ / ⚠️ / ❌)**.

### Fase 2 — Live verificatie in preview (jouw account)
Ik gebruik de browser-tool ingelogd als `ewoutgoldberg@gmail.com` (huidige preview-sessie).

Stappen die ik live uitvoer:
1. **Plan** → kies een testdatum (bv. morgen) → klik "Start swiping".
2. **Filters/Swipe** → controleer dat filters toepasbaar zijn, swipe 3–5 recepten (mix like/dislike).
3. **Partner simulatie** (via DB-insert): ik kijk eerst of je een partner hebt via `partnerships`. Zo ja → insert een `swipes`-rij voor de partner met `liked=true` op één van jouw gelikete recepten + dezelfde `plan_date`. De `auto_favorite_on_match` trigger zou dan beide favorites moeten zetten.
   - Zo nee → ik meld dit en sla partner-match over (of je connect eerst een partner).
4. **Matches** → controleer dat het gematchte recept verschijnt, klik "Match this" → bevestig dialog → check dat het bij beide users de `final` zet.
5. **Plan → Review** → ga terug naar Plan, check dat het gekozen recept op de juiste datum staat → open RecipeDetail.
6. **Shopping** → controleer of de ingrediënten verschijnen, vink een item af, test deduplicatie en recept-link.

### Cleanup
Na de test verwijder ik de test-data die ik heb aangemaakt (swipes/meal_plans/shopping_list_items voor de testdatum) zodat je echte data niet vervuild raakt. Ik vraag bevestiging vóór deletes.

## Rapport
Eindrapport bevat:
- Walkthrough-tabel (Fase 1)
- Live test-log met screenshots op kritieke punten (Fase 2)
- Lijst gevonden issues, geprioriteerd (K / H / M / N)
- Voorstel welke issues ik direct fix in een vervolgloop

## Belangrijke notes / aannames
- Ik test op een **toekomstige datum** zodat ik geen historische data overschrijf.
- Voor partner-simulatie heb ik een tweede user-id nodig uit `partnerships`; als die er niet is, vraag ik je een partner te koppelen via invite-code.
- Geen schemawijzigingen, alleen tijdelijke data-inserts + cleanup.
