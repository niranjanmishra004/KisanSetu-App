# KisanSetu App (Android)

> Know your market. Know your price — as a native Android app.

Native Android wrapper of [KisanSetu](https://github.com/niranjanmishra004/KisanSetu)
(Market Price Tracker, React 19 + Vite) via Capacitor. Same code, same live
Agmarknet prices — installable APK, no login, no tracking.

The website repo stays frozen and web-only; all Android work happens here.

## Develop (light — no Android Studio needed)

```bash
npm install
npm run dev        # browser dev, F12 > phone view for mobile layout
npm run lint
npm run android:build   # vite build + cap sync android (fast, low RAM)
```

Open `android/` in Android Studio only if you want local emulation.
Otherwise everything builds in the cloud (see below).

## Get the APK

Push to `main` → GitHub Actions builds `kisansetu-debug-apk` automatically.
Download the artifact, send it to your phone, tap to install.

## F-Droid status

FOSS-only: MIT licensed, no Firebase / Google Play Services.
Price alerts use on-device local notifications.
Submission metadata draft: `fdroid/com.kisansetu.app.yml`
Store listing text: `fastlane/metadata/android/en-US/`

## Notes

- On-device the app calls the FastAPI backend directly over HTTPS, so the
  backend must allow CORS origin `capacitor://localhost` (see farmer_api repo).
- `api/` + `vercel.json` are web leftovers, unused by the native build.
- Icons/splash are generated from `public/favicon.svg` (forest green +
  mustard sprout); vectors live in `android/app/src/main/res/`.
