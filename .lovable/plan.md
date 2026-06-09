# Headers stilzetten op iOS (optie A)

Zelfde patroon als de bottom-nav: de pagina zelf scrollt niet meer, alleen het gebied ónder de header. De header staat als `shrink-0` bovenaan en blijft stil tijdens momentum-scroll in WKWebView.

## Wijzigingen

### 1. `src/components/AppShell.tsx`
- `<main>` weer naar `flex-1 min-h-0 overflow-hidden safe-top flex flex-col` (geen scroll meer in main).
- Elke pagina krijgt nu zelf de scroll-container.

### 2. Per pagina: structuur omzetten
Huidig patroon:
```text
<div className="max-w-md mx-auto w-full px-5 pt-6 pb-8 ...">
  <header className="mb-6">...</header>
  ...rest...
</div>
```
Wordt:
```text
<div className="h-full flex flex-col">
  <header className="shrink-0 max-w-md mx-auto w-full px-5 pt-6 pb-4 ...">
    ...
  </header>
  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
    <div className="max-w-md mx-auto w-full px-5 pb-8">
      ...rest...
    </div>
  </div>
</div>
```

Aan te passen pagina's:
- `src/pages/Plan.tsx`
- `src/pages/Matches.tsx`
- `src/pages/Filters.tsx` (let op: bevat ook `DatePickerDialog` — die blijft buiten de scroll-body)
- `src/pages/Shopping.tsx`
- `src/pages/Notifications.tsx`
- `src/pages/Favorites.tsx`
- `src/pages/SwipeFavorites.tsx` (header al `shrink-0`-achtig; outer wordt `h-full flex flex-col`, body wordt scrollend)
- `src/pages/admin/AdminCreators.tsx`

### 3. Niet aanraken
- Pagina's zonder `<header>` (Profile, RecipeDetail, Swipe, Auth, etc.) houden hun huidige gedrag. Omdat `<main>` straks `overflow-hidden flex flex-col` is, krijgen ze automatisch een `flex-1 min-h-0`-container nodig als ze willen scrollen. Voor deze pagina's voeg ik een fallback toe: `<main>` wikkelt children niet in een scroller, dus pagina's die nog niet omgezet zijn kunnen tijdelijk afgeknipt raken.

  → Daarom: voor pagina's zónder eigen header voeg ik óók de wrapper toe (`h-full flex flex-col` + interne scroll-body) of houd ik backwards-compat in AppShell door als fallback `overflow-y-auto` te laten staan en alleen pages met eigen header te laten "opt-in"-en.

## Aanpak voor compat
Veiligste variant: **AppShell `<main>` blijft `overflow-y-auto`** (zoals nu), maar pagina's met een header krijgen elk een binnenshell die zelf scrollt en `sticky top-0` op de header. Dat is echter optie B.

Voor échte optie A maak ik `<main>` non-scrolling. Om regressies op andere pagina's te voorkomen, zet ik elke "consumer/creator/admin"-tabpagina expliciet om naar de nieuwe shell. Pagina's die buiten de bottom-nav vallen (Auth, RecipeDetail, Swipe, SwipeFavorites, Profile, enz.) controleer ik visueel; waar nodig wikkel ik content in `<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">`.

## Verificatie
- Build runt schoon.
- Preview op Plan, Matches, Filters, Shopping, Notifications, Favorites, MyKitchen: header blijft stil tijdens scrollen, content scrollt vloeiend, niets verdwijnt achter nav.
- iOS rubber-band beweegt enkel binnen de scroll-body, niet de header of nav.
