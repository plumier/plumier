---
id: fundamentals
title: Fundamentals
---

This documentation covers all the basic features of Plumier. By reading this documentation you will get the basic understanding on how the framework work.

## Basic Framework Skeleton
The simplest Plumier application consist of two parts: **Application bootstrap** and a **controller**. This simple application can be written in single TypeScript file like below:

```typescript title="index.ts"
import Plumier, { WebApiFacility } from "plumier"

// controller
export class HelloController {
    index(name:string) {
        return { say: `Hello ${name}` }
    }
}

// application bootstrap
new Plumier()
    .set(new WebApiFacility({ controller: __filename }))
    .listen(8000)
```

Above code host an API listens to port 8000 and serve an endpoint `GET /hello/index?name=<string>`. 

### Minimum TypeScript Configuration
To be able to run the Plumier application properly, some TypeScript option need to be enabled. Below is minimum required configuration to be able to run Plumier application properly. 

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // optional 
    "strict": true,
    //required if using @plumier/typeorm and strict:true enabled
    "strictPropertyInitialization": false,
  }
}
```

### Bootstrap Application
The bootstrap application consists of two steps: initialization and listen to the port for incoming http request. 

```typescript
new Plumier()
    .set(new WebApiFacility())
    .listen(8000)
```
### Facility
Facility is a component used to configure Plumier application to add a new functionalities. It consist of ordered middlewares, some initialization process before the application started and some application configuration. Plumier provided some facilities for development convenient, here are some facilities that commonly used

| Facility              | Includes                                                                               | Package                 |
| --------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| `WebApiFacility`      | Body parser, CORS middleware, Default dependency resolver                              | `plumier`               |
| `RestApiFacility`     | Same as `WebApiFacility` except its provided more strict restful API status code       | `plumier`               |
| `ControllerFacility`  | Host controllers by path or type, furthermore controllers can be grouped and versioned | `plumier`               |
| `LoggerFacility`      | Simple request logging and error reporting                                             | `plumier`               |
| `JwtAuthFacility`     | Jwt middleware, Enable authorization, Jwt Secret configuration                         | `@plumier/jwt`          |
| `MongooseFacility`    | Mongoose schema generator, Schema analyzer, Connection management                      | `@plumier/mongoose`     |
| `TypeORMFacility`     | Provided helper to easily use TypeORM from Plumier                                     | `@plumier/typeorm`      |
| `ServeStaticFacility` | Serve static files middleware                                                          | `@plumier/serve-static` |
| `SwaggerFacility`     | Serve Swagger UI and generate Open API 3.0 automatically                               | `@plumier/swagger`      |


### Controller 
The term of Controller in Plumier is the same as in other MVC framework. Controller is a group of actions handled the request. Controller should follow a simple rules
1. Controller name should be ends with `Controller`, for example `export class UsersController { }` 
2. By default controller files should be put inside directory named `controller` in the same level with the bootstrap application file. But this behavior can be changed by using `ControllerFacility`

```typescript 
import { route } from "plumier"

//file: ./controller/animal-controller.ts
class AnimalsController {
    @route.get()
    get() { }
}
```

### Controller Return Value
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

Refer to [action result documentation](../refs/Action-Result.md) for more information.

## Project Layout 
Plumier doesn't provide any style on how to layout your project files, instead its provide flexibility on how the project files match your convenient. For example in the above code the application and controller are placed in a single file, Plumier allows you to have that kind of structure if you have tiny project with a few source code.

Below are some common project structure usually used by developers, You can choose any of them match your like.

### Single File Style
This style usually used by Express for small app with a fewer code. To use this style setup your application bootstrap like below 

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: ___filename }))
    .listen(8000)
```

By providing `__filename` you ask Plumier to search your controllers in the same file. 

:::caution
If using `__filename` as source of controller, its required to export your controller to make reflection library able to locate it.
:::

### Classic MVC Style 
This is default style supported by Plumier. Classic MVC style app separate project files by functionalities such as `controllers`, `models`, `repositories`, `entities`, `services` etc.

```
+ src/
  + controller/
    - item.controller.ts
    - user.controller.ts
  + repository/
    - item.repository.ts
    - user.repository.ts
  + service/
    - item.service.ts
    - user.service.ts
  + entity/
    - item.entity.ts
    - user.entity.ts
  - app.ts
  - index.ts
- package.json
- tsconfig.json
```

No more setup required to use this style.

```typescript
new Plumier()
    .set(new WebApiFacility())
    .listen(8000)
```

### Modular Style 
This style usually used by modern frameworks, files separated by module per directory, each directory consist of controller, model, service, entity etc separated in different files. 

```
+ src/
  + item/
    - item.controller.ts
    - item.entity.ts
    - item.service.ts
    - item.repository.ts
  + user/
    - user.controller.ts
    - user.entity.ts
    - user.service.ts
    - user.repository.ts
  - app.ts
  - index.ts
- package.json
- tsconfig.json
```

Use `ControllerFacility` facility to locate the controller location. Plumier will automatically search through all files to find controllers.

```typescript
new Plumier()
    .set(new WebApiFacility())
    .set(new ControllerFacility({ controller: __dirname, directoryAsPath:false }))
    .listen(8000)
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

This behavior enable Plumier to construct more flexible route such as nested route easily, refer to [route generation cheat sheet](Route-Generation-Cheat-Sheet.md) for more information.


## Framework Functionalities
To access request values (body, headers, cookie etc) from inside controllers, Plumier provided parameter binding to automatically bound request value into parameters. Plumier parameter binding uses reflection library to extract controller metadata that make it possible to bound method parameter using convention over configuration and minimize the usage of decorators.

### Basic Parameter Binding
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


## Basic Type Conversion 
Plumier convert value automatically based on parameter data type used in parameter binding like example below

```typescript
class AnimalsController {
    @route.post()
    get(birthday:Date, deceased:boolean){}
}
```

Above controller has `birthday` parameter of type `Date` and `deceased` parameter of type `boolean`, further it can handle request like below

```
GET /animals/get?birthday=2001-2-30&deceased=true
```

The value `2001-2-3` automatically converted into date and `true` into boolean. Type conversion can work on every part of request (query, header, body etc) as long as you specify data type in parameter used for parameter binding. 

For generic datatype and array, TypeScript can't provide proper type information for the reflection library, to solve that you need to specify the data type manually using decorator. 

```typescript 
import tinspector from "tinspector"

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
    save(@reflect.type([Animal]) data:Animal[]){ }
}
```

Above controller has `data` parameter of type array of `Animal`. We specify `@reflect.type([Animal])` to inform the reflection library about the type information. Note that for array type we specify an array `[Animal]`. Read more about type conversion in [this documentation](../refs/Converters.md)

## Basic Validation
Just like type conversion, validation also checked automatically before the controller executed. Plumier provided comprehensive decorator based validation functionalities. Decorator can be applied directly on the parameter or in the domain properties.

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

## Basic Authorization
Plumier provided authorization decorator to easily securing access to the endpoints. This functionality automatically enabled when the `JwtAuthFacility` installed on Plumier application. Once installed all endpoints secured (not accessible by non login user) except decorated with `@authorize.public()`

Plumier authorization required a valid JWT key passed within the `Authorization` header or a cookie named `Authorization`, Plumier automatically returned back response with status code: 
1. 403 (Forbidden) If JWT key not provided in header or cookie, except the endpoint mark with `@authorize.public()`.
2. 401 (Unauthorized) If current login user Role doesn't match with authorized endpoint specified in `@authorize.route(<allowed role>)`.

`JwtAuthFacility` automatically verify the JWT and check the `role` property inside the JWT Claim if its match with the accessed role described by the `@authorize.route(<allowed role>)`. Example of valid JWT Claim: 

```typescript
import {sign} from "jsonwebtoken"

const token = sign({ userId: <id>, role: "User" }, process.env.JWT_SECRET)
```

Note that the `role` property is required, it can be a `string` or `string[]`. 

```typescript
class AnimalsController {
    @authorize.route("Admin", "User")
    @route.get(":id")
    get(id:string){ }

    @authorize.route("Admin")
    @route.post("")
    save(data:Animal){ }
}
```

| Route               | Access        |
| ------------------- | ------------- |
| `GET  /animals/:id` | Admin or User |
| `POST /animals`     | Admin only    |


Authorization can be applied in parameter and domain model, further more it can restrict access of some property in the request and response body. 




Go to the [Authorization](../refs/Authorization.md) for more information.

## First Class Entity 
The term of First Class Entity means Plumier treat entity object (usually ORM/ODM entity) as a first class citizen. Its mean entity object can be used as a map of database table and also can safely used as DTO and become source of type conversion, decorated with validation and authorization.

## Data Access


## Generic Controller 
 