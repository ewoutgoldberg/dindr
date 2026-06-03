## Doel
Dindr kan vooraf creator-profielen en recepten klaarzetten. Creators claimen later hun account via een unieke link en kunnen content goedkeuren of aanpassen.

## Database wijzigingen (Lovable Cloud)

**`food_creators` — nieuwe kolommen**
- `status` text default `'unclaimed'` — check: `unclaimed | invited | claimed | verified`
- `user_id` uuid nullable (gekoppelde auth user na claim)
- `claim_token` text unique (gegenereerd bij aanmaken)
- `invited_at`, `claimed_at`, `verified_at` timestamps
- `badge_new` boolean default true (verdwijnt na claim)

**`recipes` — nieuwe kolommen**
- `content_source` text default `'admin_created'` — `admin_created | creator_created | imported`
- `creator_approved` boolean default false
- `published` boolean default false

**RLS updates**
- `food_creators`: public SELECT blijft; UPDATE toegestaan voor `auth.uid() = user_id` (na claim) of admin
- `recipes`: SELECT alleen waar `published = true` OR admin OR `creator_id` van eigen profiel; UPDATE voor eigen creator-profiel of admin
- Nieuwe security-definer functie `claim_creator(token text)` die `user_id` koppelt en status op `claimed` zet

**Bestaande data**: alle huidige creators krijgen status `verified` (al live), bestaande recipes `published = true, creator_approved = true`.

## Routes & pagina's

```
/admin/creators          Lijst + filters (unclaimed/invited/claimed/verified)
/admin/creators/new      Creator aanmaken (alle velden + foto upload)
/admin/creators/:id      Detail: profiel bewerken, recepten beheren, claim-link kopiëren, uitnodigen
/admin/creators/:id/recipes/new   Recept toevoegen aan creator
/claim/:token            Publieke claim-flow (login/signup → bevestigen)
/creator/dashboard       Welkomstscherm na claim: profiel, recepten (concepten/publicaties), goedkeuren
```

Admin-toegang via bestaande `has_role(uid, 'admin')`.

## UI componenten

- **AdminCreatorsList**: tabs voor statussen, "Nieuwe creator" knop, kopieer claim-link
- **CreatorForm**: velden zoals gespecificeerd, avatar/cover upload naar `lovable-uploads`
- **ClaimPage**: toont preview profiel + recepten, knop "Claim dit profiel" (vereist login)
- **CreatorDashboard**: stats (X recepten, Y concepten), lijsten met goedkeur/bewerk/publiceer acties
- **"Nieuw op Dindr" badge** op CreatorCard wanneer `badge_new = true && status != claimed/verified`

## Recept-goedkeuringsflow

1. Admin maakt recept (`content_source='admin_created'`, `creator_approved=false`, `published=false`)
2. Creator claimt profiel
3. Dashboard toont sectie "Voorgestelde recepten" met Goedkeur / Bewerk / Verwijder
4. Goedkeuren → `creator_approved=true, published=true`
5. Bewerken → opent editor, na opslaan publiceren

## Feed gedrag

`Creator.tsx` en swipe-feed tonen ook unclaimed creators + hun gepubliceerde recepten, met badge "Nieuw op Dindr". Badge verdwijnt zodra status `claimed` of `verified` is.

## Buiten scope (later)
- Bulk import CSV/JSON
- Email-uitnodigingen versturen (nu: link kopiëren handmatig)
- Verified-badge promotie flow (admin zet handmatig)

## Volgorde van implementatie
1. Migratie (kolommen, RLS, claim-functie, defaults voor bestaande rijen)
2. Admin pagina's (lijst + form + detail)
3. Claim-flow + creator dashboard
4. Feed-aanpassingen (badge, filter op `published`)
