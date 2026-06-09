## Fix: status-bar overlapping page content in installed web app

**Problem**
When Dindr is installed as a web app (PWA / "Add to Home Screen") on iOS, the app runs in standalone mode with `viewport-fit=cover`. The system status bar (time, signal, battery) draws on top of the page because we never reserve room for `env(safe-area-inset-top)`. Today only the bottom nav uses a `.safe-bottom` helper — there is no equivalent for the top, so the page headers ("What's cooking?", "Tune your inspiration", etc.) sit underneath the iOS status bar.

**Fix (minimal, presentational only)**

1. **`src/index.css`** — add a sibling utility next to `.safe-bottom`:
   ```css
   .safe-top { padding-top: max(env(safe-area-inset-top), 0px); }
   ```

2. **`src/components/AppShell.tsx`** — apply `safe-top` to the outer wrapper so every route inherits the inset, and also apply it to the `PingPopup`-containing area. Concretely:
   - Add `safe-top` to the root `<div className="min-h-screen flex flex-col bg-background">`.
   - This pushes every page's first paint below the status bar without touching individual pages.

3. **`index.html`** — add `<meta name="apple-mobile-web-app-status-bar-style" content="default" />` (or `black-translucent` to match `viewport-fit=cover`) so iOS treats the status bar consistently with our padding.

That's the entire change. Bottom nav already handles `safe-area-inset-bottom`, so no further changes there.

**Why no per-page edits**
Putting the safe-area inset on the AppShell root means every screen (Plan, Filters, Swipe, Matches, MyKitchen, etc.) automatically gains the right top spacing in standalone mode and remains pixel-identical in the browser (where `env(safe-area-inset-top)` resolves to `0`).

**Acceptance**
- Installed as web app on iOS: status bar no longer overlaps "What's cooking?" header or any other page title.
- In normal mobile browser tabs and desktop: no visible change (the inset is 0).
- Bottom nav behaviour unchanged.