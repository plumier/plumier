# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.0.6](https://github.com/plumier/plumier/compare/v1.0.5...v1.0.6) (2021-10-04)

**Note:** Version bump only for package @plumier/typeorm





## [1.0.5](https://github.com/plumier/plumier/compare/v1.0.4...v1.0.5) (2021-07-25)

**Note:** Version bump only for package @plumier/typeorm





## [1.0.4](https://github.com/plumier/plumier/compare/v1.0.3...v1.0.4) (2021-07-05)


### Bug Fixes

* **typeorm:** Fix array relation insert issue on nested generic controller ([#999](https://github.com/plumier/plumier/issues/999)) ([9b9354f](https://github.com/plumier/plumier/commit/9b9354fb135dbbfa95604cceca284f73feca16b5))
* **typeorm:** Give proper error message when nested generic controller used on array relation without inverse property ([#1000](https://github.com/plumier/plumier/issues/1000)) ([e4ee57f](https://github.com/plumier/plumier/commit/e4ee57f1cbef9ce61be18a8f54b8c2e9ef26e3b7))





## [1.0.3](https://github.com/plumier/plumier/compare/v1.0.2...v1.0.3) (2021-06-28)


### Bug Fixes

* Fix TypeORM helper error on OneToMany relation without inverse property configuration ([#974](https://github.com/plumier/plumier/issues/974)) ([c06c017](https://github.com/plumier/plumier/commit/c06c01756a7c3d54919bf2ceb913d739b1a1841c))
* Proper error message on TypeORM generic controller factory with corss reference entity issue ([#984](https://github.com/plumier/plumier/issues/984)) ([e1d725a](https://github.com/plumier/plumier/commit/e1d725a20031673de8774b6555ef61a5178c44be))
* TypeORM many to many relation property without inverse property doesn't reflected as relation ([#982](https://github.com/plumier/plumier/issues/982)) ([d2de509](https://github.com/plumier/plumier/commit/d2de509dcfccbf52ac2ee35b47a04da099d2a86a))


### Reverts

* Revert relation property readonly/writeonly on first class entity ([#966](https://github.com/plumier/plumier/issues/966)) ([bac445e](https://github.com/plumier/plumier/commit/bac445e8acee4c72e2c4096f74b6341549d80373))





## [1.0.2](https://github.com/plumier/plumier/compare/v1.0.0...v1.0.2) (2021-06-06)


### Bug Fixes

* Fix array relation should not accessible (read/write) on first class entity ([#956](https://github.com/plumier/plumier/issues/956)) ([58058a5](https://github.com/plumier/plumier/commit/58058a54861447d04cedfd585d60687eb3d4e1d4))
* Fix response authorization error when no ID provided on response ([#948](https://github.com/plumier/plumier/issues/948)) ([2b5429e](https://github.com/plumier/plumier/commit/2b5429ef30f9cfb3843fb07c5af271dd3223b14c))
* Fix TypeORM helper entity normalization robustness on relation with string data type ([#959](https://github.com/plumier/plumier/issues/959)) ([fb4a744](https://github.com/plumier/plumier/commit/fb4a74482849071075ff3455a612022b7c9c88a3))
* Fix TypeORM helper one to many and many to many should be readonly and writeonly ([#953](https://github.com/plumier/plumier/issues/953)) ([b66ea12](https://github.com/plumier/plumier/commit/b66ea12dccb85cd9e4e681a5860092f9dad71082))





## 1.0.1 (2021-05-18)

**Note:** Version bump only for package @plumier/typeorm
