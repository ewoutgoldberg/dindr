## Doel

Dinder zo opzetten dat hij goed werkt als installeerbare web app op telefoons (iPhone & Android), zonder de complexiteit en valkuilen van een full PWA met service worker.

## Aanpak: manifest-only installable web app

We voegen een **web app manifest + mobiele meta tags + app icons** toe. Geen `vite-plugin-pwa`, geen service worker. Reden: een service worker veroorzaakt vaak problemen in de Lovable preview (stale cache, gebroken navigatie) en jij hebt geen offline-modus nodig — alleen "Add to Home Screen" en een goede mobiele ervaring.

Resultaat: gebruikers kunnen Dinder vanuit Safari/Chrome aan hun home screen toevoegen, hij start zonder browser-balk, met de juiste kleuren, het juiste icoon en een echte app-feel.

## Wat we toevoegen

1. **App icons** in `public/`
   - `icon-192.png` (192x192) en `icon-512.png` (512x512), gegenereerd uit het Dinder logo met de coral/oranje merkkleur als achtergrond
   - `icon-maskable-512.png` voor Android adaptive icons (logo met veilige padding)
   - `apple-touch-icon.png` (180x180) voor iOS home screen

2. **`public/manifest.webmanifest`** met:
   - `name`: "Dinder — Tinder for Dinner"
   - `short_name`: "Dinder"
   - `description`, `start_url: "/"`, `scope: "/"`
   - `display: "standalone"` (volledig scherm, geen browser-UI)
   - `background_color: "#F4523E"`, `theme_color: "#F4523E"`
   - `orientation: "portrait"`
   - `icons` array met de drie PNG's hierboven (incl. `purpose: "maskable"`)

3. **`index.html` mobiele meta tags**
   - Link naar het manifest
   - `apple-touch-icon` link
   - iOS-specifieke tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title: "Dinder"`
   - Behoud bestaande `theme-color` en viewport (die zijn al goed: `viewport-fit=cover` voor notch/safe-area)

4. **Kleine mobiel-UX verbeteringen**
   - Body krijgt `overscroll-behavior: none` (al aanwezig op y, uitbreiden naar x) en `-webkit-user-select: none` op niet-tekst elementen, zodat het minder als webpagina aanvoelt en meer als app
   - Controleren dat alle pagina's `safe-bottom`/`env(safe-area-inset-*)` correct gebruiken (bottom nav doet dit al — quick check op overige schermen)

## Wat we NIET doen

- Geen `vite-plugin-pwa` of service worker — geen offline-cache, geen update-prompts. Dat geeft in Lovable previews stale-build problemen en jij hebt het niet nodig voor "installeerbaar zijn".
- Geen Capacitor / native build — dat is een aparte route die je eerder niet gevraagd hebt. Als je later in de App/Play Store wilt, kunnen we die stap apart zetten.

## Beperkingen om te weten

- Push notifications van de "Notify partner" feature blijven **in-app** (badge op MyKitchen). Echte OS-push notifications vereisen een service worker + backend setup, of de Capacitor-route.
- Installeerbaarheid op iOS werkt alleen via Safari → Share → "Voeg toe aan beginscherm". Android Chrome toont vanzelf een install-prompt.

## Technische details

Bestanden die gewijzigd / toegevoegd worden:

```text
public/
  manifest.webmanifest          (nieuw)
  icon-192.png                  (nieuw, gegenereerd)
  icon-512.png                  (nieuw, gegenereerd)
  icon-maskable-512.png         (nieuw, gegenereerd)
  apple-touch-icon.png          (nieuw, gegenereerd)
index.html                      (manifest + apple meta tags toevoegen)
src/index.css                   (kleine overscroll/select tweaks)
```

Geen wijzigingen aan `vite.config.ts`, geen extra dependencies.

## Hoe je het test

1. Na implementatie publiceren via de Publish-knop (manifests werken niet altijd 1-op-1 in de iframe-preview).
2. Op je telefoon naar `https://dindr.lovable.app` → Share → Add to Home Screen.
3. Open vanaf het home screen: app start fullscreen, met Dinder-icoon en coral splash, zonder browser-balk.
