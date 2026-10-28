# Adventure Library — v2 (data-driven catalog)

The library is live at https://adventures.pamsprogramming.com/ on GitHub Pages.

## Deploy

Upload/replace **index.html**, **styles.css**, **script.js**, **adventures.json**, **README.md** and keep the existing **CNAME** at the repository root. Commit to `main`; GitHub Pages deploys the update automatically.

## Add an adventure

Edit `adventures.json` and add an object to `adventures`. Each entry supports:

- `id`: unique identifier, e.g. `my-new-game` (future save key)
- `title`, `kicker`, `description`: card text
- `status`: `available` or `coming-soon`
- `url`: HTTPS game URL (required for playable cards)
- `buttonText`: playable button label
- `theme`: `loki`, `sorcery`, or `tech` (CSS visual presets)
- `sigil`, `symbol`: card decoration
- `comingText`: disabled card message

Change a preview to `available` and set its HTTPS `url` when the game is published. Never edit the card markup in `index.html` for new entries.

## Architecture and next milestone

This is **only the data-driven adventure catalog**. Loki's authentication, progress, and game logic are unchanged. There is no platform-wide login yet. Next, extract shared auth and make cloud progress adventure-aware with a safe migration, then build the authoring UI.

Test via GitHub Pages or a local HTTP server (e.g. `python -m http.server`); `file://` browsing may block JSON fetch.
