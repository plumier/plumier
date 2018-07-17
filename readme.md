# Plumier
Pleasant TypeScript Web Api Framework

[![Build Status](https://travis-ci.org/ktutnik/plumier.svg?branch=master)](https://travis-ci.org/ktutnik/plumier)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/plumier/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/plumier?branch=master) 
[![Greenkeeper badge](https://badges.greenkeeper.io/ktutnik/plumier.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6d61987244f1471abe915292cb3add1b)](https://www.codacy.com/app/ktutnik/plumier?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ktutnik/plumier&amp;utm_campaign=Badge_Grade)

## Motivation
Developing a good web api require extra work for some important task such as security, data sanitation, validation, logging, auditing etc etc, which make code look messy. 

- Provided clean code with flexible code separation
- Provided built in function such as comprehensive validation, parameter binding, data sanitation.
- Help developer reveal confusing bugs caused by miss configuration by providing static analysis
- Highly testable, Action is pure function and controller is totally POTO (plain old TypeScript object)
- Wrap production-ready library for stability (koa, validatorjs, mongoose)
- Compact and light weight with small size codebase
- Uses TypeScript, provided good tooling support for IDE

## Features

* [Parameter binding](.docs/parameter-binding.md)
* [Decorator based validation](.docs/validation.md)
* [Static controller analysis](.docs/static-analysis-troubleshoot.md)
* [Testing friendly](.docs/testing-tips.md)
* [Decorator based route](.docs/route-generation-cheat-sheet.md)

## Requirements
* TypeScript
* NodeJS >= 8.0.0

## Getting Started

We will creating a complete restful api bare handedly (without any generator). Create some files like below:

```
+ src
    + controller
        pet-controller.ts
    + model
        pet-model.ts
    index.ts
package.json
tsconfig.json
```

Copy paste file content below to appropriate file

```json
//file: package.json
{
  "name": "my_first_web_api",
  "version": "0.0.0",
  "main": "index.js",
  "scripts": {
    "start": "DEBUG=plum:* node index"
  },
  "dependencies": {
    "@plumjs/plumier": "^0.1.0",
  }
}
```

```json
//file: tsconfig.json
{
  "compilerOptions": {
    //required
    "target": "es2017",
    "module": "commonjs",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    //optional
    "strict": true,
    "importHelpers": true,
    "esModuleInterop": true,
  }
}
```

```typescript
//file: ./src/model/pet-model.ts

import { model, val } from "@plumjs/plumier"

@model()
class PetModel{
    constructor(
        @val.required()
        @val.alpha()
        public name:string,
        public deceased:boolean
        @val.after()
        public birthday:Date
    )
}
```

```typescript
//file: ./src/controller/pet-controller.ts

import { route, val } from "@plumjs/plumier"
import { mongoose } from "@plumjs/mongoose"


//controller
export class PetController {
    @route.get(":id")
    get(@val.required() @val.mongoId id:string){
        const PetOdm = mongoose(PetModel)
        return PetOdm.findById(id)
    }

    @route.post("")
    save(model:PetModel){
        const PetOdm = mongoose(PetModel)
        await new PetOdm().save()
    }

    @route.put(":id")
    modify(@val.required() @val.mongoId id:string, model:PetModel){
        const PetOdm = mongoose(PetModel)
        const odm = PetOdm.findById()
        Object.assign(odm, model)
        await odm.save()
    }

    @route.get(":id")
    delete(@val.required() @val.mongoId id:string){
        const PetOdm = mongoose(PetModel)
        await PetOdm.deleteById(id)
    }
}

```

```typescript
//file: ./src/index.ts

import { Plumier, RestfulApiFacility } from "@plumjs/plumier"
import { MongooseFacility } from "@plumjs/mongoose"
import { join } from "path"

//entry point
new Plumier()
    .set({ rootPath: __dirname })
    .set(new RestfulApiFacility())
    .set(new MongooseFacility())
    .initialize()
    .then(x => x.listen(8000))
    .catch(x => console.error(e))
```

Thats it, whit above you will got:

### Restful style route
Plumier will generate controller into restful style routes

| Controller        | Http Method | Route    |
| ----------------- | ----------- | -------- |
| get(id)           | GET         | /pet/:id |
| save(model)       | POST        | /pet     |
| modify(id, model) | PUT         | /pet/:id |
| delete(id)        | DELETE      | /pet     |


### Restful style status code
By using `RestfulApiFacility` all the http status code returned will follow restful style status code:

| Method/Issue     | Status |
| ---------------- | ------ |
| GET              | 200    |
| POST             | 201    |
| PUT              | 204    |
| DELETE           | 204    |
| Validation Error | 400    |
| Conversion Error | 400    |
| Internal Error   | 500    |

### Validation
By using `@val.required()` and `@val.mongoid()` decorator on the `id` parameter, All validation will handled by Plumier if end user provided invalid value such as invalid mongodb id it will returned http status 400 with some informative error message. For example if end user issued an invalid mongodb id like request below:

```
$ curl -v http://localhost:8000/pet/3000
```

The application will returned

```
< HTTP/1.1 400 Bad Request
< Vary: Origin
< Content-Type: application/json; charset=utf-8
< Content-Length: 51
< Connection: keep-alive
< 
* Connection #0 to host localhost left intact
[{"messages":["Invalid MongoDb id"],"path":["id"]}]
```


### Data type conversion and simple sanitation
All data provided by end user will be converted to appropriate parameter data type.
Example, end user can provide a JSON body like below

```json
{
    "name": "Kitty Minnie",
    "deceased": "NO",
    "birthday": "2018-1-3",
    "excessField": "hey yo this string will make your database full"
}
```

Above JSON body will be transformed to `PetModel` object 

```typescript
{
    name: "Kitty Minnie",
    deceased: false,
    birthday: new Date("2018-1-3")
}
```

`deceased` and `birthday` field converted into appropriate model's type, and `excessField` will be excluded because no backing property named `excessField` in `PetModel`


### Automatic mongoose model mapping
`MongooseFacility` will read through your `./model` directory and find all classes marked with `@model()` decorator and automatically generate mongoose schema for you.