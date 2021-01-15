---
id: tutorial-03
title: Step 3 - Securing API
---

In this section we will learn how to program authentication and authorization on Plumier, then we will apply authorization to secure our API. 

## User Roles

In this application we will define two application role which saved in `User.role` field, there are: 
* `Admin` is a kind of user which have most access to the API, it can access all the API. 
* `User` is kind of user which has limited access. By default all new registered user is a `User`


## Login Controller 

In this section we will created a login API using custom controller, the login API will require input `email` and `password` and returned JWT token with claim like below. 

```typescript
{ userId: <number>, role: "Admin" | "User" }
```

Above is our JWT claim, we store as least as info on it. Note that `role` field is a predefined field required by Plumier to get current login user role. 

Navigate to the `src/api/_shared` create a new file named `login-user.ts` then copy paste code below.

```typescript title="src/api/_shared/login-user.ts"
export interface LoginUser {
    userId: number,
    role: "User" | "Admin"
}
```

Above is the model represent the JWT token claim, we use `interface` instead of `class` because `LoginUser` is not an entity nor a model for specific controller which doesn't provide reflection information.

Next create a directory under `src/api` named `auth` then add file named `auth-controller.ts` then copy paste code below. 

```typescript title="src/api/auth/auth-controller.ts"
import { compare } from "bcryptjs"
import { sign } from "jsonwebtoken"
import { authorize, HttpStatus, HttpStatusError, route } from "plumier"
import { getManager } from "typeorm"

import { LoginUser } from "../_shared/login-user"
import { User } from "../user/user-entity"


export class AuthController {
    readonly userRepo = getManager().getRepository(User)

    @authorize.public()
    @route.post()
    async login(email: string, password: string) {
        const user = await this.userRepo.findOne({ email })
        if (!user || !await compare(password, user.password))
            throw new HttpStatusError(HttpStatus.UnprocessableEntity, 
                "Invalid username or password")
        return { 
            token: sign(<LoginUser>{ userId: user.id, role: user.role }, 
                process.env.PLUM_JWT_SECRET!) 
        }
    }
}
```

Code above provide login functionality `POST /auth/login` for user receives email and password and return JWT token for bearer authorization header. 

We used TypeORM repository to get user by email and compare if provided password is correct, if not then throw `HttpStatusError` with `UnprocessableEntity` which mean returned http status 422. 

Then the login action returned signed JWT token used `PLUM_JWT_SECRET`, note that `PLUM_JWT_SECRET` is a predefined env variable used by Plumier. 

Save above file and see if a new route generated on the Route Analysis Report like below 

```text {2}
Route Analysis Report
 1. AuthController.login(email, password)    -> Public POST   /api/v1/auth/login
 2. TypeORMControllerGeneric.list            -> Public GET    /api/v1/todos
 3. TypeORMControllerGeneric.save(data, ctx) -> Public POST   /api/v1/todos
 4. TypeORMControllerGeneric.get             -> Public GET    /api/v1/todos/:id
 5. TypeORMControllerGeneric.modify          -> Public PATCH  /api/v1/todos/:id
 6. TypeORMControllerGeneric.replace         -> Public PUT    /api/v1/todos/:id
 7. TypeORMControllerGeneric.delete(id, ctx) -> Public DELETE /api/v1/todos/:id
    ............ other routes ..............
```

Go back to the swagger ui we can try our login functionality like below



## Bind Current Login User 



## Authorize Route and Fields 

## Authorize Filters

## Custom Authorization Policy