# Plumier
Delightful Node.js Rest Framework

[![Build Status](https://travis-ci.org/plumier/plumier.svg?branch=master)](https://travis-ci.org/plumier/plumier)
[![Build status](https://ci.appveyor.com/api/projects/status/6carp7h4q50v4pj6?svg=true)](https://ci.appveyor.com/project/ktutnik/plumier-isghw)
[![Coverage Status](https://coveralls.io/repos/github/plumier/plumier/badge.svg?branch=master)](https://coveralls.io/github/plumier/plumier?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/plumier/plumier.svg)](https://greenkeeper.io/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

## Blog Posts and Publications

* [Reason, motivation and how Plumier designed](https://medium.com/hackernoon/i-spent-a-year-to-reinvent-a-node-js-framework-b3b0b1602ad5)
* [How to use Plumier with mongoose](https://hackernoon.com/create-secure-restful-api-with-plumier-and-mongoose-3ngz32lu)
* [Advanced usage of Plumier middleware to perform AOP and metaprogramming](https://hackernoon.com/adding-an-auditing-system-into-a-rest-api-4fbb522240ea)


## Documentation
Go to Plumier [documentation](https://plumierjs.com) for complete documentation and tutorial


## Tutorials

* [Basic REST api tutorial using Knex.js](https://plumierjs.com/docs/tutorials/basic-sql/get-started)
  
## Examples 

* [Basic REST API with Knex.js](https://github.com/plumier/tutorial-todo-sql-backend)
* [Basic REST api with Mongoose](https://github.com/plumier/tutorial-todo-mongodb-backend)
* [Plumier - React - Monorepo - Social Login](https://github.com/plumier/tutorial-monorepo-social-login)
* [Plumier - Vue.js - Monorepo - Social Login](https://github.com/plumier/tutorial-social-login-vue)
* [Plumier - React Native - Monorepo](https://github.com/plumier/tutorial-todo-monorepo-react-native)

## Motivation

My subjective opinion about TypeScript frameworks nowadays is most of them are too advanced, even to start a very simple API you need to prepare yourself with some advanced knowledge of Separation of Concern, Dependency Injection, SOLID principle and many other design pattern and best practices comes from Object Oriented world. 

Most of those frameworks take advantage of OO fanciness, where framework provided a mandatory rule on how you should separate your logic and layout your source code to keep it clean and SOLID.

In the other hands frameworks doesn't put robustness and secureness as priority because with its fancy separation you can create your own implementation of type conversion, validator or authorization on top of an existing library such as Joi and Passport. 

### What About Express?
I am a big fans of Express, I spent years developing API using Express. Good parts about Express is its simplicity, its easy to master Express only by reading the documentation or by spending a 10 minutes tutorial. Because its only consist of Routing and middleware. 

Bad things about Express is its getting harder when you get into the detail. By default express doesn't have a built-in type conversion validator and authorization functionalities. Thus you need to combine some npm packages to do the detail things. You need to configure schema for joi validation and mongoose, setting this and that for authorization, at the end your code is so far from simple. 

## Enter Plumier
Welcome to Plumier where robustness and secureness is mandatory and fanciness is optional. Unlike most TypeScript framework Plumier focus on development happiness and productivity while keep simplest implementation robust and secure. 

The main goal is to make your development time fast and delightful by providing built-in functionalities such as automatic data type conversion, comprehensive list (40+ types) of validator, authorization to programmatically restrict access to some endpoints and more cool features such as: 

* [Parameter binding](https://plumierjs.com/docs/refs/parameter-binding)
* [Route generation](https://plumierjs.com/docs/refs/route)
* [Static route generation analysis](https://plumierjs.com/docs/refs/static-analysis)
* [Meta programming on middleware basis](https://medium.com/hackernoon/adding-an-auditing-system-into-a-rest-api-4fbb522240ea)
* API versioning based on reflection

All above features created with dedicated reflection library to possibly perform rich meta programming on top of TypeScript language to make everything feel more automatic with less configurations.

Furthermore Plumier doesn't force you to follow some design pattern or best practice. Plumier application is highly configurable that make you able to layout your source code freely. 

### Robust and Secure
Plumier provided some built-in functionalities that work in the background to make the most trivial implementation keep secure and robust. 

```typescript 
class AnimalsController {
    @route.get()
    list(offset:number, @val.range({ min: 1 }) limit:number) {
        //implementation
    }
}
```

Above controller generate single endpoints `GET /animals/list?offset=0&list=10`. Plumier uses a dedicated type introspection (reflection) library to make it able to extract TypeScript type annotation than translate it into metadata and provide functionalities that working on the background. 
1. It automatically bound `offset` and `limit` parameter with request query by name, no further configuration needed. 
2. It automatically convert the request query `offset` and `limit` value into appropriate parameter data type. This function prevent bad user submitting bad value causing conversion error or even sql injection.
3. It automatically validate the `limit` parameter and make sure if the provided value is a positive number.
4. It taking care of query case insensitivity, `GET /animals/list?OFFSET=0&LIMIT=10` will keep working. Note that query is case sensitive in most frameworks.

Plumier has [comprehensive list](refs/validation#decorators) of decorator based validators, it easily can be applied on method parameters or domain model properties. 

```typescript
@domain()
class User {
    constructor(
        @val.length({ min: 5, max: 128 })
        public name: string,
        @val.email()
        public email: string,
        @val.before()
        public dateOfBirth: Date,
        public active: boolean
    ) { }
}
```

Furthermore Plumier provided built-in decorator based authorization to easily restrict access to your API endpoints.

```typescript 
class UsersController {

    // GET /users?offset&limit
    // only accessible by Admin
    @authorize.role("Admin")
    @route.get("")
    list(offset:number, limit:number) { }

    // POST /users 
    // accessible by public
    @authorize.public()
    @route.post("")
    save(data:User){}
}
```

Above code showing that some authorization decorator applied to the method to restrict access to each endpoint handled by controller's method.

### Useful Reflection Based Helpers

Another benefit of using reflection library is Plumier able to provided an official [Mongoose](https://mongoosejs.com/) helper to automatically generate mongoose schema from domain model. 

```typescript
import { collection, model } from "@plumier/mongoose"

// mark domain model as collection
@collection()
class User {
    constructor(
        public name:string,
        public email:string,
        public dateOfBirth:Date,
        public role: "Admin" | "User",
        public active:boolean
    ){}
}

// model() function automatically generate Mongoose schema 
// based on User properties 
const UserModel = model(User)
```

Read more information about Mongoose helper [here](refs/mongoose-helper). 

### Reduce Duplication
There is a best practice spread among static type programmers: **Never use your domain model as DTO**. Literally its a good advice because in a common framework using domain model as DTO can lead to some security issue, but this will ends up in another issue: bloated code and duplication. 

Plumier provided an advanced authorization functionalities which enables you to restrict write some property of request body by providing `@authorize` decorator on the domain model.

```typescript
import { authorize } from "plumier"
import { collection } from "@plumier/mongoose"

@collection()
class User {
    constructor(
        public name:string,
        public email:string,
        public dateOfBirth:Date,
        //restrict access only to Admin
        @authorize.role("Admin") 
        public role: "Admin" | "User",
        public active:boolean
    ){}
}
```

Using above code, only user with `Admin` role will be able to set the `role` property. Using this functionalities will cut a lot of bloated DTO classes and duplication, and make the security aspect of the application easily reviewed.

### Lightweight

Above all, with all those features above, Plumier is a lightweight framework.

```
GET method benchmark starting...

Server       Base         Method         Req/s  Cost (%)
koa                       GET         32566.55      0.00
plumier      koa          GET         31966.55      1.84
express                   GET         19047.60      0.00
nest         express      GET         16972.91     10.89
loopback     express      GET          3719.80     80.47

POST method benchmark starting...

Server       Base         Method         Req/s  Cost (%)
koa                       POST        12651.46      0.00
plumier      koa          POST        11175.10     11.67
express                   POST         9521.28      0.00
nest         express      POST         5251.00     44.85
loopback     express      POST         2294.00     75.91
```

Above is a full stack benchmark (routing, body parser, validator, type conversion) result of Plumier and other TypeScript framework. Showing that using Plumier is as fast as using Koa. The benchmark source code can be found [here](https://github.com/ktutnik/full-stack-benchmarks).

Creating lightweight framework is not easy, from result above Plumier only 1.84% slower than Koa (its base framework) in the other hand Nest 10.89% and Loopback 4 is 80% slower than their base framework.

## Requirements
* TypeScript
* NodeJS >= 10.0.0
* Visual Studio Code

## Contributing
To run Plumier project on local machine, some setup/app required

### App requirements
* Visual Studio Code (Recommended)
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
* On start/debug configuration select `Jest Current File` and start debugging
* Process will halt properly on the `.ts` file.
