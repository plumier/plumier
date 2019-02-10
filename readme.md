# Plumier
Delightful NodeJS Web Api Framework powered by KoaJs and TypeScript

[![Build Status](https://travis-ci.org/ktutnik/plumier.svg?branch=master)](https://travis-ci.org/ktutnik/plumier)
[![Build status](https://ci.appveyor.com/api/projects/status/d2q9tk0awjqkhbc2?svg=true)](https://ci.appveyor.com/project/ktutnik/plumier)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/plumier/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/plumier?branch=master) 
[![Greenkeeper badge](https://badges.greenkeeper.io/ktutnik/plumier.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6d61987244f1471abe915292cb3add1b)](https://www.codacy.com/app/ktutnik/plumier?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ktutnik/plumier&amp;utm_campaign=Badge_Grade)

## Motivation
I spent my ten years back as a full stack programmer. My 5 first years my primary language was c# and asp.net, the time was full of happiness where I use one language and one editor for everything.

## Benchmark


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


