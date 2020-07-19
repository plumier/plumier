---
id: create-restful-api
title: Create Restful API
---

> **Info**  
> This is the forth part of 10 steps tutorial on creating basic SQL restful API. Check navigation to navigate to other steps.

Plumier provided flexible routing that make creating restful route easy. In this section we will create several routes that follow restful api best practice. We will keep all the routes accessible by public for now, in next tutorial we will add authentication and authorization for them.

## Configure Knex
Before we start creating routes we need to configure Knex.js that will manage the connections to the database. Navigate to `model` directory and add file named `db.ts` and write code below

```typescript
import knex from "knex"

export const db = knex({
    client: "mysql2",
    connection: process.env.DB_URI
})
```

Above code we created `db` function with preconfigured knex instance. Knex.js will manage the connection pool and the creation of the connection automatically

## Create Controller for Restful API
We are ready to program controllers now, we will create two controllers to handle users related routes and todos related routes.

We will put all controllers inside `controller/api/v1` directory to get extra `/api/v1` path before each of generated routes, read more about [Directory Convention](/docs/refs/route#directory-convention). 

Navigate to `controller/api/v1` directory and remove the `example-api.ts`. Create two files inside `v1` directory named `users-controller.ts` and `todos-controller.ts`

### Todos Controller
Open created `todos-controller.ts` file and write code below:

```typescript
import { route } from "plumier"

import { db } from "../../../model/db"
import { Todo } from "../../../model/domain"


export class TodosController {
    
    // POST /api/v1/todos
    @route.post("")
    save(data: Todo) {
        return db("Todo").insert(data)
    }

    // GET /api/v1/todos?offset=<number>&limit=<number>
    @route.get("")
    list(offset: number, limit: number) {
        return db("Todo").where({deleted: 0})
            .offset(offset).limit(limit)
            .orderBy("createdAt", "desc")
    }

    // GET /api/v1/todos/:id
    @route.get(":id")
    get(id: number) {
        return db("Todo").where({ id }).first()
    }

    // PUT /api/v1/todos/:id
    @route.put(":id")
    modify(id: number, data: Todo) {
        return db("Todo").update(data).where({ id })
    }

    // DELETE /api/v1/todos/:id
    @route.delete(":id")
    delete(id: number) {
        return db("Todo").update({ deleted: true }).where({ id })
    } 
}
```

Above controller has five methods that will handle http requests described by the comment above of each method. Each method uses Knex.js query builder to interact with database. 

> **Features Note**: We're not provided any security implicitly on above controller but Plumier already done some validation, type conversion and simple sanitation for malformed user input. Knex.js will help us to do some prevention against sql injection. See [testing validation](#testing-validation) at the end of this section

### User Controller 
Open the `users-controller.ts` file and type code below:

```typescript
import bcrypt from "bcrypt"
import { route } from "plumier"

import { db } from "../../../model/db"
import { User } from "../../../model/domain"

export class UsersController {
    
    // POST /api/v1/users
    @route.post("")
    async save(data: User) {
        const password = await bcrypt.hash(data.password, 10)
        return db("User").insert({ ...data, password, role: "User" })
    }

    // GET /api/v1/users?offset=<number>&limit=<number>
    @route.get("")
    list(offset: number, limit: number) {
        return db("User").where({deleted: 0})
        .offset(offset).limit(limit)
        .orderBy("createdAt", "desc")
    }

    // GET /api/v1/users/:id
    @route.get(":id")
    get(id: number) {
        return db("User").where({ id }).first()
    }

    // PUT /api/v1/users/:id
    @route.put(":id")
    async modify(id: number, data: User) {
        const password = await bcrypt.hash(data.password, 10)
        return db("User").update({...data, password}).where({ id })
    }

    // DELETE /api/v1/users/:id
    @route.delete(":id")
    delete(id: number) {
        return db("User").update({ deleted: 1 }).where({ id })
    }
}
```

Above controller look the same as the previous todos controller, except we add logic to hash user password before saved to database. Save both file and check Visual Studio Code integrated terminal where you execute the start script, If no compile error it will print messages below

```bash
[INFO] 14:52:01 Restarting: /Users/ktutnik/Documents/todo-sql-backend/src/controller/auth-controller.ts has been modified
Using ts-node version 8.0.2, typescript version 3.3.3333
Debugger listening on ws://127.0.0.1:9229/51d0e0f9-7589-4376-bb07-f0cde4a0bea4
For help, see: https://nodejs.org/en/docs/inspector

Route Analysis Report
 1. TodosController.save(data, user)    -> POST   /api/v1/todos
 2. TodosController.list(offset, limit) -> GET    /api/v1/todos
 3. TodosController.get(id)             -> GET    /api/v1/todos/:id
 4. TodosController.modify(id, data)    -> PUT    /api/v1/todos/:id
 5. TodosController.delete(id)          -> DELETE /api/v1/todos/:id
 6. UsersController.save(data)          -> POST   /api/v1/users
 7. UsersController.list(offset, limit) -> GET    /api/v1/users
 8. UsersController.get(id)             -> GET    /api/v1/users/:id
 9. UsersController.modify(id, data)    -> PUT    /api/v1/users/:id
10. UsersController.delete(id)          -> DELETE /api/v1/users/:id
11. HomeController.index()              -> GET    /

Server running http://localhost:8000/
```

Above message showing that Plumier generates 11 routes and 10 of them is the API we created using two controllers above.

## Testing
Our todo restful api backend is ready for testing, we will use [HTTPie](https://httpie.org/#installation) to test from command line.

Open Visual Studio Code integrated terminal and execute commands below:

```bash
$ http POST :8000/api/v1/users email=john.doe@gmail.com password=123456 name="John Doe"
```

Above command will add a new user to the database. Code above will return the id of the new added user. Use the returned id to test the other routes.

```bash
# get user by id
$ http :8000/api/v1/users/1

# get all users
$ http ":8000/api/v1/users?offset=0&limit=50"

# modify user by id
$ http PUT :8000/api/users/1 name="John Unknown Doe" email=john.doe@gmail.com password=123456 role="Admin"

# create one more user to delete 
$ http POST :8000/api/v1/users email=john.doe@gmail.com password=123456 name="John Doe"

# delete user by id, use id from result of above command
$ http DELETE :8000/api/v1/users/<last added id>
```

Try experimenting using above commands to remove and modify users. 
Below is commands to test todo routes

```bash
# add new todo
$ http POST :8000/api/v1/todos todo="Buy some milks" userId=2

# get todo by id
$ http :8000/api/v1/todos/1

# get all todos
$ http ":8000/api/v1/todos?offset=0&limit=50"

# modify todo by id
$ http PUT :8000/api/todos/1 todo="Buy some papers" userId=2

# delete todo by id
$ http DELETE :8000/api/v1/todos/1
```

## Testing Validation
We tested our API using good user input, lets test our application using bad user data below

```bash
# test add user without email (email is required)
$ http POST :8000/api/v1/users password=123456 name="John Doe"
# test using invalid email
$ http POST :8000/api/v1/users email="invalid email" password=123456 name="John Doe"
# test using invalid data type
$ http POST :8000/api/v1/todos todo="Buy some milks" userId="invalid user" 
```

Above command will return validation error with http status 422 and conversion error 400. 