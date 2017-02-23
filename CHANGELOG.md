# Change log

## [0.1.0] - 2017-02-23
### Changed
- Rewrite of the core library in es6, should now be easier to follow
- Removed custom EventEmitter implementation in favour of using [tiny-emitter](https://github.com/scottcorgan/tiny-emitter)
- Updated the example application to use ace editor for better control over playing with context
- `Featureflow.init()` now returns a new instance each time it is called
- Updated README.md with the changes made to the core library, added API section
- Added server sent events for realtime streaming of feature updates
  - Set `{ streaming: true }` in your config, and listen to `featureflow.on(Featureflow.events.UPDATED_CONTROL, <callback>)`
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

