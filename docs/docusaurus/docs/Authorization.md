---
id: authorization
title: Authorization
---

## Enable Facility
Authorization can be enabled by using `@plumier/jwt` package and plugging `JwtAuthFacility` into Plumier application 

```typescript
import { JwtAuthFacility } from "@plumier/jwt"

const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>" }))
// looking for environment variable PLUM_JWT_SECRET
app.set(new JwtAuthFacility())
```

:::info
If no `secret` provide `JwtAuthFacility` will check for environment variable named `PLUM_JWT_SECRET`, if both not provided an error will be thrown.
:::

## Setup
Plumier authorization uses standard token based authentication using json web token, internally it uses [koa-jwt](https://github.com/koajs/jwt) middleware. 

To be able to authorize user, you need to specify `role` field when signing json web token on the login process. 

```typescript
class AuthController{
    //allow access to public
    @authorize.public()
    @route.post()
    async login(data: Login) {
        //check for username / password
        //if OK then return signed token
        return { 
            accessToken: jwt.sign({ 
                email: "<user email>", 
                //defined the role
                role: "<user role>" 
            }, "<your secret key>"),
        }
    }
}
```

Value of the role can be a string or an array of string that will be used by `@authorize.route(<user role>)`. 

## All Routes are Secured
By enabling `JwtAuthFacility` all routes are secured, means if end user access your API without token they will receive 403.

:::info
You can provided global public authorization if you like it
:::


## Public Route
To make specific route accessible by public, use `@authorize.public()` to allow access to all user including user without token.

```typescript
export class ProductsController {
    @authorize.public()
    @route.get(":id")
    get(id: string) { }
}
```

| Route                | Access |
| -------------------- | ------ |
| `GET /products/<id>` | public |


## Route Authorization 
Authorize access to specific route using `@authorize.route(<list of role>)`

```typescript
export class ProductsController {
    @authorize.public()
    @route.get(":id")
    get(id: string) { }

    @authorize.route("admin")
    @route.post("")
    save(data: Product) {}
}
```

| Route                | Access |
| -------------------- | ------ |
| `GET /products/<id>` | public |
| `POST /products`     | admin  |


## Controller Scoped Authorization
Decorated action one by one will be cumbersome, you can apply `@authorize` decorator on controller to apply authorization on all routes contained.

```typescript
@authorize.route("admin")
export class ProductsController {
    @route.get(":id")
    get(id: string) { }

    @route.post("")
    save(data: Product) { }
}
```

| Route                | Access |
| -------------------- | ------ |
| `GET /products/<id>` | admin  |
| `POST /products`     | admin  |


## Controller Scoped Authorization Selector 
From controller scoped authorization you can specify which actions will be applied by setting the `action` option like below 

```typescript
@authorize.route("admin", { selector: ["save", "replace"] })
export class ProductsController {
    @route.get(":id")
    get(id: string) { }

    @route.post("")
    save(data: Product) { }

    @route.put(":id")
    replace(id:string, data: Product) { }
}
```

| Route                | Access        |
| -------------------- | ------------- |
| `GET /products/<id>` | Authenticated |
| `POST /products`     | admin         |
| `PUT /products/:id`  | admin         |


## Controller Scoped Authorization Override
If controller and action decorated with `@authorize` decorator, the action authorization will replace the controller authorization

```typescript
@authorize.route("admin")
export class ProductsController {
    @authorize.route("admin", "user")
    @route.get(":id")
    get(id: string) { }

    @route.post("")
    save(data: Product) { }

    @route.put(":id")
    save(id:string, data: Partial<Product>) { }
}
```

| Route                | Access      |
| -------------------- | ----------- |
| `GET /products/<id>` | admin, user |
| `POST /products`     | admin       |
| `PUT /products/<id>` | admin       |


## Getting Login User Information

To get login user information from within action, you can use `@bind.user()` parameter binding.

```typescript
export class ProductsController {
    @route.get(":id")
    get(id: string, @bind.user() user:LoginUser) { }
}
```

`LoginUser` class is a class that the properties match with claims when you signed the token.


## Parameter Authorization
Grant access to pass value to parameter to specific role. This feature useful when you want to restrict the API consumer to set some property of your domain without creating a new domain/method.

```typescript
@domain()
export class User {
    constructor(
        public name: string,
        //only admin can send deceased
        @authorize.write("admin")
        public disabled: boolean | undefined
    ) { }
}

export class UsersController {
    @route.post()
    save(data: User) {   }
    @route.put(":id")
    save(@val.partial(User) data: Partial<User>) {   }
}
```

Using above code, only admin can disabled the user, if user doesn't have admin role Plumier will return 401 with informative error result.

## Response Authorization 
Applying authorize decorator on a domain property automatically authorize response returned based on client role like example below

```typescript
import reflect from "@plumier/reflect"
import { domain, authorize, route } from "plumier"

@domain()
export class Item {
    constructor(
        public name: string,
        // basePrice only can be set by admin and viewed by admin
        @authorize.read("admin")
        public basePrice: number,
        public price:number
    ) { }
}

export class UsersController {
    @route.get(":id")
    @reflect.type(Item)
    get(id:number): Item {   
        // return single Item from db
    }
}
```

By using code above, the `basePrice` data will only visible if client has `admin` role, other than that will return `undefined`. 

:::info
Note that the `@reflect.type()` is required to describe the return type of the action.
:::


### Access Modifier 
Its possible to control the access of the authorization to only get (read) or write (set) by specifying the proper decorator like below

```typescript
import reflect from "@plumier/reflect"
import { domain, authorize, route } from "plumier"

@domain()
export class Item {
    constructor(
        public name: string,
        @authorize.write("admin")
        @authorize.read("admin", "staff")
        public basePrice: number,
        public price:number
    ) { }
}
```

Using above code `basePrice` will only can be set by `admin` and retrieved by both `staff` and `admin`. 


## Filter Authorization 
You can specify parameter or model property that filterable using specific role by using `@authorize.filter()`. 

```typescript
import reflect from "@plumier/reflect"
import { domain, authorize, route, entity } from "plumier"

@domain()
export class Item {
    constructor(
        public name: string,
        @authorize.filter("admin")
        public basePrice: number,
        public price:number
    ) { }
}

export class ItemsController {
    @route.get()
    list(@entity.filter() filter:Item){}
}
```

By using above code `/items/list?filter[basePrice]=100` wil restricted only to `admin`.

## Global Authorization
As mentioned above, by default all routes is secured when `JwtAuthFacility` applied, you can override this default behavior by applying `authorize` on the `JwtAuthFacility` configuration like below:


```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>", global: authorize.public() }))
```

## Policy Based Authorization 
Role based authorization automatically authorize user based on their role, but in most case authorization may require more check on some data. Policy base authorization bring more freedom when authorizing route or properties, usually used to perform auth check by dynamic value such as checking from database. 

```typescript
authPolicy()
    .register("UserHasDog", async auth => {
        const repo = new Repository(User)
        const user = await repo.findOne(auth.user.userId)
        return user.dogs.length > 0
    })
```

Above code defined an authorization policy `UserHasDog`, it check to the database if the current login user has dogs on the `user.dogs` collection. This policy than can be used anywhere on the `@authorize` decorator like the usual role authorization

```typescript
class DogClubController {
    @authorize.route("UserHasDog")
    @route.post()
    register(){ }
}
```

:::warning
Keep in mind that the name used for policy must not the same as the user role name.
:::

The first parameter of the auth policy callback is the `AuthorizationContext` object, it contains some information required for authorization including the current request information. The signature of the object is like below

```typescript
interface AuthorizationContext {
    value?: any
    parentValue?: any
    role: string[]
    user: { [key: string]: any } | undefined
    ctx: ActionContext
    metadata: Metadata
    access: AccessModifier
}
```

* `value` is Current property value, only available on authorize read/write
* `parentValue` is Current property's parent value, only available on authorize read/write
* `role` is List of user roles
* `user` is Current login user JWT claim
* `ctx` is Current request context
* `metadata` is Metadata information of the current request
* `access` is Type of authorization applied read/write/route/filter