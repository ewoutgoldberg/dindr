De user wil de tekst op de floating view-switch knop in Profile.tsx wijzigen naar "Chef's mode".

Huidige tekst:
- "Switch to cook view" (als in creator modus)
- "Switch to Food Influencer" (als in consumer modus)

Gewenst:
- Beide labels vervangen door "Switch to Chef's mode"

Wijziging:
- In `src/pages/Profile.tsx`, regel 148: de ternary expression `{viewMode === "creator" ? "Switch to cook view" : "Switch to Food Influencer"}` vervangen door `"Switch to Chef's mode"`.

Technisch: alleen een tekststring wijziging, geen functionele impact.