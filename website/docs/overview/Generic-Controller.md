---
id: generic-controller
title: Generic Controller 
---

Generic controller is Plumier ability to serve a common CRUD functionality based on your entity objects (usually an ORM/ODM entity object) using predefined generic controllers. This feature take advantage of inheritance and reflection to create generic controller specific to the entity on the fly.

This is a strong opinionated feature that work only with specific ORM/ODM framework, but drastically increase productivity on creating CRUD API.

## Enable Facility

To use this functionalities you need to set the appropriate generic controller facility. Currently now Plumier only supported TypeORM and Mongoose (with Plumier mongoose helper) to support generic controller. To use it you need to setup the Plumier application like below.

```typescript title="TypeORM" {2,6,7}
import Plumier, { WebApiFacility } from "plumier"
import { TypeORMFacility, TypeORMGenericControllerFacility } from "@plumier/typeorm"

new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility())
    .set(new TypeORMGenericControllerFacility())
    .listen(8000)
```

Above is configuration required when using TypeORM, it will automatically creates generic controller on the fly based on entities. 

To use generic controller with Mongoose, you need to use `@plumier/mongoose` helper and configure the Plumier application like below

```typescript title="Mongoose" {2,6,7}
import Plumier, { WebApiFacility } from "plumier"
import { MongooseFacility, MongooseGenericControllerFacility } from "@plumier/mongoose"

new Plumier()
    .set(new WebApiFacility())
    .set(new MongooseFacility())
    .set(new MongooseGenericControllerFacility())
    .listen(8000)
```

## Routes Generator

After activated Plumier can generate routes by generic controller created for all registered entities


```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name:string

    @Column()
    email:string
}
```

Plumier will serve 6 routes for entities above with path name `/users` 

```
Route Analysis Report
1. TypeORMControllerGeneric.list       -> GET    /users
2. TypeORMControllerGeneric.save(data) -> POST   /users
3. TypeORMControllerGeneric.get(id)    -> GET    /users/:id
4. TypeORMControllerGeneric.modify     -> PATCH  /users/:id
5. TypeORMControllerGeneric.replace    -> PUT    /users/:id
6. TypeORMControllerGeneric.delete(id) -> DELETE /users/:id
```

## One to Many Relation

For one to many relation entity, Plumier will create an extra nested routes handles by special generic controller.

```typescript
@Entity()
export class User {
    
    /* ... other columns ... */

    @OneToMany(x => Log, x => x.user)
    logs:Log[]
}

@Entity()
export class Log {

    /* ... other columns ... */

    @ManyToOne(x => User, x => x.logs)
    user:User
}
```

Above code will serve total of 18 routes, with 3 main path name: 

| Path Name         | Description                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `/user`           | CRUD functionality for `User` entity                                             |
| `/logs`           | CRUD functionality for `Log` entity                                              |
| `/user/:pid/logs` | Nested CRUD functionality for `Log` entity. Used to access log by User Id `:pid` |

## One To One or Many To One Relation

Plumier will not generate extra routes for one-to-one or many-to-one property, instead plumier allows user to set their value by ID.

```typescript
@Entity()
export class Item {

    /* ... other columns ... */

    @ManyToOne(x => Category)
    category:Category
}
```

`category` field can be populated with its ID (string or number based on its data type)

```
POST /items HTTP/1.1
Host: localhost:8000
Content-Type: application/json

"{"
```




## How Its Works

The idea of Generic controller is quite simple. For example A generic controller implementation of TypeORM for CRUD API is like below 

```typescript 
class ControllerBase<T> {
    readonly repo = getManager().getRepository(< type of T >)

    @route.post("")
    save(data:T){
        return repo.insert(data)
    }

    @route.get(":id")
    get(id:number){
        return repo.findOne(id)
    }

    @route.put(":id")
    replace(id:number, data:T){
        return repo.update(id, data)
    }

    @route.delete(":id")
    delete(id:number){
        return repo.delete(id)
    }
}
```

Above is a simple implementation of generic controller, it has some basic CRUD function that directly uses TypeORM repository. We can use above generic controller to create CRUD API for entity below.

```typescript
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name:string

    @Column()
    email:string

    @Column()
    password:string

    @Column({ default: "User" })
    role: "User" | "Admin" | "SuperAdmin"
}
```

The implementation of user controller simply like below (no more implementation or configuration required).

```typescript 
class UsersController extends ControllerBase<User>{}
``` 

Plumier generates routes based on combination of controller name and action name, thats make controller inheritance is still allowed. Above code will make `UserController` inherit all the basic CRUD functionalities specific to `User` entity object, while keep maintain an independent endpoints.

| Action                             | Method | Path          | Description       |
| ---------------------------------- | ------ | ------------- | ----------------- |
| `ControllerBase.save(data)`        | POST   | `/users     ` | Create user       |
| `ControllerBase.get(id)`           | GET    | `/users/:id ` | Read user by ID   |
| `ControllerBase.replace(id, data)` | PUT    | `/users/:id ` | Update user by ID |
| `ControllerBase.delete(id)`        | DELETE | `/users/:id ` | Delete user by ID |

:::info
TypeScript implement generic type erasure, its mean generic type information erased after transpilation. IF you are curious how Plumier able to retrieve metadata information of generic class, see [here](https://github.com/plumier/tinspector#inspect-generic-class-information) how to setup the generic class for reflection.
:::


