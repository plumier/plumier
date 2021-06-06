# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
