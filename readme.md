# Plumier
Delightful NodeJS Web Api Framework powered by KoaJs and TypeScript

[![Build Status](https://travis-ci.org/ktutnik/plumier.svg?branch=master)](https://travis-ci.org/ktutnik/plumier)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/plumier/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/plumier?branch=master) 
[![Greenkeeper badge](https://badges.greenkeeper.io/ktutnik/plumier.svg)](https://greenkeeper.io/)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/6d61987244f1471abe915292cb3add1b)](https://www.codacy.com/app/ktutnik/plumier?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ktutnik/plumier&amp;utm_campaign=Badge_Grade)

## Motivation
- Provided built in function such as authorization, validation, parameter binding, data sanitation.
- Help developer reveal confusing bugs caused by miss configuration by providing static analysis
- Highly testable controller free from framework dependency and totally POTO (plain old TypeScript object). 
- Wrap production-ready library for stability ([Koa](https://github.com/koajs/koa), [Validatorjs](https://github.com/chriso/validator.js), [Mongoose](http://mongoosejs.com/))
- Compact and light weight with small size codebase
- Uses TypeScript, provided great features such as decorators, design type information and IDE support for refactoring, auto complete etc.

## API

Plumier consist of 3 main parts. Domain model, controller and entry point

### Domain Model 

Your domain model contains data type and validation rule. Plumier will make sure the data submitted by API consumer match your rule by sanitized the excess field, convert to appropriate data type, and validate the field match your configuration.

```typescript
@collection()
export class User {
    constructor(
        //should be maximum 64 characters
        @val.length({ max: 64 })
        public name: string,
        //should be a valid url
        @val.url()
        public image: string,
        //should be a valid email address
        @val.email()
        //automatically check to mongodb for uniqueness
        @val.unique()
        public email:string,
        public address:string,
        public city:string,
        public zip:string
    ) { }
}
//mongoose model, schema automatically generated
export const UserModel = model(User)
```

### Controller 

Controller is where your logic stays, your focus is how the data will be saved to database, you don't need to worry about validation and conversion. Further more you can apply role authorization to your API using decorator to restrict access to some routes

```typescript
//only admin can access all containing routes under /users
//except overridden see get(id) method
@authorize.role("admin")
export class UsersController {

    //POST /users
    @route.post("")
    save(data: User) {
        return new UserModel(data).save()
    }

    //PUT /users/<id>
    @route.put(":id")
    async modify(id:string, @partial(User) data:Partial<User>){
        const user = User.findById(id)
        if(!user) throw new HttpStatusError(404, "User not found")
        Object.assign(user, data)
        await user.save()
    }

    //GET /pets/<id>
    @route.get(":id")
    //authorize user and admin to access GET /pets/<id>
    @authorize.role("user", "admin")
    get(id: string) {
        return User.findById(id)
    }
}
```

### Entry Point

Plug what functionality you need, remove them if you don't need it, develop a custom one is easy!

```typescript
new Plumier()
   //plug restful predefined configuration
   .set(new RestfulApiFacility())
   //plug mongoose predefined configuration (optional)
   //this facility required for auto generated mongoose schema
   //and @val.unique() validator
   .set(new MongooseFacility({uri: "mongodb://localhost:27017/test-data"}))
   //plug jwt authorization to enable role authorization
   .set(new JwtAuthFacility({ secret: "<very secret>" }))
   .initialize()
   //start the app by listening to port 8000
   .then(x => x.listen(8000))
   .catch(e => console.error(e))
```

## Features

* [Decorator based route](.docs/route-generation-cheat-sheet.md): Decorator usage is minimal and flexible, can perform difficult configuration nicely such as nested restful resources.
* [Parameter binding](.docs/parameter-binding.md): Transform and sanitize request data (body, query) match with action's parameter type.
* [Decorator based validation](.docs/validation.md): Comprehensive list of validation powered by [ValidatorJS](https://github.com/chriso/validator.js)
* [Decorator based authorization](.doc/authorization.md): Restrict access to controllers/actions based on user role using decorator.
* [Static controller analysis](.docs/static-analysis-troubleshoot.md): Provided detection for misconfigured controller, missing data type that cause difficult to trace bugs.
* [Testing friendly](.docs/testing-tips.md): Controller free from framework dependency, controller's action follow the concept of pure function (take thing, return thing, don't mutate thing) make them easy to test with minimum usage of mock & stub. Use [supertest]() only for integration testing. Perform TDD/BDD easily

## Requirements
* TypeScript
* NodeJS >= 8.0.0
* Visual Studio Code

## Getting Started

Go to [getting started](.docs/getting-started.md) to start codding