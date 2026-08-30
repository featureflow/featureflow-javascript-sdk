# Change log
## [2.6.0]
- New `exposureIntegration(send, options?)` export: the tool-agnostic analytics integration. `send` is called once per new (user, flag, variant) with the full `EvaluationDetails`, and you write the event in whatever shape your tool expects — Mixpanel `$experiment_started`, PostHog `$feature_flag_called`, Segment `Experiment Viewed`, a GA4 event, anything. Same per-page dedupe and `flags` filter (array or predicate) as `amplitudeIntegration`
- `amplitudeIntegration` is now built on `exposureIntegration`. No behaviour change
- New exported types: `ExposureSender`, `ExposureIntegrationOptions`, `FlagFilter`

## [2.5.0]
- New `flags` option on `amplitudeIntegration`: choose which flags send exposures — an array of exact keys (`{ flags: ['checkout-v2'] }`) or a predicate for naming conventions (`{ flags: (key) => key.startsWith('exp-') }`). Omitted sends every flag (unchanged); `[]` sends none. Gates both the `$exposure` event and the `featureflow_<flagKey>` user property, and filtered keys never enter the dedupe set

## [2.4.1]
- Fix `AmplitudeLike` parameter types: `unknown` parameters rejected the real Amplitude SDKs under TypeScript's contravariance rules, so `amplitudeIntegration(amplitude)` failed to compile against `@amplitude/unified`. No runtime change

## [2.4.0]
- New `EVALUATION` event: fires synchronously on every `evaluate(key)` call with `{ key, variant, value, user }` — the hook for wiring flag exposures into analytics tools. `evaluateAll()` deliberately does not fire it. A throwing listener is logged and swallowed; it never breaks flag evaluation
- New `integrations` config option: an array of `EVALUATION` listeners wired at init, each isolated so one broken integration cannot break another
- New `amplitudeIntegration(amplitude, options?)` export: sends `$exposure` events (`flag_key`, `variant`) to the customer's own Amplitude instance for A/B analysis in Amplitude Experiment, and sets a `featureflow_<flagKey>` user property via the Identify API (disable with `identify: false`). Exposures are deduped per (user, flag, variant) for the page's lifetime, so `evaluate()` in a render loop cannot inflate Amplitude event volume. Duck-typed against the customer's instance — works with `@amplitude/unified` and `@amplitude/analytics-browser`, no new dependency

## [2.3.0]
- New `application` config option — a site/app label (e.g. `web-app`) sent as the `X-Featureflow-Application` header on evaluate and event requests so the Featureflow dashboard can attribute SDK usage and flag evaluations per application. A slug (lowercase `[a-z0-9._-]`, max 64 chars); invalid values are dropped with a console warning. On the `sendBeacon` unload path (which cannot set headers) the tag rides as an `application` field on the event DTOs

## [2.2.1]
- `Retry-After` is now only read on a 429 response. Reading it on every event response made browsers log "Refused to get unsafe header" on each successful flush, because `Retry-After` is not a CORS-safelisted response header
- Note that honouring a server-sent `Retry-After` cross-origin also requires the events server to list it in `Access-Control-Expose-Headers`; where it does not, the SDK falls back to its default 60 second backoff

## [2.2.0]
- Client-side event summarisation: evaluation events are batched as per feature/variant impression counts instead of one raw event per evaluation
- New `track(goalKey, details?)` API for goal events (OpenFeature-congruent); `goal(goalKey)` is now a deprecated alias and no longer sends the full evaluated-features map
- Pending events are flushed via `navigator.sendBeacon` when the page is hidden or unloading, and when `updateUser()` switches users
- Server signals honoured: 401/403 permanently disables event sending; 429 requeues the batch and backs off `Retry-After`
- Server-driven SDK config applied from the events response body (`eventsEnabled`, `mode`, `flushIntervalSeconds`)
- New `disableEvents` config option; `uniqueEvals` is deprecated (no effect)

## [1.3.18]
- Performance Improvements

## [1.3.1]
- Fix edge case for old version cached variants in browser to ensure smooth upgrade to 1.3.1

## [1.3.0]
- Smart Evaluations. Dates are evaluated locally to improve response and CDN
- Target by hour of day 
- Target by date
- Default Streaming option to false

## [1.2.2]
- Bug Fixes 
- New Events URL

## [1.2.1]
- Bug Fixes

## [1.2.0]
- Events API Improvements
- Bug Fixes

## [1.1.1] - 2017-09-05
- Events Object Improvements

## [1.1.1] - 2017-09-05
- Events Object Improvements

## [1.1.0] - 2017-09-04
- Use Featureflow User object instead of context
- Breaking changes - Migrated to FeatureflowUser

## [0.7.2] - 2017-07-03
### Fixed
- Using rollup for bower/web releases.
## [0.7.1] - 2017-06-28
### Fixed
- Added initialized flag, can access using `featureflow.hasReceivedInitialResponse()` and returns a boolean if the data has been loaded from featureflow or not, or if an errro has occured
## [0.6.1] - 2017-05-02
### Fixed
- Events were not sending the correct content-type
## [0.6.0] - 2017-04-27
### Changed
- Sending `Featureflow.events.LOADED_FROM_CACHE` when the data is loaded from local storage.
- Now also sending `Featureflow.events.INIT` when the data is first retrieved from the server.
  - Still sending `Featureflow.events.LOADED` but this is deprecated.
- Updated the events to send the right format
## [0.4.4] - 2017-04-18
### Fixed
- Evaluate event wasn't sending the right JSON.
## [0.4.3] - 2017-04-07
### Fixed
- Offline features caching was not working when baseUrl was unreachable. Not using callback correctly.
## [0.4.1] - 2017-04-06
### Changed
- Added default callback on requests to hide console errors.
## [0.4.0] - 2017-04-03
### Breaking Changes
- Updated events service to post to new endpoint. Not a breaking change for client, but breaking change for application.
### Changed
- Added event for when calling the evaluate method.
## [0.3.0] - 2017-03-28
### Breaking Changes
- Appended a random string to anonymous context key to assist with split variants. This is stored in localStorage against the apiKey.
  - e.g. context key would change from `'anonymous'` to a string similar to `'anonymous:f444bt1f2v9iy0hpvi'`
### Changed
- Now storing cookie for context key which can be used to sync anonymous user requests with backend Featureflow SDK.
- Added `config.useCookie` option to turn cookie off. Defaults to `true`.
### Fixed
- Goal endpoint updated to include `contextKey` and use explicit property `goalKey`
## [0.2.5] - 2017-03-24
### Changed
- `featureflow.updateContext(context, [callback])` - now takes callback argument
## [0.2.4] - 2017-03-23
### Changed
- Rewritten Featureflow client as es6 class. No change on functionality, just nicer syntax to write in.
- Added goal endpoint for A/B testing experiments. Use `featureflow.goal('goal-key')` to register goals with your project/environment.
## [0.2.3] - 2017-03-21
### Fixed
- Fixed bug where the realtime update doesn't save to localStorage.
## [0.2.1] - 2017-03-07
### Fixed
- Fixed bug where after a realtime update error it would try to 
apply the changes to the features object, even though it didn't exist
### Changed
- Added library version and license comment banner to the top of the generated JS files
- Updated the example code to work after refactor of controls to features
- Added library version to HTTP headers
## [0.2.0] - 2017-03-02
### Changed
- default feature variant value set to `'off'` if no default feature is defined
- defaultFeatures are passed in as part of the configuration object
- set streaming on by default
- Updated README.md with changes made to library
### Breaking Changes
- Changed the interface to be more expressive when evaluating features
- Removed defaultVariant argument from evaluate functions (use `config.defaultFeatures`)

## [0.1.0] - 2017-02-23
### Changed
- Rewrite of the core library in es6, should now be easier to follow
- Removed custom EventEmitter implementation in favour of using [tiny-emitter](https://github.com/scottcorgan/tiny-emitter)
- Updated the example application to use ace editor for better control over playing with context
- `Featureflow.init()` now returns a new instance each time it is called
- Updated README.md with the changes made to the core library, added API section
- Added server sent events for realtime streaming of feature updates
  - Set `{ streaming: true }` in your config, and listen to `- featureflow.on(Featureflow.events.UPDATED_CONTROL, <callback>)`
### Breaking Changes
- Removed `featureflow.context` and `featureflow.controls`
  - Replaced by `featureflow.getControls()` and `featureflow.getContext()`
- Replaced `ready`, `updated:context`, `updated:controls` events,
 now you should listen to `Featureflow.events.LOADED` which returns the updated controls as a map 

## [0.0.7] - 2017-02-20
### Changed
- Added bower support

## [0.0.5] - 2017-02-16
### Changed
- Added an example project

## [0.0.4] - 2017-02-15
### Changed
- Updated README.md with Quick start and link to documentation
- Added jsbin example application
- Updated webpack.config.js to use babel, es2015, and flow static typing
- Updated webpack to v2.2.1
- Publish to npm!!!
- Added git repo to package.json

## [0.0.1] - 2016-11-23
### Changed
- Initial Build

