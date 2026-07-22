# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`featureflow-client` on npm — the Featureflow **browser** Client SDK (TypeScript, 2.x line). Not for server-side JS (that's `../featureflow-node-sdk/`). `../react-featureflow-client/` wraps this SDK, so public API changes here ripple into the React bindings. Legacy browsers stay on the published 1.3.18; this codebase is the 2.x rewrite.

Runtime deps are just `mitt`, `js-cookie`, `base64-js`. The whole SDK is ~7 files in `src/`.

## Commands

```bash
npm test                                  # jest (ts-jest, jsdom environment)
npx jest src/Evaluate.test.ts             # single test file
npx jest -t "name of test"                # single test by name
npm run typecheck                         # tsc --noEmit (tsconfig has noEmit; rollup does the emitting)
npm run build                             # rollup -c → dist/ (ESM + CJS + UMD + UMD min)
npm run example                           # webpack dev server serving example/src/example.js
npm run example:ts                        # same but example.ts entry
```

CI (`.github/workflows/ci.yml`) runs typecheck + test + build on pushes/PRs to `main`; deploys fire on `v*` tags.

## Release / distribution

Two distribution channels, both driven by pushing a `v*` tag (CI deploy job):

1. **npm** — prerelease versions (`-alpha`/`-beta`/`-rc` in package.json version) auto-publish under that dist-tag, otherwise `latest`.
2. **CDN** — UMD builds go to `s3://cdn.featureflow.io` as `featureflow-<major.minor>.x[.min].js` and `/v<version>/featureflow[.min].js`, then CloudFront is invalidated. `deploy_prod_npm.sh` / `deploy_prod_s3.sh` are manual equivalents; note the S3 script also overwrites the un-versioned `featureflow.js` that legacy `<script>` users load — CI deliberately does not.

`dist/` is checked in only as build output; rollup builds it from `src/index.ts`. npm deps are external in the ESM/CJS builds but bundled into the UMD builds.

## Architecture

### Partial evaluation — the core design

The server does *most* of the evaluation, not all of it. `GET {baseUrl}/api/js/v1/evaluate/{apiKey}/user/{base64(user JSON)}` (served by `../sdk-server/`, cached by Fastly keyed on the URL) returns per feature either:

- a plain **variant string** — fully evaluated server-side, or
- a **`{rules: [...]}` object** — rules whose audience conditions target `featureflow.date` / `featureflow.hourofday` are deferred to the client so the response stays CDN-cacheable regardless of time of day.

`FeatureflowClient.evalRules()`/`ruleMatches()` resolve deferred rules against `currentContext` (populated with the current date/hour in `updateUserWithCache`) using the operators in [Conditions.ts](src/Conditions.ts). A condition whose target isn't in `currentContext` is skipped (treated as passing) — the server already handled it. **This wire format is shared with `sdk-server` and `featureflow-edge-proxy`; changes must stay compatible with both (see root CLAUDE.md).**

Rules can also carry a `value` — the variant's JSON config payload — surfaced via `evaluate(key).jsonValue()`. The `Evaluate` object ([Evaluate.ts](src/Evaluate.ts)) keeps variant (a lowercased string compared by `is()`/`isOn()`/`isOff()`) strictly separate from that JSON payload.

### Client lifecycle

- [index.ts](src/index.ts) `init(apiKey, [user], [config])` is the public entry; overloaded so the second arg may be a user or a config (discriminated by presence of `id`). It constructs `FeatureflowClient` and awaits `initialise()` unless `config.delayInit`.
- [FeatureflowClient.ts](src/FeatureflowClient.ts) holds all state. `initialise`/`updateUser` both funnel through `updateUserWithCache`: emit `LOADED_FROM_CACHE` from localStorage if present, then fetch fresh features (or synthesize from `defaultFeatures` in `offline` mode) and emit `INIT`. The fetch is wrapped in a `setTimeout(0)` so callers can attach `.on()` listeners before events fire.
- Features cache in localStorage under `ff:v1311:{userId}:{apiKey}` (the `v1311` prefix is deliberate cross-version compatibility — don't change it casually). Anonymous ids live in localStorage `ff-anonymous-id` and, unless `useCookies: false`, a cookie of the same name so server SDKs on the same domain can correlate the user.
- [RestClient.ts](src/RestClient.ts) uses raw `XMLHttpRequest` (no fetch). Evaluate/goal events are queued and batch-flushed to `{eventsUrl}/api/js/v1/event/{apiKey}` on a 2-second timer, fire-and-forget. `uniqueEvals` (default true) dedupes evaluate events per feature key for the client's lifetime.
- Event names are in [Events.ts](src/Events.ts); the emitter is `mitt`, with a `callbackMap` wrapper to support the `bindContext` argument and `off()` semantics.

### Testing notes

Tests live alongside source (`src/*.test.ts`), run under jsdom, and mock `RestClient`/`XMLHttpRequest` rather than hitting the network.
