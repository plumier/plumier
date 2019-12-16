---
id: motivation
title: Motivation
---


If you're Node.js developer you'd be very familiar with [Express](https://expressjs.com/) for its simple and beautiful API. 

Another great Node.js framework that you'd never miss is [Nest](https://nestjs.com/). Nest is great framework that includes  enterprise best practice into the framework with its selling words such as Dependency Injection, Interceptors, Guards, Pipes. Nest designed for a big scale application it provide some best practice on how you layout your code and separate your logic with [SOLID](https://en.wikipedia.org/wiki/SOLID) in mind. 

## Then Why Bother to Create One?
In my opinion both Express and Nest has its own advantages and drawbacks. Express is a simple and easy to learn framework but its too simple to provide functionalities to create a secure and robust API.

Nest is the opposite, its a big and complex framework you won't get the big picture of the framework by reading the documentation in 5 minutes. Nest provided several "extension point" that can be customized for your need. The idea is to make your code clean and follow the SOLID principle, such as use [Pipes](https://docs.nestjs.com/pipes) for data transformation and validation, use [Guards](https://docs.nestjs.com/guards) for authorization etc.

## Enter The Plumier
Plumier exists from above issue, Plumier take the simplicity of Express and adds some batteries to make simplest implementation keep simple, secure, robust and fast. 

Unlike Nest, plumier doesn't put any best practice in it, instead Plumier provided some default functionalities required to create a secure and robust API such as Validation, Authentication, Authorization etc. 

Plumier uses a dedicated [reflection library](https://github.com/plumier/tinspector), by using it, Plumier possible to reduce the usage of decorators and provide some meta programming capability such as [bind parameter by name instead of using decorator](https://plumierjs.com/docs/refs/parameter-binding#name-binding), and perform [advanced auditing using meta programming](https://medium.com/hackernoon/4fbb522240ea).


## Secure & Robust in Its Simplest Case
Like mentioned before Express is a very simple framework, its require more effort to make a secure and robust API. For example to create an API to list Animal data, the API accessible using url below

```
GET /animals?offset=0&limit=20
```

```typescript
app.use("/animals", (req, res) => {
    const limit = req.query.limit || 20
    const offset = req.query.offset 
})
```

Above code extract the `limit` and `offset` parameter directly from the `req.query` and provide default value `20` for the `limit` parameter. Above is a naive example using Express api, above code has some issue: 

1. `query` is a raw value, expected of `number` type but user could supply other type. If doesn't program carefully this issue can lead to some security issue such as sql injection.
2. Unlike `limit` parameter, `offset` parameter is a required parameter, it needs a way to tell the API consumer if the value is not provided.
3. `query` is case sensitive if API consumer issuing `/animals?Limit=0&Offset=20` the `limit` and `offset` variable will be failed.

To fix above code become a secure and robust is relatively simple, but will be repetitive and boring. You will need a middleware to tackle the case sensitive query issue, and some validation library such as [Joi](https://github.com/hapijs/joi) to validate the query.

Plumier provided built in data conversion, validation and advanced parameter binding to make simplest implementation secure and robust.

```typescript
import {rest, val} from "plumier"

class AnimalsController {
    @rest.get()
    list(@val.required() offset:number, limit:number = 20) {

    }
}
```

Above code will host the API in the same url `/animals?offset=0&limit=20`. By default its already tackle all the issue discussed above.
1. `offset` and `limit` converted and validated based on parameter type and preference, if user supply value with different data type or invalid data, Plumier automatically response with Http Status 422 with an informative message. 
2. Case sensitivity is not an issue `offset` and `limit` will populated as long as API consumer provided the correct name.
   
## Less Code To Write
There is a rule spread among backend programmer using static type language ***Never use entity as DTO (data transfer object) because it can lead to security issue***. The rule mostly correct but it lead to another issue: duplication, bloated business model (Entity, DTO) and extra conversion logic from DTO to Entity. 

[Nest Real World Example](https://github.com/lujakob/nestjs-realworld-example-app) is a good example that follow above rule. You can see that most of the module has their own `dto` directory [contains duplicated property and validation](https://github.com/lujakob/nestjs-realworld-example-app/blob/master/src/user/dto/create-user.dto.ts), and an [extra conversion needed from DTO into entity](https://github.com/lujakob/nestjs-realworld-example-app/blob/e471eed02c88dc9bd40f6b4f6ecb55089a1faf7a/src/user/user.service.ts#L52).

Plumier doesn't intended to break the rule, you still can follow the rule using Plumier but, but Plumier has some functionalities that enables you to use your Entity as a DTO. The real example of this use case can be found in a user registration API. The `User` entity use to represent the database records is like below: 

```typescript
User {
    id:number
    email:string
    password:string
    name:string
    role: "Admin" | "User"
    dateOfBirth:Date
    createdAt:Date
    updatedAt:Date
}
```

While the data form supplied by the API consumer (DTO) is different : 

```typescript
{
    email:string
    password:string
    confirmPassword:string
    name:string
    dateOfBirth:Date
}
```

There are several issue to face when you want to use your entity as your DTO: 
1. Security issue: user possibly can provide value for sensitive data such as `createdAt`, `updatedAt` or even `role` extra validation required to do that. 
2. Validation issue: `confirmPassword` doesn't exists in the `User` entity that make it impossible to validate.

