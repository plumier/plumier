# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.6](https://github.com/plumier/plumier/compare/v1.0.5...v1.0.6) (2021-10-04)


### Bug Fixes

* **core:** Fix http status error response for 403 Forbidden and 401 Unauthorized ([#1014](https://github.com/plumier/plumier/issues/1014)) ([b235819](https://github.com/plumier/plumier/commit/b2358195477eaafb0654e92c8605bc1ecf7a8350))
* **swagger:** Fix missing required property 'description' at #/paths//swagger/get/responses/200 ([#1017](https://github.com/plumier/plumier/issues/1017)) ([dacabee](https://github.com/plumier/plumier/commit/dacabeed10c65329eb768dfbabfff4bbbd36e915))





## [1.0.5](https://github.com/plumier/plumier/compare/v1.0.4...v1.0.5) (2021-07-25)


### Bug Fixes

* **swagger:** Fix array relation property not being visible on swagger response example ([#1011](https://github.com/plumier/plumier/issues/1011)) ([13992cf](https://github.com/plumier/plumier/commit/13992cfe097c925be80caaadb06d770fdcdfccdf))
* **swagger:** Hide grand children relation properties on Swagger response example ([#1012](https://github.com/plumier/plumier/issues/1012)) ([f153bed](https://github.com/plumier/plumier/commit/f153bedd6bb1c960316c2e233f055d8e4eae0502))





## [1.0.4](https://github.com/plumier/plumier/compare/v1.0.3...v1.0.4) (2021-07-05)


### Bug Fixes

* **swagger:** Fixed issue Open API tag applied on custom generic controller creating multiple tags ([#992](https://github.com/plumier/plumier/issues/992)) ([dc54af9](https://github.com/plumier/plumier/commit/dc54af982b53f0a1a6119b3ca34928a73b773eac))
* **swagger:** Add spacing between policy names and expand/collapse icon on Swagger UI ([#1002](https://github.com/plumier/plumier/issues/1002)) ([90e2ab7](https://github.com/plumier/plumier/commit/90e2ab789a4f513efc04cceb6ca86bc0779ae843))
* **swagger:** Fixed multiple Open API tags not being applied correctly on First Class Entity and Nested First Class Entity ([#996](https://github.com/plumier/plumier/issues/996)) ([65d1cfd](https://github.com/plumier/plumier/commit/65d1cfdbb3b46d42c312b7b48ede7a822ca53437))
* **typeorm:** Fix array relation insert issue on nested generic controller ([#999](https://github.com/plumier/plumier/issues/999)) ([9b9354f](https://github.com/plumier/plumier/commit/9b9354fb135dbbfa95604cceca284f73feca16b5))
* **typeorm:** Give proper error message when nested generic controller used on array relation without inverse property ([#1000](https://github.com/plumier/plumier/issues/1000)) ([e4ee57f](https://github.com/plumier/plumier/commit/e4ee57f1cbef9ce61be18a8f54b8c2e9ef26e3b7))





## [1.0.3](https://github.com/plumier/plumier/compare/v1.0.2...v1.0.3) (2021-06-28)


### Bug Fixes

* Cache class parser to speed up class introspection ([#970](https://github.com/plumier/plumier/issues/970)) ([aca5751](https://github.com/plumier/plumier/commit/aca5751382bb81bf264df5fbc7dc27df15943874))
* Custom validator not being executed on relation property due to conflict with converters ([#977](https://github.com/plumier/plumier/issues/977)) ([af94bc7](https://github.com/plumier/plumier/commit/af94bc7d38c999dfd3c1509b34185e3384eed858))
* Fix duplicate entity policy name on route analysis ([#990](https://github.com/plumier/plumier/issues/990)) ([6a18218](https://github.com/plumier/plumier/commit/6a182186de06555adcb4d7864d177ee8a4df9413))
* Fix entity policy analysis messages on missing entity provider ([#964](https://github.com/plumier/plumier/issues/964)) ([5ac4867](https://github.com/plumier/plumier/commit/5ac48676d2c1e0834c86b2c96642b2dd0ad11cac))
* Fix issue when override Open API Tags on first class entity and first class entity relation ([#988](https://github.com/plumier/plumier/issues/988)) ([3aa2337](https://github.com/plumier/plumier/commit/3aa23377209e8678f7d52e53b3b2196f8d719c2d))
* Fix TypeORM helper error on OneToMany relation without inverse property configuration ([#974](https://github.com/plumier/plumier/issues/974)) ([c06c017](https://github.com/plumier/plumier/commit/c06c01756a7c3d54919bf2ceb913d739b1a1841c))
* Open API spec, array relation and inverse relation should be manually set readonly/writeonly ([#983](https://github.com/plumier/plumier/issues/983)) ([7684287](https://github.com/plumier/plumier/commit/7684287798adf24924fb327b82b009f1f7e7713a))
* Proper error message on TypeORM generic controller factory with corss reference entity issue ([#984](https://github.com/plumier/plumier/issues/984)) ([e1d725a](https://github.com/plumier/plumier/commit/e1d725a20031673de8774b6555ef61a5178c44be))
* TypeORM many to many relation property without inverse property doesn't reflected as relation ([#982](https://github.com/plumier/plumier/issues/982)) ([d2de509](https://github.com/plumier/plumier/commit/d2de509dcfccbf52ac2ee35b47a04da099d2a86a))
* Unable to cleanly disable authorization (writeonly and readonly) on property ([#976](https://github.com/plumier/plumier/issues/976)) ([bcd544b](https://github.com/plumier/plumier/commit/bcd544b68e2c6a6a9f5c9e33a54f8098b4b06d65))


### Reverts

* Revert relation property readonly/writeonly on first class entity ([#966](https://github.com/plumier/plumier/issues/966)) ([bac445e](https://github.com/plumier/plumier/commit/bac445e8acee4c72e2c4096f74b6341549d80373))





## [1.0.2](https://github.com/plumier/plumier/compare/v1.0.0...v1.0.2) (2021-06-06)


### Bug Fixes

* Fix array relation should not accessible (read/write) on first class entity ([#956](https://github.com/plumier/plumier/issues/956)) ([58058a5](https://github.com/plumier/plumier/commit/58058a54861447d04cedfd585d60687eb3d4e1d4))
* Fix authorization evaluation issue on undefined value should be skipped ([#945](https://github.com/plumier/plumier/issues/945)) ([7e9acd3](https://github.com/plumier/plumier/commit/7e9acd330032f7f829ef738668768daf4c379566))
* Fix Open API error when generating property without data type ([#920](https://github.com/plumier/plumier/issues/920)) ([ee813e1](https://github.com/plumier/plumier/commit/ee813e16e7a08dedb905c051bb66c31bd849ca9b))
* Fix response authorization error when no ID provided on response ([#948](https://github.com/plumier/plumier/issues/948)) ([2b5429e](https://github.com/plumier/plumier/commit/2b5429ef30f9cfb3843fb07c5af271dd3223b14c))
* Fix Swagger urls not visible on route analysis ([#935](https://github.com/plumier/plumier/issues/935)) ([e858197](https://github.com/plumier/plumier/commit/e8581971087ddde0d3642aaa930ac36eafc9bc26))
* Fix TypeORM helper entity normalization robustness on relation with string data type ([#959](https://github.com/plumier/plumier/issues/959)) ([fb4a744](https://github.com/plumier/plumier/commit/fb4a74482849071075ff3455a612022b7c9c88a3))
* Fix TypeORM helper one to many and many to many should be readonly and writeonly ([#953](https://github.com/plumier/plumier/issues/953)) ([b66ea12](https://github.com/plumier/plumier/commit/b66ea12dccb85cd9e4e681a5860092f9dad71082))
* Fix typos on select parser authorization message ([#957](https://github.com/plumier/plumier/issues/957)) ([d267166](https://github.com/plumier/plumier/commit/d26716603027408d1e98189c931ce8f81e951902))
* Give proper error message when action return type array, but got non array ([#934](https://github.com/plumier/plumier/issues/934)) ([05cd377](https://github.com/plumier/plumier/commit/05cd377823e789e1c18c3902cad69798f196549e))
* Give proper error message when found cross reference entity issue ([#933](https://github.com/plumier/plumier/issues/933)) ([0d09d22](https://github.com/plumier/plumier/commit/0d09d22589b751f54c0c4bd03de9f0581334b2ff))
* Multiple Open API security scheme doesn't applied on path/operation ([#932](https://github.com/plumier/plumier/issues/932)) ([6682015](https://github.com/plumier/plumier/commit/6682015428c133b883bd87cb0ed18bd7027531d6))
* Unable to apply write authorization on relation property ([#941](https://github.com/plumier/plumier/issues/941)) ([39ff2b6](https://github.com/plumier/plumier/commit/39ff2b638d9cc5895b1368ef5e419e28c142b359))
