## Doel
De hele app tweetalig maken: Nederlands (standaard) en Engels. Gebruiker kiest taal op de Profiel-pagina; voorkeur wordt onthouden.

## Aanpak
- `react-i18next` + `i18next` + `i18next-browser-languagedetector` toevoegen.
- Twee vertaalbestanden: `src/i18n/locales/nl.json` (volledige NL) en `src/i18n/locales/en.json` (volledige EN).
- Config in `src/i18n/index.ts`, geïnitialiseerd in `src/main.tsx`. Standaardtaal: `nl`. Voorkeur opgeslagen in `localStorage` (`dindr.lang`).
- Alle UI-strings in pagina's en componenten vervangen door `t('key')`. Backend-waarden (categorie-keys, difficulty-enum, e.d.) blijven in het Engels; alleen labels worden via `t()` vertaald.
- Op `src/pages/Profile.tsx` een nette Taal-sectie met segmented toggle "Nederlands / English".
- De recent toegevoegde Nederlandse strings op `Filters.tsx` (en de eerder vertaalde labels) verhuizen naar de keys, zodat ze in beide talen werken.

## Scope per scherm
Volledige strings van: AppShell-nav, Auth, ResetPassword, Plan, Filters, Swipe, Matches, RecipeDetail, RecipeCard (frontkant), Shopping, Profile, Favorites, SwipeFavorites, Notifications, Claim, Creator-pagina's, NotFound, en gedeelde componenten (RecipeCard front/back labels, dialogen, knoppen).

Buiten scope: dynamische content uit de database (recepttitels, ingrediënten, stap-tekst) — die staat in één taal in de DB en wordt niet runtime vertaald.

## Technische details
```text
src/
  i18n/
    index.ts            # i18next init, detector, fallback=nl
    locales/
      nl.json
      en.json
main.tsx                # import "./i18n"
pages/Profile.tsx       # <LanguageToggle />
```
- Keys gegroepeerd per scherm: `nav.*`, `auth.*`, `plan.*`, `filters.*`, `swipe.*`, `matches.*`, `recipe.*`, `shopping.*`, `profile.*`, `common.*`.
- `i18n.changeLanguage(lang)` schrijft naar `localStorage`; `<html lang>` wordt bijgewerkt.
- Geen wijzigingen aan swipe-logica, auth-flow, edge functions of database.

## Verificatie
Na implementatie wissel ik in de preview tussen NL en EN op de Profiel-pagina en controleer ik dat navigatie, Filters, Swipe en Matches mee veranderen.