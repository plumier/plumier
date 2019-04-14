---
id: create-local-authentication
title: Create Local Authentication
---

Our API now run as expected, we will add token based authentication and authorization function to secure routes to restrict access to some users. 

## Install Packages
Start by installing required packages used to create token based authentication. Open Visual Studio Code integrated terminal and execute command below

```bash
$ yarn add @plumier/jwt jsonwebtoken @types/jsonwebtoken
```

Above command will install `@plumier/jwt` that required for JWT authorization and `jsonwebtoken` package and its typing that will be used to sign JWT token.


## Add JWT Secret Configuration
Next we need to add new field on the `.env` configuration called `JWT_SECRET` like below

```bash
JWT_SECRET="<secret string>"
```

Secret string can be any string, or can be generated using [online password generator](https://passwordsgenerator.net/). 

Add type information on the `config.d.ts` file for intellisense

```typescript
declare namespace NodeJS {
    export interface ProcessEnv {
        PORT: string
        DB_URI: string
        JWT_SECRET:string //<--- add this
    }
}
```

## Enable Facility
By default authorization functionalities is not enabled, we need to setup `JwtAuthFacility` from `@plumier/jwt` package into the Plumier application startup. Navigate to `src/app.ts` file and set `JwtAuthFacility` like below

```typescript
import Koa from "koa"
import Plumier, { Configuration, WebApiFacility } from "plumier"
import { JwtAuthFacility } from "@plumier/jwt"

export function createApp(config?: Partial<Configuration>): Promise<Koa> {
    return new Plumier()
        .set(config || {})
        .set(new WebApiFacility())
        .set(new JwtAuthFacility({ secret: process.env.JWT_SECRET })) // <--- add this line
        .initialize()
}
```

Above code showing that we enabled the JWT authorization and provided the JWT secret, refer to [this documentation](/docs/refs/authorization) for more information about the facility

## Add Login User Domain
We will need to define another domain to represent a login user. Navigate to `model/domains.ts` and add code below at the end of the file.

```typescript
@domain()
export class LoginUser {
    constructor(
        public userId:number,
        public role: UserRole
    ){}
}
```

Above domain will represent the login user or user claim that will we signed as JWT token. 

`role` field is required when using `JwtAuthFacility` it should be of type of `string`. Or you can provide `string[]` for hierarchical authorization.

## Add Login Function
We are ready now to program the login controller. We defined login function is not part of API functionalities so we will put the login controller in the root controller directory. Create new file name `auth-controller.ts` inside `controller` directory and add the following code

```typescript
import bcrypt from "bcrypt"
import { sign } from "jsonwebtoken"
import { HttpStatusError, route, authorize } from "plumier"

import { db } from "../model/db"
import { LoginUser, User } from "../model/domain"

export class AuthController {
    @authorize.public()
    @route.post()
    async login(email: string, password: string) {
        const user: User | undefined = await db("User").where({ email }).first()
        if (user && await bcrypt.compare(password, user.password)) {
            const token = sign(<LoginUser>{ userId: user.id, role: user.role }, process.env.JWT_SECRET)
            return { token }
        }
        else throw new HttpStatusError(403, "Invalid username or password")
    }
}
```

Controller above will generated into `POST /auth/login` route. By default when authorization enabled all route will become secured, means only authenticated user can access routes. `@authorize.public()` above the `login` method will make `/auth/login` accessible by public.

The logic is quite simple, if the provided password match with the saved hash password then a JWT token without token expiration will be returned. If the password doesn't match then it will return Forbidden error with http status 403.


## Testing Login Function
Our authentication route is ready to test, execute command below from Visual Studio Code integrated terminal

```bash
$ http :8000/auth/login email=admin@todo.app password=123456
```

Note that `admin@todo.app` is user that we add during migration using Knex.js seeds. Above command will response jwt token like below

```bash
HTTP/1.1 200 OK
Connection: keep-alive
Content-Length: 152
Content-Type: application/json; charset=utf-8
Date: Sun, 10 Mar 2019 03:48:54 GMT
Vary: Origin

{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJBZG1pbiIsImlhdCI6MTU1MjE4OTczNH0.7kzqgsi1ywRzGCQTTn9vYKGS5sYvPGlqF78YUcUbmMY"
}
```


## Add Todo Based On Login User 
Previously when adding todos we specify `userId` manually. Now we have current login user operating the application, we will modify the logic that adding todo will automatically associated with the login user.

Navigate to `todos-controller.ts` and modify `save` method like below

```typescript
//add this import above your controller
//import { bind } from "plumier"

@route.post("")
save(data: Todo, @bind.user() user: LoginUser) {
    return db("Todo").insert(<Todo>{ ...data, userId: user.userId })
}
```

Above code showing that we doing decorator binding `@bind.user()` to the `user` parameter, using this snippet `user` parameter will automatically populated with current login domain during request.

`userId` property now should be optional to prevent required validation error thrown by Plumier system. Navigate to `domain.ts` and modify the `Todo` domain like below

```typescript
@domain()
export class Todo extends Domain {
    constructor(
        public todo: string,
        @val.optional() // <--- add this line
        public userId:number,
        @val.optional()
        public completed: boolean = false
    ) { super() }
}
```

Test above modification by executing command below in Visual Studio Code integrated terminal

```bash
$ http POST :8000/api/v1/todos Authorization:"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJBZG1pbiIsImlhdCI6MTU1MjE4OTczNH0.7kzqgsi1ywRzGCQTTn9vYKGS5sYvPGlqF78YUcUbmMY" todo="Buy some other milks"
```

Command above showing that we don't need to specify `userId` anymore. We also specify `Bearer` token that we got from last login into the `Authorization` header on the request.
