# Plumier
Delightful NodeJS Web Api Framework powered by KoaJs and TypeScript

[![Build Status](https://travis-ci.org/ktutnik/plumier.svg?branch=master)](https://travis-ci.org/ktutnik/plumier)
[![Build status](https://ci.appveyor.com/api/projects/status/d2q9tk0awjqkhbc2?svg=true)](https://ci.appveyor.com/project/ktutnik/plumier)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/plumier/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/plumier?branch=master) 
[![Greenkeeper badge](https://badges.greenkeeper.io/ktutnik/plumier.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6d61987244f1471abe915292cb3add1b)](https://www.codacy.com/app/ktutnik/plumier?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ktutnik/plumier&amp;utm_campaign=Badge_Grade)

## Motivation
Plumier primarily created for full stack developer who spend more time working on the UI side and focus on creating a good user experience. Plumier comes with some built-in production-ready features that make creating secure JSON Api fun and easy.

### Lightweight
Plumier relatively has small code base which make it light and fast. It uses Koa as its core http handler which is quite fast, below is comparison result of Koa, Plumier and Express.

![Benchmarks](benchmarks.png)

The benchmark project forked from Fastify benchmark project, you can test it your self [here](https://github.com/ktutnik/benchmarks).

### Flexible Route
Plumier traverse through the controller directories and generate routes based on directory name, controller name, method name and parameter names. This behavior make you easily separate your controllers based on version etc.

```
/api/v1/users/:id
```

* `api` is a directory
* `v1` is a directory
* `user` is a class (controller) named `UsersController`
* `:id` is method parameter, the method name is ignored

Plumier has a flexible routing configuration using decorator, it makes you easily create clean restful api routes and nested restful api with separate controller. 

Check the [route cheat sheet](https://github.com/plumier/plumier/wiki/route-generation-cheat-sheet) for detail information

### Parameter Binding


### Type Converter and Validation

### Authorization

### Parameter Authorization

## Requirements
* TypeScript
* NodeJS >= 8.0.0
* Visual Studio Code

## Contributing
To run Plumier project on local machine, some setup/app required

### App requirements
* Visual Studio Code (Recommended)
* Nodejs 8+
* Yarn `npm install -g yarn`

### Local Setup
* Fork and clone the project
* Install dependencies by `yarn install`
* Run test by `yarn test`

### Debugging
Plumier already provided vscode `task` and `launch` setting. To start debugging a test scenario:
* Build the project 
* Locate the test file and narrow the test runs by using `.only`
* Put breakpoint on any location you need on `.ts` file 
* Locate the `.js` version of the test file that will be run **(important)**
* On start/debug configuration select `Jest Current File` and start debugging
* Process will halt properly on the `.ts` file.