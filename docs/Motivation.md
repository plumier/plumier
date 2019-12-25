---
id: motivation
title: Motivation
---

My subjective opinion about TypeScript frameworks nowadays is most of them are too advanced, even to start a very simple API you need to prepare yourself with some advanced knowledge of Separation of Concern, Dependency Injection, SOLID principle and many other design pattern and best practices comes from Object Oriented world. 

Most of those frameworks take advantage of OO fanciness, where framework provided a mandatory rule on how you should separate your logic and layout your source code to keep it clean and SOLID.

In the other hands frameworks doesn't put robustness and secureness as priority because with its fancy separation you can create your own implementation of type conversion, validator or authorization on top of an existing library such as Joi and Passport. 

## What About Express?
I am a big fans of Express, I spent years developing API using Express. Good parts about Express is its simplicity, its easy to master Express only by reading the documentation or by spending a 10 minutes tutorial. Because its only consist of Routing and middleware. 

Bad things about Express is its getting harder when you get into the detail. By default express doesn't have a built-in type conversion validator and authorization functionalities. Thus you need to combine some npm packages, configure schema for joi validation and mongoose, setting this and that for authorization, at the end your code is so far from simple. 

## Enter Plumier
Welcome to Plumier where robustness and secureness is mandatory and fanciness is optional. Unlike most TypeScript framework Plumier focus on how to make your development delightful and fast while keep simplest implementation robust and secure. Plumier doesn't force you to follow some design pattern or best practice. Plumier application is highly configurable make you able to layout your source code freely. 

## Robust and Secure
Plumier provided some built-in functionalities that work in the background to make below trivial Plumier controller keep secure and robust. 

```typescript 
class AnimalsController {
    @route.get()
    list(offset:number, limit:number) {
        //implementation
    }
}
```

Above controller generate single endpoints `GET /animals/list?offset=0&list=10`. Plumier uses a dedicated type introspection (reflection) library to make it able to extract TypeScript type annotation than translate those information into metadata and provide functionalities that working on the background. 
1. It automatically bound `offset` and `limit` parameter with request query by name, no further configuration needed. 
2. It automatically convert the `offset` and `limit` value into number match with its data type. This function prevent bad user submitting bad value causing conversion error or even sql injection.
3. It taking care of query case insensitivity, `GET /animals/list?OFFSET=0&LIMIT=10` will keep working. Note that query is case sensitive in most frameworks.

Furthermore Plumier provided built-in decorator based [authorization](refs/authorization) and [parameter authorization](refs/authorization#parameter-authorization) to easily restrict access to your API endpoints.

## Lightweight

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

## Standard Packages
Plumier provided some default packages

| package                 | Description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `plumier`               | Default package to create standard Rest API                                                    |
| `@plumier/jwt`          | Security package for authorization using JWT                                                   |
| `@plumier/mongoose`     | MongoDB package contains mongoose helper to automatically generate schema from domain model |
| `@plumier/multipart`    | File upload package (optional). `plumier` package already supported multipart form             |
| `@plumier/serve-static` | Serve static files                                                                             |
| `@plumier/social-login` | OAuth2 login package supported some social media login                                         |

## Tutorial
* [Basic REST api using Knex.js](https://plumierjs.com/docs/tutorials/basic-sql/get-started)

## Examples
* [Basic REST API with Knex.js](https://github.com/plumier/tutorial-todo-sql-backend)
* [Basic REST api with Mongoose](https://github.com/plumier/tutorial-todo-mongodb-backend)
* [Plumier - React - Monorepo - Social Login](https://github.com/plumier/tutorial-monorepo-social-login)
* [Plumier - React Native - Monorepo](https://github.com/plumier/tutorial-todo-monorepo-react-native)