---
id: fundamentals
title: Fundamentals
---

This documentation covers all the basic features of Plumier. By reading this documentation you will get the basic understanding on how the framework work.

## Basic Framework Skeleton
The simplest Plumier application consist of two parts: **Application bootstrap** and a **controller**. This simple application can be written in single TypeScript file like below:

```typescript
import Plumier, { WebApiFacility } from "plumier"

// controller
class HelloController {
    index(name:string) {
        return { say: `Hello ${name}` }
    }
}

// application bootstrap
new Plumier()
    .set(new WebApiFacility({ controller: __dirname }))
    .initialize()
    .then(koa => koa.listen(8000))
    .catch(console.error)
```

Above code host an API listens to port 8000 and serve an endpoint `GET /hello/index?name=<string>`. 

## Bootstrap Application
The bootstrap application consists of two steps: initialization and listen to the port for incoming http request. 

```typescript
new Plumier()
    .set(new WebApiFacility())
    .initialize()
    .then(koa => koa.listen(8000))
    .catch(console.error)
```

Facility is a component used to configure Plumier application to add a new functionalities. It consist of ordered middlewares, some initialization process before the application started and some application configuration. Plumier provided some facilities for development convenient.

| Facility              | Includes                                                          | Package                 |
| --------------------- | ----------------------------------------------------------------- | ----------------------- |
| `WebApiFacility`      | Body parser, CORS middleware, Default dependency resolver         | `plumier`               |
| `JwtAuthFacility`     | Jwt middleware, Enable authorization, Jwt Secret configuration    | `@plumier/jwt`          |
| `MongooseFacility`    | Mongoose schema generator, Schema analyzer, Connection management | `@plumier/mongoose`     |
| `MultiPartFacility`   | Multipart file parser                                             | `@plumier/multipart`    |
| `ServeStaticFacility` | Serve static files middleware                                     | `@plumier/serve-static` |


## Controller 
The term of Controller in Plumier is the same as in other MVC framework. Controller is a group of actions handled the request. Controller should follow a simple rules
1. Controller name should be ends with `Controller`, for example `UsersController` 
2. By default controller files should be put inside directory named `controller` in the same level with the bootstrap application file. But this behavior can be change by specifying the directory `new WebApiFacility({ controller: join(__dirname, <new location>) })`

```typescript 
import {route} from "plumier"

//file: ./controller/animal-controller.ts
class AnimalsController {
    @rest.get()
    get() { }
}
```

## Basic Routing
Route automatically generated from controller name, method name and parameter names.

```typescript 
class AnimalsController {
    get(id:string) { }
}
```

```
GET /animals/get?id=123
```

Default http method used is `GET`, the controller name `AnimalsController` generated into `animals` note that the `Controller` word is removed. Method name kept intact `get`. Methods parameter `id` bound with the request query `id`. 

Furthermore this behavior can be customized using the `@route` decorator. 

```typescript 
import {route} from "plumier"

class AnimalsController {
    @route.get(":id")
    get(id:number) { }

    @route.post("")
    save(data:Animal){ }

    @route.put(":id")
    modify(id:number, data:Animal){ }
}
```

```
GET  /animals/:id
POST /animals
PUT  /animals/:id
```

String parameter passed into the route parameter `@route.get(":id")` will rename the method name, thus its become `GET /animals/:id`, note that the controller name kept intact `animals`, the `get` method name changed into `:id`. 

When empty string provided `@route.post("")` the method name will be ignored, thus its become `POST /animals`, note the `save` method name ignored from the url.

This behavior enable Plumier to construct more flexible route such as nested route easily, refer to [route generation cheat sheet](refs/route) for more information.


## Basic Parameter Binding
To access request values (body, headers, cookie etc) from inside controllers, Plumier provided parameter binding to automatically bound request value into parameters. Plumier parameter binding uses reflection library to extract controller metadata that make it possible to bound method parameter using convention over configuration and minimize the usage of decorators.

Parameter binding add an extra step before bound the request values into the method parameters: 
1. Converter its provide data conversion into the exact parameter type.
2. Validator its automatically validate the value if the validation decorator provided.
3. Authorization (optional) its check for parameter access if enabled.

Plumier supported three kind of parameter binding. Its applied into method's parameter using priority.
1. Decorator parameter binding (highest priority). Decorator parameter binding use special decorator `@bind`.
2. Name parameter binding (medium priority). Apply request values based on name.
3. Model parameter binding (lowest priority). Apply request body into parameter where the parameter type is a class that its property match with request body properties.
   
Using above rule having controller below 

```typescript
class AnimalsController {
    @route.get()
    get(species:string){}
}
```

By issuing `GET /animals/get?species=canine` will automatically bound the `species` parameter of the query string into the `species` parameter of the method, using Name Parameter Binding. 

```typescript
class AnimalsController {
    @route.get()
    get(@bind.header("x-forwarded-proto") forward:string){}
}
```

Above code will bound the `forward` parameter with request header `x-forwarded-proto` using Decorator Parameter Binding

```typescript 
@domain()
class Animal {
    constructor(
        public name:string,
        public active:boolean,
        public dateOfBirth:Date
    )
}

class AnimalsController {
    @route.post("")
    save(data:Animal){ }
}
```

By issuing `POST /animals` with a request body `{ "name": "Mimi", "active": "Yes", "dateOfBirth": "2018-12-3" }` will automatically bound the request body into the `data` parameter using Model Parameter Binding, because `data` is a custom class and doesn't have any decorator nor match any request name. 

Note that using above code, the request boy automatically converted into `Animal` class including all its properties `"active": "Yes"` automatically converted into `active: true`, `"dateOfBirth": "2018-12-3"` converted into `dateOfBirth: new Date("2018-12-3")`


## Type Conversion Limitation
Due to TypeScript reflection limitation in some case type conversion will not work in parameter binding like expected. Plumier use its own reflection library named [TInspector](https://github.com/plumier/tinspector). It uses TypeScript `experimentalDecorators` and `emitDecoratorMetadata` to get the type information such as type name, method name, methods parameter names etc during runtime.

`emitDecoratorMetadata` configuration tells TypeScript compiler to add type information only on decorated class. This limitation also affect TInspector ability:

1. Will not able to get type information of an interface
2. Will not able to get type information of a class without decorator. It can get name information of class, method, property and parameters but unable to get its data type.
3. Will not able to get type information of complex class such as generic type : `Array<User>`, `Partial<User>` or even `Promise<User>`
   
By having an understanding of above limitation, then you will understand that below controller will not work like expected.

```typescript
class DataController {
    get(num:number){
        return { number }
    }
}
```

By issuing `GET /data/get?num=hello` won't make Plumier response error, because converter unable to get the type information of the `num` parameter. This issue can be fixed by adding any decorator on the `get` method


```typescript
class DataController {
    @route.get()
    get(num:number){
        return { number }
    }
}
```

By providing `@route.get()` decorator TypeScript will add type information on the `num` parameter that make issuing `GET /data/get?num=hello` will make Plumier response an error properly.

If you're good static type programmer than you'll notice that Plumier uses class as domain model instead of interface. Example below uses interface as the domain model and due to reflection limitation on interface below example will not work like expected.

```typescript
interface User {
    name:string,
    dateOfBirth:Date,
    active:boolean
}

class UsersController {
    @route.post("")
    save(user:User){ }
}
```

Even if you provide `@route.post("")` decorator TypeScript will not add information about property type of the `User` domain above. Thus issuing request below will not causing response error.

```
POST /users
{ 
    "name": "Mimi", 
    "dateOfBirth": 123, 
    "active": "lorem ipsum" 
}
```

To fix above issue use a class as domain model decorated with `@domain()` decorator like below

```typescript
@domain()
class User {
    constructor(
        public name:string,
        public dateOfBirth:Date,
        public active:boolean
    ){}
}

class UsersController {
    @route.post("")
    save(user:User){ }
}
```


## Basic Validation
Plumier validation checked automatically before the controller executed. Plumier provided comprehensive decorator based validation functionalities. Decorator can be applied directly on the parameter or in the domain properties.

```typescript
import { val } from "plumier"

class AuthController {
    @route.post()
    login(@val.email() email:string, password:string){}
}
```

Above code showing that the `@val.email()` validator applied into the parameter directly. Using controller above when API consumer provided invalid email address the response with status 422 automatically returned without having to touch the controller. This is an intended behavior because further you can create your own custom validator easily.

`@val` decorator can be applied anywhere on the domain property in a deep nested children.

```typescript
import { val } from "plumier"

@domain()
class Login {
    constructor(
        @val.email()
        public email:string,
        public password:string
    ){}
}

class AuthController {
    @route.post()
    login(data:Login){}
}
```

Above code have the same behavior with the previous one, but showing that the validation now moved into a class property.  

## Authorization
Plumier provided authorization decorator to easily securing access to the endpoints. This functionality automatically enabled when the `JwtAuthFacility` installed on Plumier application. Once installed all endpoints secured (not accessible by non login user) except decorated with `@authorize.public()`

Plumier authorization required a valid JWT key passed within the `Authorization` header or a cookie named `Authorization`, Plumier automatically returned back response with status code: 
1. 403 (Forbidden) If JWT key not provided in header or cookie, except the endpoint mark with `@authorize.public()`.
2. 401 (Unauthorized) If current login user Role doesn't match with authorized endpoint specified in `@authorize.role(<allowed role>)`.

`JwtAuthFacility` automatically verify the JWT and check the `role` property inside the JWT Claim if its match with the accessed role described by the `@authorize.role(<allowed role>)`. Example of valid JWT Claim: 

```typescript
import {sign} from "jsonwebtoken"

const token = sign({ userId: <id>, role: "User" }, process.env.JWT_SECRET)
```

Note that the `role` property is required, it can be a `string` or `string[]`. 

```typescript
class AnimalsController {
    @authorize.role("Admin", "User")
    @route.get(":id")
    get(id:string){ }

    @authorize.role("Admin")
    @route.post("")
    save(data:Animal){ }
}
```

| Route               | Access        |
| ------------------- | ------------- |
| `GET  /animals/:id` | Admin or User |
| `POST /animals`     | Admin only    |


Go to the [Authorization](refs/authorization) for more information.

## Controller Return Value
Controller's return value by default will rendered into JSON response with status code 200. Controller allowed to returned value or promised value. 

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string){
        //return static value
        return { name: "Mimi" }
    }
}
```

Or return promised value returned by database library

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string){
        // mongoose model
        return AnimalModel.findById(id)
    }
}
```

For more advanced result, controller should returned any object derived from `ActionResult` class. Using `ActionResult` possibly to set more advanced response values such as cookie, header etc.

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string){
        return new ActionResult({ name: "Mimi" })
            .setCookie("Name", "Value")
    }
}
```

Plumier provided several `ActionResult` derived class for development convenient. 

| Action                 | Alias                 | Description                | Package                 |
| ---------------------- | --------------------- | -------------------------- | ----------------------- |
| `ActionResult`         | `response.json()`     | Return json response       | `plumier`               |
| `RedirectActionResult` | `response.redirect()` | Redirect response          | `plumier`               |
| `FileActionResult`     | `response.file()`     | Serve static file response | `@plumier/serve-static` |

Refer to [action result documentation](refs/action-result) for more information.
