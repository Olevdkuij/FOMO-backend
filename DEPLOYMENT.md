# Deploying the FOMO backend

Right now this only runs on your Mac at `localhost:3000`, which is why the
app only works when your Mac is on and someone's on the same network. This
gets it onto real, always-on hosting so anyone can use the app from
anywhere.

## 1. MongoDB (production database)

Your `.env` already has a `MONGODB_URI` set, so you likely already have an
Atlas cluster — if the app currently shows real venues/recaps when your Mac
is running the backend, you're already using it and can skip to step 2.

If you ever need a fresh one: create a free cluster at
[mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas), add a
database user (Database Access) with a strong password, and under Network
Access add `0.0.0.0/0` (allow from anywhere) — hosts like Render don't have
a fixed IP, so this is the normal setup. Copy the connection string from
"Connect > Drivers" and that's your `MONGODB_URI`.

## 2. Push to GitHub

This repo is already connected to `Olevdkuij/FOMO-backend` on GitHub —
commit and push the changes from this session so Render has something to
deploy:

```
git add -A
git commit -m "Harden backend, add block/report"
git push
```

## 3. Deploy on Render

[Render](https://render.com) has a real free tier and is the simplest of
the common options. Railway and Fly.io work too if you'd rather use one of
those — the steps are similar, just skip the render.yaml blueprint part.

1. Sign up at render.com and connect your GitHub account.
2. New > Blueprint, pick the `FOMO-backend` repo. Render will read
   `render.yaml` (already in this repo) and set up the service — name,
   build command, start command, and health check are all pre-filled.
3. Before the first deploy finishes, open the service's Environment tab and
   add the real secret values (these are deliberately left out of
   render.yaml since they shouldn't live in the repo):
   - `MONGODB_URI` — from step 1
   - `JWT_SECRET` — any long random string (e.g. run
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     and use the output)
   - `RESEND_API_KEY` — password-reset emails go through [Resend](https://resend.com)
     (a free API key covers 3,000 emails/month). Gmail SMTP doesn't work here —
     Render blocks outbound SMTP ports, so that approach just hangs. Sign up,
     grab an API key from the dashboard, and set it here. `RESEND_FROM_EMAIL`
     is optional — without it, email sends from Resend's shared
     `onboarding@resend.dev` address, which works immediately with no domain
     setup.
4. Deploy. Render gives you a URL like `https://fomo-backend.onrender.com`.
   Visit `https://fomo-backend.onrender.com/health` — it should return
   `{"status":"ok","mongoConnected":true}`. If `mongoConnected` is false,
   double check `MONGODB_URI` and that Network Access in Atlas allows
   `0.0.0.0/0`.

**Free tier note:** Render's free web services spin down after 15 minutes
of no traffic and take ~30-60 seconds to wake back up on the next request.
Fine for a small beta (the first request after a quiet period is just
slow), but worth knowing so a "is it broken?" moment doesn't surprise you.
A paid instance ($7/mo) removes this if it becomes annoying.

## 4. Point the app at the real backend

The frontend defaults to `http://<your-Mac's-hostname>:3000/api` unless
`VITE_API_BASE` is set at build time. For a production build, set it to
your Render URL:

```
cd ~/dev/fomo-frontend
echo "VITE_API_BASE=https://fomo-backend.onrender.com/api" > .env.production
npm run build
npx cap sync ios
```

Then open and run from Xcode as usual. `.env.production` only affects
`npm run build` (production builds) — running `npm run dev` locally still
talks to your Mac's local server by default, so your day-to-day workflow
here doesn't change.

## 5. ALLOWED_ORIGINS (optional, mostly for later)

The backend now restricts CORS once `ALLOWED_ORIGINS` is set, but leaves it
open until then. Native app requests (from the Capacitor/iOS app) aren't
affected either way — CORS only applies to requests made from a browser
page, and there isn't one yet. Leave `ALLOWED_ORIGINS` unset for now; if
you ever add a companion website, set it there to that site's URL.

## 6. Push notifications (APNs, optional)

The "who's going out tonight" feature sends a real push notification to
everyone in a group chat. It's built and wired up, but stays silent (falls
back to a console log) until these are set — safe to skip for now and add
later.

- `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_AUTH_KEY` — from the
  [Apple Developer Portal](https://developer.apple.com/account): under
  Certificates, Identifiers & Profiles > Keys, create a new key with the
  "Apple Push Notifications service (APNs)" capability enabled, then
  download the `.p8` file — you only get one chance to download it. The
  key's ID (shown on the Keys page) is `APNS_KEY_ID`. Your Team ID (top
  right of the Developer Portal, or under Membership) is `APNS_TEAM_ID`.
  Open the `.p8` file and paste its full contents as `APNS_AUTH_KEY` — since
  Render's dashboard can't store real multi-line values cleanly, replace
  each line break with a literal `\n` (the backend un-escapes it
  automatically).
- `APNS_BUNDLE_ID` — the app's existing bundle identifier (the same one
  Xcode uses to build and sign the app).
- `APNS_ENV` — optional, defaults to production (`api.push.apple.com`).
  Set to `sandbox` to send through Apple's sandbox APNs server instead
  (`api.sandbox.push.apple.com`), which is what a debug/development build
  installed from Xcode actually receives pushes through.

The Capacitor push-notification plugin and the iOS entitlements it needs
still have to be added on your end (a `pod install` from a real Xcode
project) before device tokens exist to send to — this section only covers
the server side.
