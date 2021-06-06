# Plumier
Delightful Node.js Rest Framework

[![Build Status](https://github.com/plumier/plumier/workflows/ubuntu/badge.svg)](https://github.com/plumier/plumier/actions?query=workflow%3Aubuntu)
[![Build status](https://github.com/plumier/plumier/workflows/windows/badge.svg)](https://github.com/plumier/plumier/actions?query=workflow%3Awindows)
[![Coverage Status](https://coveralls.io/repos/github/plumier/plumier/badge.svg?branch=master)](https://coveralls.io/github/plumier/plumier?branch=master)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
[![npm](https://img.shields.io/npm/v/plumier/latest)](https://www.npmjs.com/package/plumier?activeTab=versions)

## Documentation 
Read the project documentation on https://plumierjs.com

## Contributing
To run Plumier project on local machine, some setup/app required

### App requirements
* Visual Studio Code (Recommended)
* Yarn (required)

### Local Setup
* Fork and clone the project `git clone` 
* Install dependencies by `yarn install`
* Run test by `yarn test`

### Debugging
Plumier already provided vscode `task` and `launch` setting. To start debugging a test scenario:
* Locate the test file and narrow the test runs by using `.only`
* Put breakpoint on any location you need on `.ts` file 
* On start/debug configuration select `Jest Current File` and start debugging
