# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.6](https://github.com/plumier/plumier/compare/v1.0.5...v1.0.6) (2021-10-04)


### Bug Fixes

* **core:** Fix http status error response for 403 Forbidden and 401 Unauthorized ([#1014](https://github.com/plumier/plumier/issues/1014)) ([b235819](https://github.com/plumier/plumier/commit/b2358195477eaafb0654e92c8605bc1ecf7a8350))





## [1.0.5](https://github.com/plumier/plumier/compare/v1.0.4...v1.0.5) (2021-07-25)

**Note:** Version bump only for package @plumier/core





## [1.0.3](https://github.com/plumier/plumier/compare/v1.0.2...v1.0.3) (2021-06-28)


### Bug Fixes

* Custom validator not being executed on relation property due to conflict with converters ([#977](https://github.com/plumier/plumier/issues/977)) ([af94bc7](https://github.com/plumier/plumier/commit/af94bc7d38c999dfd3c1509b34185e3384eed858))
* Fix duplicate entity policy name on route analysis ([#990](https://github.com/plumier/plumier/issues/990)) ([6a18218](https://github.com/plumier/plumier/commit/6a182186de06555adcb4d7864d177ee8a4df9413))
* Fix entity policy analysis messages on missing entity provider ([#964](https://github.com/plumier/plumier/issues/964)) ([5ac4867](https://github.com/plumier/plumier/commit/5ac48676d2c1e0834c86b2c96642b2dd0ad11cac))
* Fix issue when override Open API Tags on first class entity and first class entity relation ([#988](https://github.com/plumier/plumier/issues/988)) ([3aa2337](https://github.com/plumier/plumier/commit/3aa23377209e8678f7d52e53b3b2196f8d719c2d))
* Unable to cleanly disable authorization (writeonly and readonly) on property ([#976](https://github.com/plumier/plumier/issues/976)) ([bcd544b](https://github.com/plumier/plumier/commit/bcd544b68e2c6a6a9f5c9e33a54f8098b4b06d65))





## [1.0.2](https://github.com/plumier/plumier/compare/v1.0.0...v1.0.2) (2021-06-06)


### Bug Fixes

* Fix array relation should not accessible (read/write) on first class entity ([#956](https://github.com/plumier/plumier/issues/956)) ([58058a5](https://github.com/plumier/plumier/commit/58058a54861447d04cedfd585d60687eb3d4e1d4))
* Fix authorization evaluation issue on undefined value should be skipped ([#945](https://github.com/plumier/plumier/issues/945)) ([7e9acd3](https://github.com/plumier/plumier/commit/7e9acd330032f7f829ef738668768daf4c379566))
* Fix response authorization error when no ID provided on response ([#948](https://github.com/plumier/plumier/issues/948)) ([2b5429e](https://github.com/plumier/plumier/commit/2b5429ef30f9cfb3843fb07c5af271dd3223b14c))
* Fix Swagger urls not visible on route analysis ([#935](https://github.com/plumier/plumier/issues/935)) ([e858197](https://github.com/plumier/plumier/commit/e8581971087ddde0d3642aaa930ac36eafc9bc26))
* Give proper error message when action return type array, but got non array ([#934](https://github.com/plumier/plumier/issues/934)) ([05cd377](https://github.com/plumier/plumier/commit/05cd377823e789e1c18c3902cad69798f196549e))
* Give proper error message when found cross reference entity issue ([#933](https://github.com/plumier/plumier/issues/933)) ([0d09d22](https://github.com/plumier/plumier/commit/0d09d22589b751f54c0c4bd03de9f0581334b2ff))
* Unable to apply write authorization on relation property ([#941](https://github.com/plumier/plumier/issues/941)) ([39ff2b6](https://github.com/plumier/plumier/commit/39ff2b638d9cc5895b1368ef5e419e28c142b359))





## 1.0.1 (2021-05-18)

**Note:** Version bump only for package @plumier/core
