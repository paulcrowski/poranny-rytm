# Poranny rytm

A Polish-language workout and meditation timer you can install as a web app. Start with a morning warm-up, a strength workout, or a meditation plan.

[Open the app](https://poranny-rytm-paul.morepol00.chatgpt.site/)

- Rename each plan and add, edit, reorder, or remove its steps.
- Set a duration and an optional note for each step. Short tones mark the start and end.
- See completed exercises by day and check how many times you’ve done each one. Skipped steps are excluded.
- Use the app offline after the first successful visit.

History and plan names are stored in the current browser. Exercise totals group completions by name, ignoring capitalization. Optional device sync covers the strength plan’s steps and rest setting.

## Run locally

Run `python3 -m http.server 5173 --directory dist` and open http://localhost:5173. Run `npm test` to check timer transitions, workout history, and PWA assets.

## Optional device sync

Run `npm ci` and `npx convex dev` with your own Convex project. Set your deployment URL in `dist/cloud-config.js`. Pair devices with the code shown in the strength plan’s sync dialog.
