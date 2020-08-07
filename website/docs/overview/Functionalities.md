---
id: functionalities
title: Functionalities
---

This documentation covers all the basic features of Plumier. By reading this documentation you will get the basic understanding on how the framework work.

## Routing
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

This behavior enable Plumier to construct more flexible route such as nested route easily.

Refer to [route generation cheat sheet](../refs/Route-Generation-Cheat-Sheet.md) for more information.

## Parameter Binding
To access request values (body, headers, cookie etc) from inside controllers, Plumier provided parameter binding to automatically bound request value into parameters. Plumier parameter binding uses reflection library to extract controller metadata that make it possible to bound method parameter using convention over configuration and minimize the usage of decorators.

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

Refer to [Parameter Binding](../refs/Parameter-Binding.md) for more information

## Type Conversion 
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

Above controller has `data` parameter of type array of `Animal`. We specify `@reflect.type([Animal])` to inform the reflection library about the type information. Note that for array type we specify an array `[Animal]`. 

Refer to [Converters](../refs/Converters.md) for more information

## Validation
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

Refer to [Validation](../refs/Validation.md) for more information

## Basic Authorization
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


Authorization can be applied in parameter and domain model, further more it can restrict access of some property in the request and response body. 

Refer to [Authorization](../refs/Authorization.md) for more information.