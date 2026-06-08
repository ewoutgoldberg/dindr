# Plan: Instagram + TikTok video-integratie voor Dindr + Fiverr-opdracht

## Doel
Binnen Dindr willen we video's (reels/posts) tonen die food-creators op **Instagram** en **TikTok** hebben gepost. De OAuth-koppeling werkt al code-technisch, maar de Meta- en TikTok-developer-apps zijn nog niet correct geconfigureerd. We willen dit door één freelancer via Fiverr laten regelen, voor beide platforms tegelijk.

## Wat we gaan doen in deze loop
Geen code-wijzigingen — alleen voorbereiding:

1. Een **TikTok-connector / secrets** plekje reserveren (zelfde patroon als Instagram). De edge function `social-oauth-start` ondersteunt TikTok al, maar mist `TIKTOK_CLIENT_KEY` en `TIKTOK_CLIENT_SECRET`. Die voegen we pas toe zodra de freelancer de TikTok-app heeft aangemaakt.
2. Een **Fiverr-briefing in het Nederlands** opstellen die de freelancer alles geeft wat hij/zij nodig heeft om Instagram én TikTok end-to-end live te krijgen.
3. Een korte **Nederlandse boodschap aan de freelancer** klaarzetten (kort, vriendelijk, met de juiste verwachting).

## De Fiverr-briefing (kant-en-klaar te plakken)

**Titel:**  
"Meta (Instagram) Login + TikTok Login API configureren voor productie-app (OAuth)"

**Beschrijving:**

> Hoi! Voor mijn app **Dindr** (een Tinder-achtige recepten-app, React + Supabase) wil ik dat food-creators hun **Instagram** én **TikTok**-account kunnen koppelen, zodat we hun videos/reels in de app kunnen tonen.
> 
> De backend (Supabase Edge Functions) is al klaar — OAuth-start, callback en token-opslag werken. Wat ik nodig heb is iemand die **de developer-portals correct configureert** zodat normale gebruikers (niet alleen testers) kunnen inloggen.
> 
> **1. Meta / Instagram (Facebook Login for Business + Instagram Graph API)**
> - Bestaande app in https://developers.facebook.com gebruiken (App ID en Secret zijn er al)
> - Producten toevoegen: **Facebook Login**, **Instagram Graph API**
> - Valid OAuth Redirect URI toevoegen:  
>   `https://wwrsmocfsdcsnucluxht.supabase.co/functions/v1/social-oauth-callback?platform=instagram`
> - App van **Development** → **Live** zetten
> - App Review aanvragen voor: `instagram_basic`, `pages_show_list`, `instagram_manage_insights`, `pages_read_engagement`
> - Privacy Policy URL, Data Deletion URL, App Icon en Business Verification regelen indien Meta erom vraagt
> - Test: inloggen vanuit `https://dindr.lovable.app` met een willekeurig (niet-tester) Instagram Business/Creator-account
> 
> **2. TikTok (Login Kit + Display API)**
> - Nieuwe app aanmaken op https://developers.tiktok.com
> - Producten toevoegen: **Login Kit**, **Display API** (en evt. Content Posting API als beschikbaar)
> - Scopes: `user.info.basic`, `video.list`
> - Redirect URI toevoegen:  
>   `https://wwrsmocfsdcsnucluxht.supabase.co/functions/v1/social-oauth-callback?platform=tiktok`
> - App-review aanvragen zodat productiegebruikers (niet alleen sandbox-testers) kunnen inloggen
> - Client Key + Client Secret aanleveren — ik zet ze zelf in Lovable Cloud secrets
> - Test: inloggen vanuit `https://dindr.lovable.app` en `video.list` ophalen
> 
> **Deliverables**
> - Werkende OAuth-login op productie voor beide platforms (live demo)
> - Korte handover (1 pagina): app-id's, secrets, scopes, status van app-reviews, eventuele to-do's mijnerzijds
> 
> **Vereiste ervaring:** Meta Login API, Instagram Graph API, TikTok Login Kit / Display API, OAuth 2.0, ervaring met App Review-trajecten.
> 
> **Budget/Tijd:** graag opgeven; ik verwacht 2–5 werkdagen inclusief review-trajecten van de platforms.

## Korte chatboodschap voor de freelancer (na boeking)

> Hi! Bedankt dat je dit oppakt. Korte context: de app heet **Dindr** (https://dindr.lovable.app) en draait op React + Supabase Edge Functions. De OAuth-code staat al klaar, jij hoeft alleen de Meta- en TikTok-developer-apps correct te configureren en door review te krijgen. Alles wat je nodig hebt staat in de opdracht. App ID + Secret voor Instagram heb ik al; TikTok Client Key + Secret stuur jij naar mij zodra je de app hebt aangemaakt, dan zet ik ze in onze secrets. Laat me weten als je iets mist!

## Volgende stap (na deze plan-fase, in build-mode)
Zodra de freelancer TikTok-credentials oplevert:
1. `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` als secrets toevoegen.
2. Eventueel het callback-pad in `social-oauth-callback` controleren/uitbreiden voor TikTok (token-exchange + opslag in `creator_social_connections`).
3. Frontend: TikTok-knop activeren op de creator-koppelpagina, en in de feed/recipe-detail naast Instagram-embeds ook TikTok-embeds tonen.

Geen code wordt in deze fase aangepast — dit plan is puur de tekst + briefing die je naar Fiverr kunt sturen.