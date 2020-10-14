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

Value of the role can be a string or an array of string that will be used by `@authorize.role(<user role>)`. 

## Custom Field Name
By default `JwtAuthFacility` will look for `role` field in your signed token. If you don't like the `role` field on the signed token you can specify the `roleField` with the name of the field in your token.

Example, your role field in the signed token is `access`

```typescript
jwt.sign({ 
    email: "<user email>", 
    //defined the role
    access: "<user role>" 
}, "<your secret key>"),

```

Specify the field name on the `JwtAuthFacility`

```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>", roleField: "access" }))
```

If you require a real time access to the role vs reading from token claim (because the user role changes needs to wait for the token to expired first), you can provide a function to get the user role for real time role access. But keep in mind that this trick will make every request touch the database that will impact performance:

```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>", roleField: async user => getUserRole(user._id) }))
```

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


## Role Authorization 
Authorize access to specific route using `@authorize.role(<list of role>)`

```typescript
export class ProductsController {
    @authorize.public()
    @route.get(":id")
    get(id: string) { }

    @authorize.role("admin")
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
@authorize.role("admin")
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
@authorize.role("admin", { action: ["save", "replace"] })
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
@authorize.role("admin")
export class ProductsController {
    @authorize.role("admin", "user")
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
        @authorize.role("admin")
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

## Projection Authorization 
Applying authorize decorator on a domain property automatically project data returned based on client role like example below

```typescript
import reflect from "tinspector"
import { domain, authorize, route } from "plumier"

@domain()
export class Item {
    constructor(
        public name: string,
        // basePrice only can be set by admin and viewed by admin
        @authorize.role("admin")
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
import reflect from "tinspector"
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

:::info
Note that `@authorize.role("admin")` is the same as provide `@authorize.read("admin")` and `@authorize.write("admin")`
:::

## Filter Authorization 
You can specify parameter or model property that filterable using specific role by using `@authorize.filter()`. 

```typescript
import reflect from "tinspector"
import { domain, authorize, route } from "plumier"

@domain()
export class Item {
    constructor(
        public name: string,
        @authorize.write("admin")
        @authorize.read("admin", "staff")
        @authorize.filter("admin")
        public basePrice: number,
        public price:number
    ) { }
}

export class ItemsController {
    @route.get()
    list(filter:Item){}
}
```

By using above code `/items/list?filter[basePrice]=100` wil restricted only to `admin`.

## Global Authorization
As mentioned above, by default all routes is secured when `JwtAuthFacility` applied, you can override this default behavior by applying `authorize` on the `JwtAuthFacility` configuration like below:


```typescript
const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>", global: authorize.public() }))
```
