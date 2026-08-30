# MapKit JS (Apple Maps) — backend token endpoint

FOMO's Venues map view (fomo-frontend/src/components/VenueMap.tsx) uses
Apple's MapKit JS instead of Google Maps. This backend signs the JWT it
needs.

## What's already set up

- `src/routes/mapkitToken.js` — `GET /api/mapkit-token`, mounted in `index.js`
- `secrets/AuthKey_52PMU4NT47.p8` — the Maps private key (gitignored via `secrets/` in `.gitignore`)
- `.env` — `MAPKIT_TEAM_ID`, `MAPKIT_KEY_ID`, `MAPKIT_KEY_PATH` set for local dev
- Apple Developer account: Maps ID `maps.com.FOMO.Marbella.fomo`, Key ID `52PMU4NT47`, Team ID `NB2NFDVNX4`
  (developer.apple.com → Certificates, Identifiers & Profiles)

## Deploying to Render

Render doesn't see your local `.env` or `secrets/` folder — both are
gitignored on purpose (the private key should never be committed). You need
to add these manually in the Render dashboard for the `fomo-backend`
service, under **Environment**:

```
MAPKIT_TEAM_ID=NB2NFDVNX4
MAPKIT_KEY_ID=52PMU4NT47
MAPKIT_ALLOWED_ORIGIN=<your production frontend origin, once you have one>
```

For the private key itself, add a **Secret File** in Render (Environment →
Secret Files) named e.g. `AuthKey_52PMU4NT47.p8` with the contents of
`secrets/AuthKey_52PMU4NT47.p8`, mounted at `/etc/secrets/AuthKey_52PMU4NT47.p8`
(Render's default mount path for secret files). Then also set:

```
MAPKIT_KEY_PATH=/etc/secrets/AuthKey_52PMU4NT47.p8
```

so the running server reads the key from Render's secret file instead of
the local `secrets/` folder (which won't exist on Render).

## If the key ever leaks

Revoke it at developer.apple.com → Certificates, Identifiers & Profiles →
Keys, generate a new one, and update `secrets/AuthKey_<newKeyId>.p8` +
`MAPKIT_KEY_ID` + `MAPKIT_KEY_PATH` everywhere (local `.env` and Render).
