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

## Tutorials

* [Basic REST api tutorial using Knex.js](https://plumierjs.com/docs/tutorials/basic-sql/get-started)
  

## Examples 

* [Basic REST API with Knex.js](https://github.com/plumier/tutorial-todo-sql-backend)
* [Basic REST api with Mongoose](https://github.com/plumier/tutorial-todo-mongodb-backend)
* [Plumier - React - Monorepo - Social Login](https://github.com/plumier/tutorial-monorepo-social-login)
* [Plumier - React Native - Monorepo](https://github.com/plumier/tutorial-todo-monorepo-react-native)

## Motivation

Plumier primarily created for full stack developer who spend more time working on the UI side and focus on creating a good user experience. Plumier comes with some built-in production-ready features that make creating secure JSON Api fun and easy.

### Lightweight
Plumier relatively has small code base which make it light and fast. It uses Koa as its core http handler which is quite fast, below is comparison result of Koa, Plumier and Express.

```
GET method benchmark starting...

Server       Base         Method         Req/s  Cost (%)
plumier      koa          GET         33624.00     -0.06
koa                       GET         33602.19      0.00
express                   GET         17688.37      0.00
nest         express      GET         16932.91      4.27
loopback     express      GET          5174.61     70.75

POST method benchmark starting...

Server       Base         Method         Req/s  Cost (%)
koa                       POST        12218.37      0.00
plumier      koa          POST        11196.55      8.36
express                   POST         9543.46      0.00
nest         express      POST         6814.64     28.59
loopback     express      POST         3108.91     67.42
```

Version 1.0.0-beta.9 successfully reduce the framework cost, its mean using Plumier is the same as using Koa + Koa Router + Joi stack with all of Plumier features. 

The benchmark script can be found [here](https://github.com/ktutnik/full-stack-benchmarks).

### Flexible
Almost every part of framework is fully configurable and easy to override. For example plumier route generation system provided flexibility using convention and also configuration.

Plumier traverse through the controller directories and generate routes based on directory name, controller name, method name and parameter names. This behavior make you easily separate your controllers based on version etc.

```typescript
// path: controller/api/v1/users-controller.ts
export class UsersController {

    @route.put(":id")
    modify(id:number, data:User){
        //implementation
    }
}
```

Above class generated into

```
PUT /api/v1/users/:id
```

* `api` is a directory
* `v1` is a directory
* `user` is a controller `UsersController`
* `:id` is method parameter, the method name is ignored

Plumier has a flexible decorator based routing configuration, it makes you easily create clean restful api routes and nested restful api with separate controller. 

Check the [route cheat sheet](https://plumierjs.com/docs/refs/route) for detail information

### Testable
Plumier controller is a plain TypeScript class it doesn't need to inherit from any base class, thats make it easily instantiated outside the framework. 

Plumier provided powerful [parameter binding](https://plumierjs.com/docs/refs/parameter-binding) to bound specific value of request object into method's parameter which eliminate usage of Request stub. Controller returned object or promised object or throw `HttpStatusError` and translated into http response which eliminate usage of Response mock.

```typescript
export class AuthController {
    @route.post()
    login(userName:string, password:string){
        const user = await userDb.findByEmail(email)
        if (user && await bcrypt.compare(password, user.password)) {
            return { token: sign({ userId: user.id, role: user.role }, config.jwtSecret) }
        }
        else
            throw new HttpStatusError(403, "Invalid username or password")
    }
}
```

Controller above uses [name binding](https://plumierjs.com/docs/refs/parameter-binding#name-binding), `userName` and `password` parameter will automatically bound with request body `{ "userName": "abcd", "password": "12345" }` or url encoded form `userName=abcd&password=12345`.

Testing above controller is as simple as testing plain object:

```typescript
it("Should return signed token if login successfully", async () => {
    const controller = new AuthController()
    const result = await controller.login("abcd", "12345")
    expect(result).toBe(<signed token>)
})

it("Should reject if provided invalid username or password", async () => {
    const controller = new AuthController()
    expect(controller.login("abcd", "1234578"))
        .rejects.toEqual(new HttpStatusError(403, "Invalid username or password"))
})
```

### Secure
Plumier provided built-in [type converter](https://plumierjs.com/docs/refs/converters), [validator](https://plumierjs.com/docs/refs/validation), [token based authentication](https://plumierjs.com/docs/refs/authorization), [declarative authorization](https://plumierjs.com/docs/refs/authorization#role-authorization) and [parameter authorization](https://plumierjs.com/docs/refs/authorization#parameter-authorization) which make creating secure JSON API trivial.

```typescript
@domain()
export class User  {
    constructor(
        @val.email()
        public email: string,
        public displayName: string,
        public birthDate: Date,
        @authorize.role("Admin")
        public role: "Admin" | "User"
    ) { }
}
```

Above is `User` domain that will be used as controller parameter type.  Its a plain TypeScript class using [parameter properties](https://www.typescriptlang.org/docs/handbook/classes.html#parameter-properties) decorated with some validation and parameter authorization. 

Plumier aware of TypeScript type annotation and will make sure user provided the correct data type, `@val.email()` will validate the email, `@authorize.role("Admin")` will make sure only Admin can set the role field.

```typescript
export class UsersController {
    private readonly repo = new Repository<User>("User")

    @authorize.role("Admin")
    @route.get("")
    all(offset: number, @val.optional() limit: number = 50) {
        return this.repo.find(offset, limit)
    }

    @authorize.public()
    @route.post("")
    save(data: User) {
        return this.repo.add(data)
    }
}
```

Above controller will generate routes below

```
POST /users
GET  /users?offset=0&limit=<optional>
```

Even if above controller implementation look so naive and vulnerable, but Plumier already done some security check before user input touching database. Get users route only accessible by Admin other user try accessing it will got 401 or 403 status. Save user is public so everyone can register to the service. 

Plumier done some data conversion and security check, example below is list of user input and their appropriate status returned.

| User Input                                                                                                                    | Description                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `{ "email": "john.doe@gmail.com", "displayName": "John Doe", "birthDate": "1988-1-1" }`                                       | Valid, `birthDate` converted to `Date`           |
| `{ "birthDate": "1988-1-1" }`                                                                                                 | Invalid, `email` and `displayName` is required   |
| `{ "email": "abc", "displayName": "John Doe", "birthDate": "1988-1-1" }`                                                      | Invalid email                                    |
| `{ "email": "john.doe@gmail.com", "displayName": "John Doe", "birthDate": "abc" }`                                            | Invalid `birthDate`                              |
| `{ "email": "john.doe@gmail.com", "displayName": "John Doe", "birthDate": "1988-1-1", "hack": "lorem ipsum dolor sit amet" }` | Valid, `hack` field removed                      |
| `{ "email": "john.doe@gmail.com", "displayName": "John Doe", "birthDate": "1988-1-1", "role" : "Admin" }`                     | Setting `role` only valid if login user is Admin |

### Friendly
Plumier enhanced with static route analysis which will print friendly message if you misconfigure controller or forgot some decorator.

![static analysis](https://plumierjs.com/docs/assets/static-analysis.png)

## Documentation
Go to Plumier [documentation](https://plumierjs.com) for complete documentation and tutorial

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
* On start/debug configuration select `Jest Current File` and start debugging
* Process will halt properly on the `.ts` file.
