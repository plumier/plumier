---
id: generic-controller
title: Generic Controller
---

Generic controller takes advantage of reflection and inheritance to automatically create CRUD API based on ORM/ODM entities. Plumier provided functionalities for first class entity that make it possible to control CRUD API function and behavior from entities. 

## Enable Functionality 
Generic controller supported TypeORM and Mongoose (with Plumier mongoose helper) entities to transform into CRUD API handled by generic controller implementation. Enable the generic controller by installing the `TypeORMFacility` or `MongooseFacility` on the Plumier application. 

```typescript
import Plumier, { WebApiFacility } from "plumier"
import { TypeORMFacility } from "@plumier/typeorm"

new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility())
    .set(new ControllerFacility({ controller: "<entities path or glob>" }))
```

Or if you are using mongoose helper like below

```typescript
import Plumier, { WebApiFacility } from "plumier"
import { MongooseFacility } from "@plumier/mongoose"

new Plumier()
    .set(new WebApiFacility())
    .set(new MongooseFacility())
    .set(new ControllerFacility({ controller: "<entities path or glob>" }))
```

Above facilities is a common facility used if you are using TypeORM or Mongoose with Plumier. In context of generic controller above facilities will normalize entities to make it ready used by generic controller helpers. 

## Mark Entity Handled by Generic Controller 
After installing facility above you need to mark specific entity that will be generated into CRUD API with `@route.controller()` like below: 

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@route.controller()
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    email: string

    @Column()
    name: string
}
``` 

Or if you using Mongoose helper 

```typescript
import { collection } from "@plumier/mongoose"
import { route } from "plumier"

@route.controller()
@collection()
class User {
    constructor(
        public id: string,
        public email: string,
        public name: string
    ){}
}
``` 

Above code will generate six routes handled by generic controller implementation. 

| Method | Route                                     | Description                                     |
| ------ | ----------------------------------------- | ----------------------------------------------- |
| POST   | `/users`                                  | Add new user                                    |
| GET    | `/users/:id?select`                       | Get user by ID                                  |
| PUT    | `/users/:id`                              | Replace user by ID (required validation used)   |
| PATCH  | `/users/:id`                              | Modify user by ID (required validation ignored) |
| DELETE | `/users/:id`                              | Delete user by ID                               |
| GET    | `/users?limit&offset&filter&select&order` | Get list of users                               |


'''info
Swagger supported generic controller, since its just a common controller with a generic signature (make sure to enable the swagger functionality by installing `SwaggerFacility`).
'''

## Getting and Saving Simple Relation 

Relational data with single value (one to one or many to one) by default will be populated on each request. For example if we have entity below: 

```typescript
@route.controller()
@Entity()
class Address {
    
    /** other columns **/

    @Column()
    city:string

    @Column()
    address:string
}

@route.controller()
@Entity()
class User {
    
    /** other columns **/

    @Column()
    email:string

    @OneToOne(x => Address)
    address:Address
}
```

Above code generates 6 routes for each `/address` and `/users`. `User` entity contains relation property to `Address` entity which is a one to one relation. Issuing `GET /users/:id` will automatically populate the address, thus the response will be like below

```json
{
    "email": "john.doe@gmail.com",
    // full address object populated
    "address": {
        "city": "Badung",
        "address": "Jl Surapati No. 19 Kuta" 
    }
}
```

While `GET /users/:id` returns the full address object, saving address (POST, PUT, PATCH) only require the ID of the address like below 

```json
POST /users/123 

{
    "email": "john.doe@gmail.com",
    "address": 456 //<-- address ID
}
```

## Getting and Saving Array Relation 

For array relation (one to many relation), Plumier provide a nested route to easily perform CRUD operation on child relation. 

```typescript
@Entity()
class User {
    
    /** other columns **/

    @Column()
    name:string

    @route.controller()
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}

@Entity()
class Email {
    
    /** other columns **/

    @Column()
    email:string

    @Column()
    description:string

    @ManyToOne(x => User, x => x.emails)
    user:User
}
```

Above code showing that we apply `@route.controller()` on the `User.emails` relation. Using this setup will make Plumier generate a nested routes like below 

| Method | Route                                                 | Description                |
| ------ | ----------------------------------------------------- | -------------------------- |
| POST   | `/users/:pid/emails`                                  | Add new user's email       |
| GET    | `/users/:pid/emails/:id?select`                       | Get user's email by ID     |
| PUT    | `/users/:pid/emails/:id`                              | Replace user's email by ID |
| PATCH  | `/users/:pid/emails/:id`                              | Modify user's email by ID  |
| DELETE | `/users/:pid/emails/:id`                              | Delete user's email by ID  |
| GET    | `/users/:pid/emails?limit&offset&filter&select&order` | Get list of user's email   |


## Filters 
Generic controller provided filter query string to narrow API response. To be able to filter specific field, the appropriate property needs to be authorized. 

```typescript {10,14}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@route.controller()
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number

    // filter with exact comparison (no parameter specified)
    @authorize.filter()
    @Column()
    email: string

    // filter with partial comparison (LIKE)
    @authorize.filter({ type: "partial" })
    @Column()
    name: string
}
``` 

Using above code enabled us to query the response result like below 

```
# filter by email
GET /users?filter[email]=john.doe@gmail.com

# filter by name, will return all users name start with john
GET /users?filter[name]=john%

# combine both filter, will return with AND operator
GET /users?filter[email]=john.doe@gmail.com&filter[name]=john%
```

### Restrict Access To Filter 

In some case you may provided filter that is sensitive to some user, for example in `Item` entity, the `basePrice` is sensitive to a common user but should be filter able by admin. 

```typescript {10,14}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@route.controller()
@Entity()
class Item {
    @PrimaryGeneratedColumn()
    id: number
    
    // filter with partial comparison (LIKE)
    @authorize.filter()
    @Column()
    name: string

    // exact filter, only allowed for Admin
    @authorize.filter("Admin")
    @Column()
    basePrice:number
    
    @Column()
    price:number
}
``` 

Using above code, only user with role `Admin` can access `GET /items?filter[basePrice]=200` other user fill get 401.


## Query Strings

Both get by id and get list route has some extra query string to manipulate the response match your need. 

| Query String | Example                                            | Default        | Description                                     |
| ------------ | -------------------------------------------------- | -------------- | ----------------------------------------------- |
| `select`     | `GET /users?select=name,email,dob`                 | All properties | Select properties to include in JSON response   |
| `limit`      | `GET /users?limit=20`                              | 50             | Limit number of records returned in response    |
| `offset`     | `GET /users?offset=3`                              | 0              | Offset of the record set returned in response   |
| `filter`     | `GET /users?filter[name]=john&filter[active]=true` | -              | Find records by property using exact comparison |
| `order`      | `GET /users?order=-createdAt,name`                 | -              | Order by properties, `-` for descending order   |

Above query string supported by generic controller and nested generic controller. 

### Get By ID 
Get by ID for generic controller and nested generic controller supported `select` query string like below 

```
GET /users/:id?select=name,email,dob
GET /users/:pid/pets/:id?select=name,active,dob
```

### Get List 
Get list supported all the query string, it can be combined in single request 

```
GET /users?select=name,email,dob&filter[email]=john.doe@gmail.com&order=-createdAt,name&offset=5
GET /users/:pid/pets/:id?select=name,dob&filter[name]=bingo&order=-createdAt,name&offset=5
```

## Custom Path Name

Plumier provide a default route path name based on entity name (pluralized), you can specify a new path name by provide it on the `@route.controller()` parameter. 

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@route.controller("user-data/:uid")
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    email: string

    @Column()
    name: string
}
``` 

Above code showing that we specify custom path name `user-data/:uid`, it will generate routes like below

| Method | Route                                         | Description                                     |
| ------ | --------------------------------------------- | ----------------------------------------------- |
| POST   | `/user-data`                                  | Add new user                                    |
| GET    | `/user-data/:uid`                             | Get user by ID                                  |
| PUT    | `/user-data/:uid`                             | Replace user by ID (required validation used)   |
| PATCH  | `/user-data/:uid`                             | Modify user by ID (required validation ignored) |
| DELETE | `/user-data/:uid`                             | Delete user by ID                               |
| GET    | `/user-data?limit&offset&filter&select&order` | Get list of users                               |

For nested generic controller you need to specify ID for parent and the child 

```typescript
@Entity()
class User {
    
    /** other columns **/

    @route.controller("user-data/:uid/email-data/:eid")
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}
```

Above code will generate routes below 

| Method | Route                                                         | Description                |
| ------ | ------------------------------------------------------------- | -------------------------- |
| POST   | `/user-data/:uid/email-data`                                  | Add new user's email       |
| GET    | `/user-data/:uid/email-data/:eid`                             | Get user's email by ID     |
| PUT    | `/user-data/:uid/email-data/:eid`                             | Replace user's email by ID |
| PATCH  | `/user-data/:uid/email-data/:eid`                             | Modify user's email by ID  |
| DELETE | `/user-data/:uid/email-data/:eid`                             | Delete user's email by ID  |
| GET    | `/user-data/:uid/email-data?limit&offset&filter&select&order` | Get list of user's email   |


## Control Access To The Entity Properties 

Plumier provide functionality to protect your data easily, you can use `@authorize` decorator to authorize user to write or read your entity property. 

'''info
Refer to [Authorization](Authorization.md) on how to setup user authorization on your Plumier application 
'''

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, authorize } from "plumier"

@route.controller()
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    email: string

    @authorize.writeonly()
    @Column()
    password: string

    @Column()
    name: string

    @authorize.write("SuperAdmin", "Admin")
    @Column()
    role: "SuperAdmin" | "Admin" | "User"
}
```

Above code showing that we apply `@authorize` decorator on `password` and `role` property which contains sensitive data. Using above configuration `password` will not be visible on any response, and `role` only can be set by `SuperAdmin` and `Admin`. Below list of authorization you can use to protect property of the entity

| Decorator                        | Description                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `@authorize.role("SuperAdmin")`  | Protect property can be read and write by specific role (`SuperAdmin`)                  |
| `@authorize.write("SuperAdmin")` | Protect property only can be write by specific role (`SuperAdmin`)                      |
| `@authorize.read("SuperAdmin")`  | Protect property only can be read by specific role (`SuperAdmin`)                       |
| `@authorize.readonly()`          | Protect property only can be read and no other role can write it                        |
| `@authorize.writeonly()`         | Protect property only can be write and no other role can read it                        |
| `@authorize.custom()`            | Protect property using [custom authorizer function](../extends/Custom-Authorization.md) |


## Generic Controller Signatures

Before we moving forward on how to secure generated routes, we will take a look at the generic controller signatures. Understanding of the generic controller signature is required to be able to secure route generated by generic controller that will be explained next. 

Plumier provided two generic controller base class that will be inherited by ORM/ODM helper, there are `RepoBaseControllerGeneric<T, TID>` and `RepoBaseOneToManyControllerGeneric<P, T, PID, TID>`. 

```typescript
class RepoBaseControllerGeneric<T, TID> implements ControllerGeneric<T, TID>{
    // GET /entity-name?offset&limit&filter&order
    @route.get("")
    list(offset: number = 0, limit: number = 50, filter:T, order:string): Promise<T[]> {}

    // POST /entity-name
    @route.post("")
    save(data: T): Promise<IdentifierResult<TID>> {}

    // GET /entity-name/:id
    @route.get(":id")
    get(id: TID): Promise<T> {}

    // PATCH /entity-name/:id
    @route.patch(":id")
    modify(id: TID, data: T): Promise<IdentifierResult<TID>> {}

    // PUT /entity-name/:id
    @route.put(":id")
    replace(id: TID, data: T): Promise<IdentifierResult<TID>> {}

    // DELETE /entity-name/:id
    @route.delete(":id")
    delete(id: TID): Promise<IdentifierResult<TID>> {}
}
```

Above showing signature of the generic controller, some decorators removed to make the signature cleaner. 

```typescript
class RepoBaseOneToManyControllerGeneric<P, T, PID, TID> implements OneToManyControllerGeneric<P, T, PID, TID>{
    // GET /entity-name/:pid/relation-name?offset&limit&filter&order
    @route.get("")
    async list(pid: PID, offset: number = 0, limit: number = 50, filter:T, order:string): Promise<T[]> {}

    // POST /entity-name/:pid/relation-name
    @route.post("")
    async save(pid: PID, data: T, ctx: Context): Promise<IdentifierResult<TID>> {}

    // GET /entity-name/:pid/relation-name/:id
    @route.get(":id")
    async get(pid: PID, id: TID): Promise<T> {}

    // PATCH /entity-name/:pid/relation-name/:id
    @route.patch(":id")
    async modify(pid: PID, id: TID, @val.partial("T") data: T, ctx: Context): Promise<IdentifierResult<TID>> {}

    // PUT /entity-name/:pid/relation-name/:id
    @route.put(":id")
    async replace(pid: PID, id: TID, data: T, ctx: Context): Promise<IdentifierResult<TID>> {}

    // DELETE /entity-name/:pid/relation-name/:id
    @route.delete(":id")
    async delete(pid: PID, id: TID): Promise<IdentifierResult<TID>> {}
}
```

By looking at above signature now you understand that each route handled by controller methods named: `list`, `save`, `get`, `modify`, `replace`, `delete`. Knowing this method names is required to authorize the generated routes.

## Control Access To The Generated Routes 

You can specify `@authorize` decorator on the entity class (above the class definition), which will automatically copied into the generated controller. Further more you can specify `applyTo` option on the decorator to apply authorization to specific generic controller method. 

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, authorize } from "plumier"

@authorize.role("SuperAdmin", "Admin", { applyTo: ["save", "delete", "replace", "modify" ] })
@route.controller()
@Entity()
class User {
    
    /** properties / columns */

}
```

Above code showing that we apply `@authorize.role()` decorator on the `User` entity, during route generation process it will be copied into the generic controller. Option parameter `applyTo` will tell the reflection library to apply authorize decorator into specific generic controller methods which is name: `save`, `delete`, `replace` `modify`. Using above configuration the result of the 

| Action    | Method | Route                                     | Access            |
| --------- | ------ | ----------------------------------------- | ----------------- |
| `save`    | POST   | `/users`                                  | SuperAdmin, Admin |
| `get`     | GET    | `/users/:id`                              | Any user          |
| `replace` | PUT    | `/users/:id`                              | SuperAdmin, Admin |
| `modify`  | PATCH  | `/users/:id`                              | SuperAdmin, Admin |
| `delete`  | DELETE | `/users/:id`                              | SuperAdmin, Admin |
| `list`    | GET    | `/users?limit&offset&filter&select&order` | Any user          |


For nested routes (one to many relation) you can define `@authorize` decorator on the property relation like below 

```typescript
@Entity()
class User {
    
    /** other columns **/

    @route.controller()
    @authorize.role("SuperAdmin", "Admin", { applyTo: ["save", "delete", "replace", "modify" ] })
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}
```

Using above configuration the route access now is like below 

| Action    | Method | Route                                                 | Access            |
| --------- | ------ | ----------------------------------------------------- | ----------------- |
| `save`    | POST   | `/users/:pid/emails`                                  | SuperAdmin, Admin |
| `get`     | GET    | `/users/:pid/emails/:id`                              | Any user          |
| `replace` | PUT    | `/users/:pid/emails/:id`                              | SuperAdmin, Admin |
| `modify`  | PATCH  | `/users/:pid/emails/:id`                              | SuperAdmin, Admin |
| `delete`  | DELETE | `/users/:pid/emails/:id`                              | SuperAdmin, Admin |
| `list`    | GET    | `/users/:pid/emails?limit&offset&filter&select&order` | Any user          |

## Ignore Some Routes 

In some case you may want to hide specific route generated. Use the `@route.ignore()` with the `applyTo` property to disable route being generated 

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@route.ignore({ applyTo: [ "delete", "replace", "modify" ] })
@route.controller()
@Entity()
class User {
    
    /** properties / columns */

}
```

Using above configuration, method that specified on the `applyTo` option will be ignored during route generation. Above code will produce 

| Action | Method | Route                                     |
| ------ | ------ | ----------------------------------------- |
| `save` | POST   | `/users`                                  |
| `get`  | GET    | `/users/:id`                              |
| `list` | GET    | `/users?limit&offset&filter&select&order` |

It also can be applied on the entity relation (one to many) to ignore some nested routes like below 


```typescript
@Entity()
class User {
    
    /** other columns **/

    @route.controller()
    @route.ignore({ applyTo: [ "delete", "replace", "modify" ] })
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}
```

Above code showing that we applied the ignore decorator on the entity relation, it will produce

| Action | Method | Route                                                 |
| ------ | ------ | ----------------------------------------------------- |
| `save` | POST   | `/users/:pid/emails`                                  |
| `get`  | GET    | `/users/:pid/emails/:id`                              |
| `list` | GET    | `/users/:pid/emails?limit&offset&filter&select&order` |

## Request Hook

Request hook enables entity to have a method contains piece of code that will be executed during request. Request hook has some simple rule
* It executed before or after the entity saved into the database, use decorator `@preSave()` and `@postSave()`
* It will be executed only on request with http method `POST`, `PUT`, `PATCH`. By default it will execute on those three http methods except specified on the parameter.
* It can be specified multiple request hooks on single entity
* It can have parameter with parameter binding
* It possible to bind ActionResult (execution result of the controller) on request hook `@postSave()`

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, preSave } from "plumier"
import bcrypt from "bcrypt"

@route.controller()
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    email: string

    @Column()
    name: string

    @Column()
    password: string

    @preSave()
    async hashPassword(){
        this.password = await bcrypt.hash(data.password, 10)
    }

    @postSave()
    async sendConfirmationEmail(){
        await mailer.sendTemplate("confirmation-email")
    }
}
``` 

Above code will hash password before the entity saved into the database. Request hook has parameter binding feature, you can `@bind` any request part into the hook parameter, it works exactly like common [Parameter Binding](Parameter-Binding.md) which also support name binding, model binding and decorator binding.

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, preSave } from "plumier"
import bcrypt from "bcrypt"

@route.controller()
@Entity()
class User {
    
    /** other properties **/

    @preSave()
    async hook(@bind.ctx() ctx:Context){
        // ctx will contains context
    }

    @postSave("put", "patch")
    async postHook(@bind.actionResult() result:ActionResult){
        // result contains execution result of the controller
    }
}
``` 

Its possible to specify in which http method should the hook executed by specify http method on the request hook parameter

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, preSave } from "plumier"
import bcrypt from "bcrypt"

@route.controller()
@Entity()
class User {
    
    /** other properties **/

    @preSave("put", "patch")
    async hook(){
        // this only executed on PUT and PATCH http method before entity saved
    }

    @postSave("put", "patch")
    async postHook(){
        // this only executed on PUT and PATCH http method after entity saved
    }
}
``` 

## Use Custom Generic Controller 

When the default generic controller doesn't match your need, you can provide your own custom generic controllers. For example the default generic controller for `DELETE` method is delete the records permanently. You can override this function by provide a new generic controller inherited from your ORM/ODM helper: 

| Generic Controller                                   | Package           | Description                                            |
| ---------------------------------------------------- | ----------------- | ------------------------------------------------------ |
| `TypeORMControllerGeneric<T, TID>`                   | @plumier/typeorm  | TypeORM generic controller implementation              |
| `TypeORMOneToManyControllerGeneric<P, T, PID, TID>`  | @plumier/typeorm  | TypeORM One To Many generic controller implementation  |
| `MongooseControllerGeneric<T, TID>`                  | @plumier/mongoose | Mongoose generic controller implementation             |
| `MongooseOneToManyControllerGeneric<P, T, PID, TID>` | @plumier/mongoose | Mongoose One To Many generic controller implementation |

Then create a new generic controller for both based on any of above generic controller like below 

```typescript 
import {TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric} from "@plumier/typeorm"

@generic.template("T", "TID")
@generic.type("T", "TID")
export class CustomControllerGeneric<T, TID> extends TypeORMControllerGeneric<T, TID> {
    delete(id: TID, ctx: Context) {
        return this.modify(id, { deleted: true } as any, ctx)
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
export class CustomOneToManyControllerGeneric<P, T, PID, TID> extends TypeORMOneToManyControllerGeneric<P, T, PID, TID>{
    delete(pid: PID, id: TID, ctx: Context) {
        return this.modify(pid, id, { deleted: true } as any, ctx)
    }
}
```

Above is example of custom generic controllers for TypeORM, we simply used the `modify` method of the generic controller to flag `deleted` property of the entity as `true`.

Note that the `@generic.template()` and `@generic.type()` is required by the reflection library. 

Next, we need to register above custom generic controller on the Plumier application like below 

```typescript 
new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility())
    .set({
        genericController: [CustomControllerGeneric, CustomOneToManyControllerGeneric]
    })
```

Make sure you register the controller under the `TypeORMFacility` or `MongooseFacility` to take effect. 