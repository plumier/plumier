---
id: security
title: Security
---

Plumier has several security feature to be able to protect your API using JWT. Most part of the request and response can be secure and authorize to restrict access to some user or role.

## Enable Functionality

Plumier security can be enabled by using `@plumier/jwt` package and set `JwtAuthFacility` into Plumier application 

```typescript
import { JwtAuthFacility } from "@plumier/jwt"

const app = new Plumier()
app.set(new JwtAuthFacility({ secret: "<your secret key>" }))
```

Above will enable Plumier security feature, `secret` is your JWT secret key used to sign the JWT during login process. If no `secret` provide `JwtAuthFacility` will check for environment variable named `PLUM_JWT_SECRET`, if both not provided an error will be thrown.

:::note
By default after `JwtAuthFacility` applied, all route is private (Authenticated), it means non authenticated user will not able to access API except specifically defined `Public`
:::

## Authentication 

Plumier supported authentication using bearer token and cookie, both using JWT token. Authentication begin by signing a JWT token during login process like below. 

```typescript 
import { route } from "plumier"
import { sign } from "jsonwebtoken"

export class AuthController {
    @route.post()
    async login(email:string, password:string) {

        // other process

        const user = await repo.findByEmail(email)
        const token = sign({ userId: user.id, role: user.role }, 
          process.env.PLUM_JWT_SECRET)
        return { token }
    }
}
```

Above is example of login controller returned a JWT token contains JWT claims `userId` and `role`. Its also possible to set cookie for authentication by returning cookie like below.

```typescript 
import { route, response } from "plumier"
import { sign } from "jsonwebtoken"

export class AuthController {
    @route.post()
    async login(email:string, password:string) {

        // other process

        const user = await repo.findByEmail(email)
        const token = sign({ userId: user.id, role: user.role }, 
          process.env.PLUM_JWT_SECRET)
        return response.json({})
            .setCookie("Authorization", token, { sameSite: "lax" })
    }
}
```

Above will set cookie to the API client with default `HttpOnly` and `SameSite:Lax` to prevent XSS and CSRF attack. The default cookie name used for authentication is `Authorization`, this behavior can be changed on `JwtAuthFacility` by providing `cookie` option like below.

```typescript
app.set(new JwtAuthFacility({ cookie: "Oreo" }))
```

By defining a custom cookie name you should set the cookie appropriately `.setCookie("Oreo", token)`.

## Accessing Current Login User 

After user authenticated either by using bearer token on `Authorization` header or using cookie, the current login user (the JWT claim) can be accessed from the request context `ctx.user` anywhere on the system.

To access current login user from the controller you can use `@bind.user()` like below. 

```typescript 
import { bind, route, JwtClaims } from "plumier"

export class UsersController {

    // GET /users/me
    @route.get()
    me(@bind.user() user:JwtClaims) {
        return repo.findById(user.userId)
    }
}
```

Note that `JwtClaims` is a specialized interface represent the user JWT claims, you can augment the interface to add more properties for intellisense like below.

```typescript
import  "plumier"

declare module "plumier" {
    // augment the JWT Claims object (represent the current login user)
    interface JwtClaims {
        userId: number,
        role: "User" | "Admin"
        refresh?: true
    }
}
```

When accessing current login user from other framework components other than controller which parameter binding doesn't exists, you can access it from the request context like below. 

```typescript
const get:CustomMiddleware = ({ctx, proceed}) => {
    ctx.user // this way you can access user
    return proceed()
}
```

Above is example how you can access current login user from custom middleware, mostly all framework component has accessible `ctx` property.

## Authorization 

When user authenticated you can restrict access to some API based on user role or based on more complex condition. Plumier provide an authorization policy to define the authorization logic than it can be applied to secure access to the route, to secure setting to request part such as query or request body property, or to remove unauthorized response properties.

To create an authorization policy start by using `AuthorizationPolicyBuilder` or by using its shorthand `authPolicy()`. For example we will create an authorization policy for several roles `User`, `Admin`, `SuperAdmin` by checking if the current login user claim `role` property has the appropriate value. 

```typescript
import { authPolicy } from "plumier";

authPolicy()
    .register("User", ({ user }) => user?.role === "User")
    .register("Admin", ({ user }) => user?.role === "Admin")
    .register("SuperAdmin", ({ user }) => user?.role === "SuperAdmin")
```

Above example created several authorization policies named `User`, `Admin`, `SuperAdmin` by checking the `role` claim. Authorization policy allowed to returned `boolean` or `Promise<boolean>` for asynchronous authorization logic.

:::note
Plumier has two predefined auth policy that is ready to use

* `Public`:  Used to make resource accessible by public, this authorization callback is always return true.
* `Authenticated`: Default auth policy, used to secure routes only for login user (role omitted).
:::

## Authorization Policy File Registration

Authorization policy registration can be put anywhere with file name ends with `policy`, `controller` or `entity`, for example `user-policy.ts`, `user_policy.ts`, `user-controller.ts` etc. 

This behavior can be change using configuration below.

```typescript
app.set(new JwtAuthFacility({ authPolicies: "./path/of/policies.*(ts|js)" }))
```
The `authPolicies` configuration receive file path, directory or file glob to specify the location of the auth policy. 

## Applying Authorization Policy


After authorization policy created and configured properly you can apply it to secure your API. There are several decorator can be used to apply the auth policy.

| Decorator                       | Description                                                      |
| ------------------------------- | ---------------------------------------------------------------- |
| `@authorize.route(AUTH_POLICY)` | Protect route can be accessed by specific auth policy            |
| `@authorize.write(AUTH_POLICY)` | Protect property only can be write by specific auth policy       |
| `@authorize.read(AUTH_POLICY)`  | Protect property only can be read by specific auth policy        |
| `@authorize.readonly()`         | Protect property only can be read and no other role can write it |
| `@authorize.writeonly()`        | Protect property only can be write and no other role can read it |

### Authorizing Route
For example below is how to secure a route by applying the decorator on the controller action.

```typescript {4}
class AnimalsController {

    // apply auth policy to specific action
    @authorize.route("Admin", "SuperAdmin")
    @route.get("")
    list() { }
}
```

With above configuration the `GET /animals` route only accessible by `Admin` or `SuperAdmin`, other than those role will receive 401. 

Authorization can be applied on the controller to authorize all actions contained in the controller like below.

```typescript {2}
// apply auth policy to all actions
@authorize.route("Admin", "SuperAdmin")
class AnimalsController {

    @route.get("")
    list() { }

    @route.post("")
    save(data:Animal){ }
}
```

With above configuration both `GET /animals` and `POST /animals` will only accessible by `Admin` or `SuperAdmin`.

### Global Route Authorization

Authorization can be applied globally to apply default authorization to all routes, to do that you apply the auth policy from the `JwtAuthFacility` like below.

```typescript
// apply auth policy globally to all routes
app.set(new JwtAuthFacility({ globalAuthorize: ["Admin", "SuperAdmin"] }))
```

With above configuration all routes (except explicitly has auth policy defined) will only be accessible by `Admin` or `SuperAdmin`

### Query String Authorization

Authorization can be applied on parameter to protect some request part bound to the parameter accessible by specific user. 

```typescript
class UsersController {

    // apply auth policy to email query string
    @route.get("")
    list(@authorize.write("Admin", "SuperAdmin") email:string = "") { }
}
```

Using above configuration some users may access the `GET /users` but only `Admin` or `SuperAdmin` can provide query string `email` other than that will returned 401.

### Request Body Authorization

Authorization can be applied on request body specifically on the property to restrict access to some property of the request body, you do that by adding decorator on the model properties like below.

```typescript {8}
// request model
@domain()
class User {
    constructor(
        public email:string,
        public password: string,
        // apply auth policy to specific request body property
        @authorize.write("Admin", "SuperAdmin")
        public role: "User" | "Admin"
    ){}
}

class UsersController {

    @authorize.route("Public")
    @route.get("")
    save(data:User) { }
}
```

Using above configuration, only `Admin` or `SuperAdmin` can set the `role` property of request body. 

### Response Authorization 

Authorization can be applied on response body, unlike most authorization process, response authorization doesn't response 401, instead its filter property value based on auth policy. You do this by applying decorator on the response model. 


```typescript {7,10,18}
import { type } from "@plumier/reflect"

// request model
@domain()
class User {
    constructor(
        @authorize.read("Admin", "SuperAdmin")
        public email:string,
        public name:string,
        @authorize.read("Admin", "SuperAdmin")
        public role: "User" | "Admin"
    ){}
}

class UsersController {

    @route.get(":id")
    @type(x => User)
    get(id:string):User { 
        return repo.findByID(id)
    }
}
```

Using above configuration `email` and `role` property will be visible only to `Admin` and `SuperAdmin`. The response vary based on user role.

## Authorization Evaluation Order

Authorization applied to global, controller or action evaluated with some priority. Authorization system separated into three category, which is Route Authorization, Parameter Authorization, Response Authorization. 



* Route authorization (global, controller, action) has the most priority evaluation, when a user doesn't have access it means he doesn't have access to the Parameter or Response.
* Parameter and Response Authorization will be evaluated later after Route authorization. 

Route authorization separated into three location, which is Global Authorization, Controller Authorization and Action Authorization. 
* Action authorization has the most priority evaluated. If user allowed to access action then Controller Authorization and Global Authorization ignore.
* Controller authorizations are second evaluated after Action Authorization, its means if an Action Authorization applied then it will be ignored.
* Global Authorization evaluated last.

For example if we have authorization configuration like below

```typescript {2}
// global authorization
app.set(new JwtAuthFacility({ globalAuthorize: "Public" }))

// controller authorization
@authorize.route("Admin", "SuperAdmin")
class UsersController {

    @route.post("")
    save(data:Animal) { }

    @authorize.route("Public")
    @route.get("")
    list(@authorize.write("SuperAdmin") email:string) { }
}

// other controller 
class DashboardController {

    @route.get("")
    index(){ }
}
```

Using above configuration the authorization will be like below. 
1. `POST /users` will only accessible by `Admin` and `SuperAdmin` (inherit the controller authorization)
2. `GET /users` will be accessible by `Public` (its override the controller authorization), but `GET /users?email` will only accessible by `SuperAdmin`.
3. `GET /dashboard` will be accessible by `Public`, since `DashboardController` doesn't has any authorization applied it inherit the global authorization.


