
## Doel
Een eerste-keer onboarding die nieuwe gebruikers in 4 swipebare schermen wegwijs maakt: swipen, filters, partner koppelen, dagkeuze & meal planning. Plus een welkom-/afsluitscherm. Volledig bilingual (NL/EN) en opnieuw op te starten vanuit het profiel.

## Wanneer wordt het getoond
- **Triggermoment**: direct na een geslaagde signup (mode `signup` in `Auth.tsx`), nog vóór de redirect naar `/swipe/:date`.
- **Status onthouden**: in `profiles` komt een nieuwe kolom `onboarded_at TIMESTAMPTZ`. Zolang deze `null` is, wordt onboarding bij elke login op `/` automatisch geforceerd (vangnet als iemand signup-flow heeft afgebroken).
- **Heropenen**: knop in `Profile.tsx` ("Rondleiding opnieuw bekijken") die naar `/onboarding?replay=1` navigeert. In replay-modus wordt `onboarded_at` niet overschreven.

## Schermen (5 stappen, swipebaar + dots + Skip)
1. **Welkom** – Logo, "Welkom bij Dinder", korte tagline, "Laten we je in 1 minuut op weg helpen."
2. **Swipen** – Illustratie van een kaart met ❤️/✕, uitleg: swipe rechts = lekker, links = niet vandaag. Als jij én je partner allebei rechts swipen → match.
3. **Filters** – Illustratie van filterschuiven (dieet, keuken, smart labels). Uitleg: stel per dag in wat je wilt eten; filters bepalen welke recepten je ziet.
4. **Partner koppelen** – Illustratie van 2 telefoons + 6-cijferige code. Uitleg: deel je code óf vul de code van je partner in via Profiel. Samen swipen = samen matchen.
5. **Datum & planning** – Illustratie van kalender. Uitleg: kies een dag (vandaag t/m 30 dagen vooruit), swipe voor die dag, je matches komen op je weekplan en boodschappenlijst.
   - Afsluitknop: **"Beginnen met swipen"** → markeert `onboarded_at` en navigeert naar `/swipe/<vandaag>`.

Op elke stap behalve de laatste: "Volgende" + "Overslaan" (rechtsboven). Skip markeert óók `onboarded_at` zodat het niet meer terugkomt.

## Vormgeving
- Volle-schermpagina, mobile-first, max-w-md gecentreerd.
- Boven: full-bleed illustratie (~45% hoogte) met gradient overlay (hergebruik `gradient-hero` / `gradient-warm`).
- Onder: titel (`font-display font-extrabold`), korte tekst, dots-indicator, primaire button (`variant="hero"`).
- Swipebaar via framer-motion (zelfde patroon als `Swipe.tsx`).
- Illustraties: 5 PNGs gegenereerd met `imagegen` in dezelfde warme/oranje Dinder-stijl als bestaande `hero-pasta.jpg`, opgeslagen als Lovable Assets (`src/assets/onboarding-*.png.asset.json`).

## Technisch overzicht
- **Nieuwe route**: `/onboarding` in `App.tsx` (binnen `RequireAuth`).
- **Nieuwe pagina**: `src/pages/Onboarding.tsx` – stappenstate, framer-motion swipe, dots, skip, afsluitactie.
- **Database**: migratie voegt `onboarded_at TIMESTAMPTZ` toe aan `public.profiles` (nullable, default null). Geen RLS-wijzigingen nodig (bestaande policies dekken dit).
- **Auth.tsx**: na succesvolle `signUp` direct `navigate("/onboarding")` i.p.v. naar swipe.
- **Index.tsx**: als ingelogd én `profiles.onboarded_at` is null → redirect naar `/onboarding`, anders huidige gedrag.
- **Profile.tsx**: nieuwe menu-item (BookOpen of Sparkles icoon) "Rondleiding opnieuw bekijken" → `/onboarding?replay=1`.
- **i18n**: alle strings naar `nl.json` en `en.json` onder `onboarding.*` (welcome, swipe, filters, partner, plan, next, skip, start).

## Niet in scope
- Geen tooltips op bestaande UI, geen interactieve dummy-swipe.
- Geen verplichte profielinvoer (naam, foto) tijdens onboarding — blijft optioneel in Profiel.
- Geen verschillende flow voor creators (zij doorlopen dezelfde consumer-onboarding).
