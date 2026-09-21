# AGENTS.md

Electron desktop app (Franz 5) — React 16 + MobX + react-router v3, monorepo via lerna.

## Setup

- Node version: see `.nvmrc` (22.23.2). CI uses Node 16.14.0; expect native-module drift.
- `.npmrc` pins `save-exact=true` and `legacy-peer-deps=true`. Use `npm`, not `yarn`.
- Install (link lerna packages too):
  ```
  npx lerna bootstrap
  ```
  If `npm install` was run first, delete `node_modules/` before this.
- Linux native-build deps: `apt install libx11-dev libxext-dev libxss-dev libxkbfile-dev` (see `docs/linux.md`).
- After dependency changes run `npm run rebuild` to re-sync native modules to the bundled Electron version (`@electron/rebuild -o node-mac-permissions --debug`). `npm start` does this automatically via the `prestart` hook.

## Develop

Run in **two terminals simultaneously** (gulp dev server + electron):

```
npm run dev    # terminal 1: gulp clean → transpile → livereload on ./build
npm run start  # terminal 2: electron ./build  (runs `npm run rebuild` first)
```

The dev build uses an isolated `userData` directory (`FranzDev`) and the embedded local API (see below), so the production database is untouched.

Useful variants:

- `npm run start:local` — force the embedded local API even outside dev.
- `npm run start:live` — point the dev app at the live Franz cloud API (`LIVE_API=1`).
- Set `OS_PLATFORM=win32` to simulate Windows behaviour on macOS/Linux (see `.vscode/launch.json` for ready-made configs).
- `npm run uidev` — webpack-dev-server playground under `uidev/`.

## Architecture

- Electron main process: `src/index.js` (build → `build/index.js`).
- Renderer entry: `src/app.js` (loads `src/index.html`); routes declared inline with `react-router` v3 + hash history, mounted inside a MobX `<Provider>`.
- Overlay renderer: `src/overlayApp.js` / `src/overlay.html` (basic-auth dialog, subscribe popup, etc.).
- IPC layer: `src/ipc-api/index.js` wires every handler; channels defined in `src/ipcChannels.ts`.
- MobX stores: `src/stores/`; actions: `src/actions/`; API clients: `src/api/` + `src/api/server/{ServerApi,LocalApi}.js`.
- Self-contained backend: `src/electron/localServer.js` boots an HTTP server on `127.0.0.1:45569` inside the main process, replacing the Franz cloud API for self-built/dev runs. Its URL is handed to the renderer via `FRANZ_LOCAL_API` and consumed by `src/environment.js`.
- Features: `src/features/<name>/` with `actions.js`, `store.js`, `index.js` (init function). Notable: `communityRecipes`, `serviceProxy`, `workspaces`, `announcements`, `appMenu`, `serviceLimit`, `spellchecker`, `todos`, `shareFranz`, `desktopCapturer`, `planSelection`, `basicAuth`, `delayApp`, `trialStatusBar`, `webControls`.
- Shared packages (consumed via `file:` deps + lerna bootstrap): `packages/{theme,forms,ui,typings}`. Each has `npm run build` → `lib/`; the gulp dev pipeline also copies `packages/**` into `build/packages/` so the dev server picks changes up.

## Build & release

```
npm run build    # runs `npm run buildPackges && gulp build` (via prebuild), then electron-builder
```

Output goes to `out/<version>/`. CI (`.github/workflows/build.yml`) builds for mac/ubuntu/windows with code-signing secrets and notarization.

## Generated / vendored content — regenerate, don't hand-edit

- `src/recipes-bundle/` — recipe archive index + tarballs + icons. Regenerate with `scripts/sync-recipes.sh [path/to/ferdium-app/recipes]` (default: `~/Projects/ferdium-app/recipes`). `localServer.js` reads `all.json` / `featured.json` / `archives/<id>.tar.gz` / `icons/<id>.svg` from here at boot.
- `src/i18n/messages/` — produced by babel-plugin-react-intl. Refresh with `npm run manage-translations` after adding/changing `<FormattedMessage>` or `intl.formatMessage(...)` calls.
- `extra-recipes/` — local-only recipes not in the upstream bundle. Copy into `~/.config/Franz/recipes/dev` (or `$XDG_CONFIG_HOME/Franz/recipes/dev`) with `extra-recipes/install.sh` for the dev app to pick up.
- `out/`, `build/`, `uidev/lib`, `*.tsbuildinfo`, `src/i18n/messages/`, `extensions/`, `.env` — all gitignored.

## Test / lint

- `npm run test` is a **no-op** (`echo ';)'`) — the project doesn't ship a test suite. The only jest test is `src/features/utils/FeatureStore.test.js`; run it directly with `npx jest src/features/utils/FeatureStore.test.js` or `npm run test:watch`.
- `npm run lint` — eslint over `src/` only (airbnb + @typescript-eslint). `packages/*/lib`, `build/`, `out/` are ignored. `tslint` is configured per-package but not wired to npm scripts.
- Prettier formatting: `npm run reformat-files` (respects `--require-pragma`, so add `// @format` at the top of a file to opt it in).

## Conventions / gotchas

- Imports use a mix of relative paths and `electron` aliases; ESLint resolver maps `node_modules` + `src/`. `import/extensions` is disabled — leave them off.
- `contextIsolation: false`, `nodeIntegration: true`, `webviewTag: true` in the main `BrowserWindow` (`src/index.js`) — the renderer is intentionally privileged.
- Renderer builds tolerate electron-node 4 via `.babelrc` (`@babel/preset-env` target).
- `process.type === 'renderer'` is the gate used in `src/config.js` to keep main-process side effects out of the renderer bundle.
- Use the existing debug namespaces (`require('debug')('Franz:App')`, `Franz:LocalServer`, etc.); the `DEBUG` env var controls them. The `.vscode/launch.json` configs set `DEBUG=*,-engine.io*,-socket.io*`.
- `package.json` lists `husky` but no `husky` config block — the hooks under `.git/hooks/` are stale v1 leftovers and not load-bearing. Don't add new hooks without re-installing husky.
- Commit messages: imperative present tense, ≤72 char subject, reference issues freely. Use `npm run commit` (commitizen + cz-conventional-changelog) for guided messages; `npm run changelog` regenerates `CHANGELOG.md`.