---
id: securing-routes
title: Securing Routes
---

Like previously mentioned, after authorization applied on the Plumier application all route will be private, we need to define authorization for some route to only accessible to some users.

In this section we will set authorization to some route with specification below.

| Method           | Route                        | Authorize To   |
| ---------------- | ---------------------------- | -------------- |
| `GET`            | `/`                          | public         |
| `POST`           | `/auth/login`                | public         |
| `POST`           | `/api/v1/todos`              | Authenticated  |
| `GET`            | `/api/v1/todos/:id`          | Authenticated  |
| `PUT DELETE`     | `/api/v1/todos/:id`          | Admin or Owner |
| `GET`            | `/api/v1/todos?offset&limit` | Authenticated  |
| `POST`           | `/api/v1/users`              | public         |
| `PUT DELETE GET` | `/api/v1/users/:id`          | Admin or Owner |
| `GET`            | `/api/v1/users?offset&limit` | Admin          |

Note:
* **Admin**: only accessible to user with `Admin` role
* **Authenticated**: accessible by all login users `User` or `Admin` 
* **Owner**: accessible only to the owner of the data
* **Public**: accessible by all including non login user

Above authorization specification look not simple but required in common API specification. This section will teach how to increase code readability by using declarative authorization to do simple authorization and use declarative middleware to authorize route with complex authorization logic. 

## Authorize Home Controller
First step we add authorization to the `GET /` route. Open `home-controller.ts` file and add `@authorization.public()` above the `index` method

```typescript
import { route, authorize } from "plumier"

export class HomeController {
    @authorize.public() // <--- add this line
    @route.get("/")
    index() {
        return { hello: "world" }
    }
}
```

## Authorize Todos Controller
From specification, default authorization for `TodosController` is for authenticated user its mean we don't need to add extra authorization except for `PUT` and `DELETE` which authorized for Admin and Owner. Plumier doesn't provided handy authorization for such complex authorization but we can create custom authorization decorator using middleware.

### Create Custom Authorization Decorator

Navigate to `todo-controller.ts` file and add the following code before `TodosController` declaration. 

```typescript
import { HttpStatusError, middleware, route } from "plumier"

import { db } from "../../../model/db"
import { LoginUser, Todo } from "../../../model/domain"

function ownerOrAdmin() {
    return middleware.use({
        execute: async invocation => {
            const { state, parameters } = invocation.context
            const user: LoginUser = state.user;
            //parameters is requested method parameter values
            const id: number = parameters![0];
            const todo: Todo = await db("Todo").where({ id }).first()
            if (user.role === "Admin" || todo && todo.userId === user.userId)
                return invocation.proceed()
            else
                throw new HttpStatusError(401, "Unauthorized")
        }
    })
}
```

Middleware above is specific to Todo data so we put it in the same file with the todos controller. It returns `middleware.use` so it can be applied declaratively as decorator. 

The logic of the middleware is quite simple, we query the database based on provided `id` and check if current user role is `Admin` or the requested todo owner match with current login user id, if not match then throw `HttpStatusError`. 

Note that this middleware uses `parameters[0]` as `id` so basically this middleware only can be applied to a method with signature `method(id:number, ...)` like `modify(id, data)` and `delete(id)`

### Apply Authorization Decorator
Now we ready to apply our custom authorization to the `PUT` and `DELETE` handler by putting `@ownerOrAdmin()` above the `delete` and `modify` method like below

```typescript
export class TodosController {

    // .... other methods

    @ownerOrAdmin() // <-- add this line
    @route.put(":id")
    modify(id: number, data: Todo) {
        // implementation
    }

    @ownerOrAdmin() // <-- add this line
    @route.delete(":id")
    delete(id: number) {
        // implementation
    }
}
```

Above showing our authorization decorator applied on method `delete` and `modify`. Using above technique we apply authorization while keep method implementation clean.

## Authorize Users Controller
Users controller mostly have the same authorization with todos controller but we can't apply our custom authorization decorator created for todos controller into users controller because it pointed to different database table. We need to create another custom authorization decorator.

### Create Custom Authorization Decorator
Navigate to `users-controller.ts` file and add the following code before `UsersController` declaration.

```typescript
import { HttpStatusError, middleware } from "plumier"

import { db } from "../../../model/db"
import { LoginUser, User } from "../../../model/domain"


function ownerOrAdmin() {
    return middleware.use({
        execute: async invocation => {
            const { state, parameters } = invocation.context
            //if no user then proceed. 
            //this condition applied to public route POST /api/v1/users
            if(!state.user) return invocation.proceed()
            const loginUser: LoginUser = state.user;
            const id: number = parameters![0];
            const reqUser: User = await db("User").where({ id }).first()
            if (loginUser.role === "Admin" || reqUser && reqUser.id === loginUser.userId)
                return invocation.proceed()
            else
                throw new HttpStatusError(401, "Unauthorized")
        }
    })
}
```

Middleware above relatively has the same logic with the previous one, except it check to existence of `user`. This logic will be used when we access `POST /api/v1/users` which will be set to accessible for public.

### Apply Authorization Decorator
Next we ready to apply our custom authorization decorator into users controller. Go to `UserController` file and do modification like below


```typescript 
export class UsersController {

    @authorize.public() // <--- add this line
    @route.post("")
    async save(data: User) {
        //implementation
    }

    @authorize.role("Admin") // <--- add this line
    @route.get("")
    list(offset: number, limit: number) {
        //implementation
    }

    @ownerOrAdmin() // <--- add this line
    @route.get(":id")
    get(id: number) {
        //implementation
    }

    @ownerOrAdmin() // <--- add this line
    @route.put(":id")
    async modify(id: number, data: User) {
        //implementation
    }

    @ownerOrAdmin() // <--- add this line
    @route.delete(":id")
    delete(id: number) {
        //implementation
    }
}
```