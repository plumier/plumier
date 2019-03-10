---
id: create-local-authentication
title: Create Local Authentication
---

Our API now run as expected, we will add token based authentication and authorization function to secure routes to restrict access to some users. 

## Install Packages
Start by installing required packages used to create token based authentication. Open Visual Studio Code integrated terminal and execute command below

```bash
$ yarn add jsonwebtoken @types/jsonwebtoken
```

Above command will install `jsonwebtoken` package and its typing that will be used to sign JWT token.


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
By default authorization functionalities is not enabled, we need to setup `JwtAuthFacility` on the Plumier application startup. Navigate to `src/app.ts` file and set `JwtAuthFacility` like below

```typescript
import Koa from "koa";
import Plumier, { Configuration, WebApiFacility, JwtAuthFacility } from "plumier";

export function createApp(config?: Partial<Configuration>): Promise<Koa> {
    return new Plumier()
        .set(config || {})
        .set(new WebApiFacility())
        //---- add this line
        .set(new JwtAuthFacility({ secret: process.env.JWT_SECRET }))
        //---- 
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

Controller above will generated into `POST /auth/login` route

## Testing Login Function
