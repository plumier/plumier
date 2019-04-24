---
id: overview
title: Plumier In Five Minutes
---

Plumier is a Node.js Rest API framework created on top of [Koa](https://koajs.com/) and uses TypeScript language. Plumier is battery included framework designed to be readable, testable and fast with short learning curve.

## Framework
Simplest Plumier application consists of two parts: controller and entry point. Entry point is the Plumier startup application that will host the REST API and controller is the handler of http request.

```typescript
import Plumier, { WebApiFacility } from "plumier"

class HelloController {
    index(){
        return { message: "Hello world!" }
    }
}

new Plumier()
    .set(new WebApiFacility({ controller: HelloController }))
    .initialize()
    .then(koa => koa.listen(8000))
    .catch(er => console.error(er))
```


Above snippet will host a simple REST API service `GET /hello/index` and listen to port 8000. It uses simple routing by convention which by default will generate controller method into `GET` route. When requested using http client it simply returned JSON `{ "message", "Hello world!" }`. 
Example above showing that Controller manually registered on `WebApiFacility`, by default Plumier will look into `controller/` directory and traverse through all classes that is named end with `Controller`.

> Its recommended to start Plumier project using `plumier-starter` which provided some ready to use starter with some best practices. Go to [Plumier Basic Tutorial](/tutorials/basic-sql/get-started) for more information

## Routing 
Plumier provided flexible routing that combine between decorator, metadata reflection and directory structure to generate routes.

```typescript
// file: controller/api/v1/animal-controller.ts
export class AnimalsController {
    @route.get()
    list(offset:number, @val.optional() limit:number=50){
        // implementation
    }
}
```

Controller above will generated into route below

```
GET /api/v1/animals/list?offset=0&limit=<optional>
```

Above controller showing that Plumier provided convention over configuration by generating route based on directory name, controller name, action name and parameters name.

Controller separation by using directory is good and straight forward to differentiate between UI controller, API controller and API version.

Plumier provided flexible routing configuration that can be used to create routes with restful best practice.

```typescript
export class AnimalsController {
    @route.get("")
    list(offset:number, limit:number){
        // implementation
    }

    @route.get(":id")
    get(id:number){
        //implementation
    }

    @route.post("")
    save(data:Animal){
        //implementation
    }

    @route.put(":id")
    update(id: number, data:Animal){
        //implementation
    }

    @route.delete(":id")
    update(id: number){
        //implementation
    }
}
```

Above routing configuration used to create restful api, it will generate routes below:

```
GET     /animals?offset=<number>&limit=<number>
GET     /animals/:id 
POST    /animals
PUT     /animals/:id 
DELETE  /animals/:id 
```

Notice that the different between `@route.get()` and `@route.get("")`. the string parameter passed into the route method has various meaning: [relative override](refs/route#relative-route-override), [absolute override](refs/route#absolute-route-override) and [ignore override](refs/route#ignore-action-name)

Take a look at the complete [cheat sheet](refs/route) on how to configure routes. It also can be used for more complex routing such as [nested restful api](refs/route#example-nested-restful-api)


## Type Converter
Plumier has its own [dedicated reflection library](https://github.com/plumier/tinspector), that make it aware about TypeScript type annotation and reflection. By using that reflection library Plumier able to convert user request into proper data type implicitly without further configuration.

```typescript
export class AnimalsController {
    @route.get("")
    list(date:Date, offset:number, limit:number){
        console.log("Type of date:", date.constructor.name)
        console.log("Type of offset:", typeof offset)
        console.log("Type of limit:", typeof limit)
    }
}
```

By using controller above, if we provided request below

```
GET /animals?date=2017-12-3&offset=0&limit=25
```

Controller will print: 

```
Type of date: Date
Type of offset: number
Type of limit: number
```

Below is more example of type conversion using POST request, we modify our previous restful api like below:

```typescript
@domain()
export class Animal {
    constructor(
        public name:string,
        public birthDate:Date,
        public isDeceased:boolean
    ){}
}

export class AnimalsController {
    @route.post("")
    save(animal:Animal){
        console.log("Type of name:", typeof animal.name)
        console.log("Type of birthDate:", animal.birthDate.constructor.name)
        console.log("Type of isDeceased:", typeof animal.isDeceased)
    }
}
```

Above code is restful api for `POST /animals`, `save` method uses `Animal` domain as its parameter. `Animal` class is a regular ES6 class that uses parameter properties. `@domain()` decorator is required for TypeScript to provided a design type reflection. 

If we provided below POST request using controller above

```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "name": "Mimi", "birthDate":"2017-12-4", "isDeceased": "true" }' \
  http://localhost:8000/animals/save
```

Above curl request we provided `string` values for `birthDate` and `isDeceased` and Plumier wil convert to proper data type. Above request will print:

```
Type of name: string
Type of birthDate: Date
Type of isDeceased: boolean
```

Refer to [converter documentation](refs/converters) for more information about Plumier type conversion.

## Parameter Binding
Plumier provided parameter binding to bind request data into method parameters, and provided convention that is readable and testable.

Plumier supported various type of parameter binding: [decorator binding](refs/parameter-binding#decorator-binding), [name binding](refs/parameter-binding#name-binding), [model binding](refs/parameter-binding#model-binding). 

```typescript
@domain()
export class Animal {
    constructor(
        public name:string,
        public birthDate:Date,
        public isDeceased:boolean
    ){}
}

export class AnimalsController {
    @route.post("")
    save(animal:Animal){
        //implementation
    }
}
```

Above controller is from our previous example, it uses model binding to bound request body into `animal` parameter. 

Plumier also provided name binding, it useful when request body only have a few properties and you don't want to declare a domain for it.

```typescript
export class AuthController {
    @route.post()
    login(userName:string, password:string){
        //implementation
    }
}
```

Above controller uses name binding to bound request body part into separate parameters without having to declare any domain. Issuing request to controller above using curl is like below

```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{ "userName": "mimi", "password":"secret" }' \
  http://localhost:8000/auth/login
```

Using above request `userName` and `password` from request body will automatically bound to `userName` and `password` parameter. 

> If you confused on why `animal` parameter bound to the whole request body but `userName` and `password` bound to request body properties, you can check into documentation about [name binding](refs/parameter-binding#name-binding), [model binding](refs/parameter-binding#model-binding) and their [behavior](refs/parameter-binding#behavior)

Plumier also provided parameter binding using `@bind` decorator. Example we can bind request header to the controller parameter like below:


```typescript
export class TestController {
    @route.get()
    get(@bind.header() header:any){
        //implementation
    }
}
```

Or if you used provided JWT Token authentication you can bind current login user like below

```typescript
export class TestController {
    @route.get()
    get(@bind.user() user:any){
        //implementation
    }
}
```

Benefit of using parameter binding is make code simpler, readable and easy to test because its make controller free from request object. Read the full documentation about parameter binding [here](refs/parameter-binding)

## Validation
Plumier provided decorator based validator uses [Validator](https://www.npmjs.com/package/validator) package. Validator `@val` decorator can be applied on parameter or inside domain properties.

```typescript
export class AuthController {
    @route.post()
    login(@val.email() email:string, password:string){
        //implementation
    }
}
```

Above example showing that validator applied inline on method parameter. It can be modified using domain which will result in the same behavior.

```typescript
@domain()
export class Auth {
    constructor(
        @val.email()
        public email:string,
        public password:string
    )
}

export class AuthController {
    @route.post()
    login(auth:Auth){
        //implementation
    }
}
```

Custom validator easily can be created using `@val.custom()` check appropriate [documentation](extends/custom-validator) for more detail information.

For more information about validator can be found in this [documentation](refs/validation)

## Security
Plumier provided built-in function to secure route and parameter based on user role. Internally it uses [koa-jwt](https://github.com/koajs/jwt) middleware to authenticate and authorize user based on their role. 

To authorize specific user to access route or set parameter, you only need to decorate specific controller method with `@authorize` decorator. `@authorize` decorator can also be applied into a parameter to restrict access for user setting value to the parameter. 

There is some setup required before start using `@authorize` decorator can be found in [this documentation](refs/authorization#setup).

```typescript
export class AuthController {
    @authorize.public()
    @route.post()
    login(userName:string, password:string){
        //implementation
    }
}
```

Above snippet showing that we applied `public` authorization into the `POST /auth/login`, by default when security is enabled all route will be secured so we need to specify `public` routes.

```typescript
export class UsersController {
    @authorize.role("Admin")
    @route.post()
    role(userId:number, role:string){
        //implementation
    }
}
```

Above route `POST /users/role` will only accessible by `Admin`. Internally it will check for the user role and if user role doesn't match with `Admin` then 401 Unauthorized will be returned.

`@authorize` Decorator can be applied into parameter or domain property like `User` domain below

```typescript
@domain()
export class User {
    constructor(
        public id:number,
        public name:string,
        public email:string,
        @authorize.role("Admin")
        public role: "User" | "Admin"
    )
}

export class UsersController {
    @authorize.public()
    @route.post("")
    save(user:User){
        //implementation
    }
}
```

Above snippet showing that we provided a public user registration in `POST /users` but only `Admin` can set user `role`.

Check the full [documentation](refs/authorization) for more information about Plumier security

## Performance
Plumier relatively has small code base which make it light and fast. It uses Koa as its core http handler which is quite fast, below is comparison result of Koa, Plumier and Express.

![Benchmarks](assets/benchmarks.png)

The benchmark project forked from Fastify benchmark project, you can test it your self [here](https://github.com/ktutnik/benchmarks). 




