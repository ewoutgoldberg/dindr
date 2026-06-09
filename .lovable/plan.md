# Witruimte onder nav weg + nav écht stilzetten

Twee separate problemen in `src/index.css` en `src/components/AppShell.tsx`.

## 1. Witruimte onder de nav

De `.safe-bottom` utility is nu:
```css
padding-bottom: max(env(safe-area-inset-bottom), 1rem);
```
Dat dwingt minimaal 16px padding af, óók bovenop de iOS home-indicator inset (34px) → de nav lijkt zwevend met witruimte eronder.

Fix in `src/index.css`:
```css
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```
(Pure safe-area inset, geen extra minimum. Op devices zonder inset = 0.)

## 2. Nav beweegt nog steeds

`h-[100dvh] overflow-hidden` op de AppShell-root volstaat niet altijd in WKWebView: de `<body>` zelf kan nog rubber-band-scrollen, en dat duwt visueel ook de nav mee. `overscroll-behavior: none` op body wordt door oudere WebKit-versies genegeerd.

Fix in `src/index.css` (body):
```css
body {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  /* bestaande regels behouden */
}
```
En in `src/components/AppShell.tsx` de outer van `h-[100dvh] flex flex-col overflow-hidden` naar `h-full flex flex-col overflow-hidden` (omdat body nu de viewport vult).

Hiermee kan alleen de scroll-container binnen `<main>` (of de per-page body) nog scrollen; de nav en headers staan letterlijk stil.

## Verificatie
- Preview: nav zit strak onderaan, geen lichte band eronder behalve de iOS home-indicator zelf.
- Scrollen op Plan/Matches/MyKitchen: alleen content beweegt, nav en header blijven 100% stil.
- Swipe-pagina behoudt zijn full-bleed layout (geen scroll, blijft passen binnen viewport).
