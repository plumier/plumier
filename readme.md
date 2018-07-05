# Plumier
Node JS web api framework that facilitates testing

[![Build Status](https://travis-ci.org/ktutnik/plumier.svg?branch=master)](https://travis-ci.org/ktutnik/plumier)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/plumier/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/plumier?branch=master)

## Features

* Unopinionated MVC framework
* Action as pure function
* Parameter binding
* 

## Requirements
* TypeScript
* NodeJS >= 8.0.0

## Getting Started

### Start a NodeJS TypeScript project

```ssh
$ npm init --yes
$ npm install -g typescript
$ tsc --init
```

Above code wil generate 2 files `package.json` and `tsconfig.json`

Copy paste code below into your `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  }
}
```

### Create index.ts

```typescript
import { route, Plumier, RestfulApiFacility } from "plumier"

export class AnimalModel {
    constructor(
        public id:number,
        public name:string
    ){}
}

export class AnimalController {
    @route.put(":id")
    modify(id: number, model: AnimalModel) {
    }
}

export const app = new Plumier()
    .set(new RestfulApiFacility())
    //set controller location to this file
    //by default Plumier will looking to ./controller directory
    .set({ controller: __filename })
```

### create test.ts

```typescript
import {AnimalController} from "./index"

it("Should modify animal model properly", () => {

})

```