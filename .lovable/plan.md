## Waarom het nu zo traag is

Als je een receptkaart voor het eerst opent, blokkeert de kaart op één edge function call (`generate-recipe-card-assets`) die:

1. De voedingswaarde berekent (1 AI-call, ~2–5s).
2. **Voor elke kookstap één foto genereert — sequentieel, dus één voor één.** Bij 6 stappen × ~10s = al snel een minuut wachten.
3. Pas dán uploadt naar storage, opslaat op het recept, en de respons teruggeeft.

Pas wanneer dat hele proces klaar is, krijgt de frontend antwoord en kun je de kaart kantelen. Bij de tweede keer openen is het wél snel, want dan staan de assets al in de database.

## Plan: kaart opent direct, foto's komen erbij

### 1. Kaart meteen tonen (frontend)
- `RecipeCard.tsx` laat de kaart en kantel-interactie meteen toe zodra het recept zelf geladen is — niet wachten op de edge function.
- Op de achterkant (`CardBack`) tonen we voor elke stap eerst het nummer in een placeholder, met de tekst van de stap er al naast. De foto schuift erin zodra hij klaar is.
- De `Loader2 “foto's worden gemaakt…”` indicator blijft, maar je kunt al lezen, scrollen en kantelen terwijl het genereren draait.

### 2. Parallelle generatie (edge function)
- In `generate-recipe-card-assets` alle stapfoto's met `Promise.all` tegelijk laten genereren in plaats van met een `for`-loop. Eén trage stap blokkeert dan niet de andere zes.
- Voedingswaarde en de stapfoto's draaien ook parallel.

### 3. Live updates terwijl je kijkt (realtime)
- De edge function schrijft per voltooide stap meteen zijn url weg in `recipes.step_images` (in plaats van pas aan het einde alles in één keer).
- De frontend abonneert zich op `recipes` updates voor dit ene recept-id via Lovable Cloud realtime, en vervangt placeholders door foto's zodra ze binnenkomen.
- Resultaat: je ziet de stapfoto's één voor één verschijnen, zonder ooit op een witte loader te kijken.

### 4. (Optioneel) Vooraf genereren bij een match
- Wanneer twee partners een recept matchen (`auto_favorite_on_match` trigger), starten we de edge function alvast in de achtergrond, zodat de assets meestal al klaarstaan tegen de tijd dat iemand de kaart opent.
- Dit is een extra winst, geen vereiste; we kunnen 'm in een tweede ronde toevoegen.

## Verwacht resultaat

- **Eerste open ooit**: kaart en kantelen werken binnen <1s, foto's druppelen er in ~5–15s in (parallel i.p.v. ~60s sequentieel).
- **Tweede keer**: net zo snel als nu (cached).
- **Met optie 4**: bijna altijd al cached vóór je opent.

## Wijzigingen technisch

- `supabase/functions/generate-recipe-card-assets/index.ts` — `for`-loop vervangen door `Promise.all`; per geslaagde upload meteen `update recipes set step_images = ...`; nutrition parallel.
- `src/pages/RecipeCard.tsx` — niet meer wachten op `functions.invoke` voor het tonen van de kaart; abonneren op realtime updates van dit recept; `generating` afleiden uit `card_assets_generated_at`.
- `src/components/recipe-card/CardBack.tsx` — placeholder gedrag verfijnen zodat foto's smooth inschuiven (al grotendeels aanwezig).
- (Optioneel, fase 2) edge function `pregenerate-on-match` aanroepen vanuit de match-flow.

## Vraag

Wil je dat ik fase 4 (vooraf genereren bij een match) meteen meeneem, of eerst alleen 1–3 bouwen en kijken hoe snel het al voelt?
