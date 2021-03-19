---
id: generic-controller
title: Generic Controller
---

Generic controller is a common Plumier controller with generic type signature, it take advantage of inheritance to possibly serve CRUD API based on ORM entity. 

## Enable Functionality 

Generic controller supported TypeORM and Mongoose (with Plumier mongoose helper) entities. Enable the generic controller by installing the `TypeORMFacility` or `MongooseFacility` on the Plumier application. 

```typescript {6,7}
import Plumier, { WebApiFacility } from "plumier"
import { TypeORMFacility } from "@plumier/typeorm"

new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility())
    .set(new ControllerFacility({ controller: "<entities path or glob>" }))
```

Or if you are using mongoose helper like below

```typescript {6,7}
import Plumier, { WebApiFacility } from "plumier"
import { MongooseFacility } from "@plumier/mongoose"

new Plumier()
    .set(new WebApiFacility())
    .set(new MongooseFacility())
    .set(new ControllerFacility({ controller: "<entities path or glob>" }))
```

Above facilities is a common facility used if you are using TypeORM or Mongoose with Plumier. In context of generic controller above facilities will normalize entities to make it ready used by generic controller helpers. 

## Mark Entity Handled by Generic Controller 
After installing facility above you need to mark specific entity that will be generated into CRUD API with `@genericController()` like below: 

```typescript {4}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@genericController()
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

```typescript {4}
import { collection } from "@plumier/mongoose"
import { route } from "plumier"

@genericController()
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

| Method | Route               | Description                                                     |
| ------ | ------------------- | --------------------------------------------------------------- |
| POST   | `/users`            | Add new user                                                    |
| GET    | `/users/:id?select` | Get user by ID                                                  |
| PUT    | `/users/:id`        | Replace user by ID (required validation used)                   |
| PATCH  | `/users/:id`        | Modify user by ID (required validation ignored)                 |
| DELETE | `/users/:id`        | Delete user by ID                                               |
| GET    | `/users`            | Get list of users with pagination, order, filter and projection |


'''info
Its possible to create a generic controller using generic controller factory instead of using decorator, below code will result the same. 

```typescript
const UserController = createGenericController(User)
// UserController is a valid controller class
export UserController
```
'''

## Getting and Saving Simple Relation 

Relational data with single value (one to one or many to one) by default will be populated on each request. For example if we have entity below: 

```typescript {24}
@genericController()
@Entity()
class Address {
    
    /** other columns **/

    @Column()
    city:string

    @Column()
    address:string
}

@genericController()
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

```typescript {9}
@Entity()
class User {
    
    /** other columns **/

    @Column()
    name:string

    @genericController()
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

Above code showing that we apply `@genericController()` on the `User.emails` relation. Using this setup will make Plumier generate a nested routes like below 

| Method | Route                           | Description                                                         |
| ------ | ------------------------------- | ------------------------------------------------------------------- |
| POST   | `/users/:pid/emails`            | Add new user's email                                                |
| GET    | `/users/:pid/emails/:id?select` | Get user's email by ID                                              |
| PUT    | `/users/:pid/emails/:id`        | Replace user's email by ID                                          |
| PATCH  | `/users/:pid/emails/:id`        | Modify user's email by ID                                           |
| DELETE | `/users/:pid/emails/:id`        | Delete user's email by ID                                           |
| GET    | `/users/:pid/emails`            | Get list of user's emails with paging, filter, order and projection |

'''info
Its also possible to create a nested generic controller using generic controller factory, below code will result the same. 

```typescript
const UserEmailController = createGenericControllerNested(User, "emails")
// UserEmailController is a valid controller class
export UserEmailController
```
'''

## Inverse Property Population

If you are defined your one to many relation ORM configuration with inverse property, Generic controller will taking care of populating its value automatically. For example if you have ORM configuration like below. 

```typescript {7}
@Entity()
class User {
    
    /** other columns **/

    @genericController()
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}

@Entity()
class Email {
    
    /** other columns **/

    @ManyToOne(x => User, x => x.emails)
    user:User
}
```

Or if you are using mongoose helper like below

```typescript {7}
@collection()
class User {
    
    /** other columns **/

    @genericController()
    @collection.ref(x => [Email], "user")
    emails:Email[]
}

@Entity()
class Email {
    
    /** other columns **/

    @collection.ref(x => User)
    user:User
}
```

You're defined inverse property `user` on the one to many relation, it help Plumier to understand which property will automatically populated. So adding new email using `POST /users/{pid}/emails` will make `user` automatically populated with `pid` value, without having to provided on request body.

## Apply Multiple Decorators 
Its possible to apply multiple `@genericController()` decorator on entity or entity relation, but the generated route must be unique or the route generator static check will shows errors. 

For example on previous users -> email entity you may need to show `/users/:uid/emails` but you may also wants to enable API to list all emails `/emails` 

```typescript
@Entity()
class User {
    
    /** other columns **/

    @Column()
    name:string

    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}

@genericController(c => c.useNested(User, "emails"))
@genericController(c => c.methods("Delete", "GetOne", "Patch", "Post", "Put").ignore())
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

Above will generates 7 routes like below 

| Method | Route                           | Description                                                         |
| ------ | ------------------------------- | ------------------------------------------------------------------- |
| POST   | `/users/:pid/emails`            | Add new user's email                                                |
| GET    | `/users/:pid/emails/:id?select` | Get user's email by ID                                              |
| PUT    | `/users/:pid/emails/:id`        | Replace user's email by ID                                          |
| PATCH  | `/users/:pid/emails/:id`        | Modify user's email by ID                                           |
| DELETE | `/users/:pid/emails/:id`        | Delete user's email by ID                                           |
| GET    | `/users/:pid/emails`            | Get list of user's emails with paging, filter, order and projection |
| GET    | `/emails`                       | Get list of all emails                                              |

## Filters 
Generic controller provided filter query string to narrow API response. The query respects the `@authorize.read()` and `@authorize.writeonly()`. Its mean you will not able to query  

```typescript {11,16}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@genericController()
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number

    // name will be searchable by anyone (respect route authorization)
    @Column()
    name: string

    // authorize email field to be search able by admin
    @authorize.read("Admin")
    @Column()
    email: string
}
``` 

Using above code enabled us to query the response result using syntax string like below

```
# filter by email
GET /users?filter=email=john.doe@gmail.com

# or more readable using group
GET /users?filter=(email=john.doe@gmail.com)

# filter by name, will return all users name start with john
GET /users?filter=(name='john'*)

# combine both filter, will return with AND operator
GET /users?filter=(email=john.doe@gmail.com and name=john)
```

Several filter supported based on property data type, for more information see the [Query Language Specification](Query-Parser.md#query-language-specification)

## Delete Column 
By default when you perform `DELETE /users/{id}` it will delete the user record permanently from the database, You can specify the delete flag by providing `@entity.deleteColumn()` decorator above the flag property with `boolean` datatype like below.

```typescript {10}
import { entity } from "plumier"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    /** other properties **/

    @entity.deleteColumn()
    @Column({ default: false })
    deleted: boolean
}
```

Using above code when you request `DELETE /users/{id}` Plumier will set the `deleted` property into `true` automatically.

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

#### Get By ID 
Get by ID for generic controller and nested generic controller supported `select` query string like below 

```
GET /users/:id?select=name,email,dob
GET /users/:pid/pets/:id?select=name,active,dob
```

#### Get List 
Get list supported all the query string, it can be combined in single request 

```
GET /users?select=name,email,dob&filter[email]=john.doe@gmail.com&order=-createdAt,name&offset=5
GET /users/:pid/pets/:id?select=name,dob&filter[name]=bingo&order=-createdAt,name&offset=5
```

## Custom Path Name

Plumier provide a default route path name based on entity name (pluralized), you can specify a new path name by provide it on the `@genericController()` parameter. 

```typescript {4}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@genericController("user-data/:uid")
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

| Method | Route             | Description                                                 |
| ------ | ----------------- | ----------------------------------------------------------- |
| POST   | `/user-data`      | Add new user                                                |
| GET    | `/user-data/:uid` | Get user by ID                                              |
| PUT    | `/user-data/:uid` | Replace user by ID (required validation used)               |
| PATCH  | `/user-data/:uid` | Modify user by ID (required validation ignored)             |
| DELETE | `/user-data/:uid` | Delete user by ID                                           |
| GET    | `/user-data`      | Get list of users with paging, filter, order and projection |

For nested generic controller you need to specify ID for parent and the child 

```typescript {6}
@Entity()
class User {
    
    /** other columns **/

    @genericController("user-data/:uid/email-data/:eid")
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}
```

Above code will generate routes below 

| Method | Route                             | Description                                                        |
| ------ | --------------------------------- | ------------------------------------------------------------------ |
| POST   | `/user-data/:uid/email-data`      | Add new user's email                                               |
| GET    | `/user-data/:uid/email-data/:eid` | Get user's email by ID                                             |
| PUT    | `/user-data/:uid/email-data/:eid` | Replace user's email by ID                                         |
| PATCH  | `/user-data/:uid/email-data/:eid` | Modify user's email by ID                                          |
| DELETE | `/user-data/:uid/email-data/:eid` | Delete user's email by ID                                          |
| GET    | `/user-data/:uid/email-data`      | Get list of user's email with paging, filter, order and projection |

## Control Access To The Entity Properties 

Plumier provide functionality to protect your data easily, you can use `@authorize` decorator to authorize user to write or read your entity property. 

:::info
Refer to [Security](Security.md) on how to setup user authorization on your Plumier application 
:::

```typescript {13,20}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, authorize } from "plumier"

@genericController()
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

| Decorator                        | Description                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `@authorize.route("SuperAdmin")` | Protect route can be accessed by specific role (`SuperAdmin`)      |
| `@authorize.write("SuperAdmin")` | Protect property only can be write by specific role (`SuperAdmin`) |
| `@authorize.read("SuperAdmin")`  | Protect property only can be read by specific role (`SuperAdmin`)  |
| `@authorize.readonly()`          | Protect property only can be read and no other role can write it   |
| `@authorize.writeonly()`         | Protect property only can be write and no other role can read it   |


## Control Access To The Generated Routes 

You can specify authorization into specific generated route by providing more configuration on the `@genericController()` decorator.

```typescript {4}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, authorize } from "plumier"

@genericController(c => c.mutators().authorize("SuperAdmin", "Admin"))
@Entity()
class User {
    
    /** properties / columns */

}
```

Above code showing that we apply authorization to the `mutators()` http methods. `mutators()` is a syntax sugar to specify generic controller actions handled the `POST`, `PUT`, `PATCH` and `DELETE`. Using above configuration the result of the generated routes are like below

| Action    | Method | Route        | Access            |
| --------- | ------ | ------------ | ----------------- |
| `save`    | POST   | `/users`     | SuperAdmin, Admin |
| `get`     | GET    | `/users/:id` | Any user          |
| `replace` | PUT    | `/users/:id` | SuperAdmin, Admin |
| `modify`  | PATCH  | `/users/:id` | SuperAdmin, Admin |
| `delete`  | DELETE | `/users/:id` | SuperAdmin, Admin |
| `list`    | GET    | `/users`     | Any user          |

:::info
If no authorization specified, the default authorization for generated route is `Authenticated` means all authenticated user can access the route.
:::

For nested routes (one to many relation) you can define the same configuration like above.

```typescript {7}
@Entity()
class User {
    
    /** other columns **/

    @genericController()
    @authorize.route(c => c.mutators().authorize("SuperAdmin", "Admin"))
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}
```

Using above configuration the route access now is like below 

| Action    | Method | Route                    | Access            |
| --------- | ------ | ------------------------ | ----------------- |
| `save`    | POST   | `/users/:pid/emails`     | SuperAdmin, Admin |
| `get`     | GET    | `/users/:pid/emails/:id` | Any user          |
| `replace` | PUT    | `/users/:pid/emails/:id` | SuperAdmin, Admin |
| `modify`  | PATCH  | `/users/:pid/emails/:id` | SuperAdmin, Admin |
| `delete`  | DELETE | `/users/:pid/emails/:id` | SuperAdmin, Admin |
| `list`    | GET    | `/users/:pid/emails`     | Any user          |


## Ignore Some Routes 

In some case you may want to hide specific route generated. You can use the `ignore()` configuration to ignore specific methods

```typescript {4-8}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route } from "plumier"

@genericController(c => {
    c.put().ignore()
    c.patch().ignore()
    c.delete().ignore()
})
@Entity()
class User {
    
    /** properties / columns */

}
```

Above code showing that we specify the method one by one instead of using `mutators()` like the previous example. The result of the 

| Action | Method | Route        |
| ------ | ------ | ------------ |
| `save` | POST   | `/users`     |
| `get`  | GET    | `/users/:id` |
| `list` | GET    | `/users`     |

It also can be applied on the entity relation (one to many) to ignore some nested routes like below 


```typescript {6-10}
@Entity()
class User {
    
    /** other columns **/

    @genericController(c => {
        c.put().ignore()
        c.patch().ignore()
        c.delete().ignore()
    })
    @OneToMany(x => Email, x => x.user)
    emails:Email[]
}
```

Above code showing that we applied the ignore decorator on the entity relation, it will produce

| Action | Method | Route                    |
| ------ | ------ | ------------------------ |
| `save` | POST   | `/users/:pid/emails`     |
| `get`  | GET    | `/users/:pid/emails/:id` |
| `list` | GET    | `/users/:pid/emails`     |

## Transform Response
Its possible to transform the response result of the `GET` method using `transformer()` configuration. For example we have entities below

```typescript
@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    message: string

    @ManyToOne(x => User)
    user: User

    @ManyToOne(x => Todo)
    todo:Todo
}
```

You may want the response of `GET /users` only contains properties `id`, `message`, `userName` and `userPicture`, which `userName` and `userPicture` can be retrieved from `user` property. 

First you need to create the model of the transformed entity.

```typescript
export class CommentWithUser {
    @noop()
    id: number

    @noop()
    message: string

    @noop()
    userName: string

    @noop()
    userPicture: string
}
```

Then specify the transformation function using `transformer` configuration 

```typescript 
@genericController(c => {
    c.accessors().transformer(CommentWithUser, x => {
        return {
            id: x.id,
            message: x.message,
            userName: x.user.name,
            userPicture: x.user.picture
        }
    })
})
@Entity()
export class Comment {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    message: string

    @ManyToOne(x => User)
    user: User

    @ManyToOne(x => Todo)
    todo:Todo
}
```

Above code showing that we specify the `transformer` configuration, the first parameter is the target model then the second parameter is the transformation function. 

:::warning
When using response transform, the `select` query may still applied but the response will be based on what you returned in transform function.
:::

## Custom Query
Unlike transform response, with custom query you provide a custom database query for `getOne` and/or `getMany` method to get different response result than the default generic controller query provided. 

```typescript 
import { route } from "plumier"
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"
import { noop } from "@plumier/reflect"
// for mongoose use import { transformFilter } from "@plumier/mongoose"
import { transformFilter } from "@plumier/typeorm"

@genericController(c => {
    // custom query for GET /users/:id
    c.getOne().custom(UserDto, async ({ id }) => {
        const repo = getManager().getRepository(User)
        return repo.findOne(id, { select: ["email"] })
    })
    // custom query for GET /users
    c.getMany().custom([UserDto], async ({ limit, offset, filter }) => {
        const repo = getManager().getRepository(User)
        const where = transformFilter(filter)
        return repo.find({ take: limit, skip: offset, where, select: ["email"] })
    })
})
@Entity()
class User {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    email: string
    @Column()
    name: string
}
// the response will be like this 
class UserDto {
    @noop()
    email: string
}
```

Using above code you provide a custom query that will be used by the `GET /users/:id`. To override query of `GET /users` you can use the `getMany()` method instead of `getOne()`. 

Signature of the `custom` query method is like below 

`custom(responseType, queryCallback)` 

* `responseType` is the model used to generate schema of the response. This model used by Open API generator to generate response schema, and also used by response authorization. Important to note that the `@authorize.read()` on the entity will not take effect if you use different model than the entity, you need to decorate the appropriate property accordingly. 
* `queryCallback` is a function returned the database query, signature of the query callback is mostly the same for `getOne()` and `getMany()`, except the first parameter object, see below.

Query callback signature for `getOne()` and `getMany()` is like below 

`(param, ctx) => any` 

* `param` contains the action parameter such as `id`, `limit`, `offset` etc. The parameter is differ between `getOne()` and `getMany()`.
* `ctx` is the request context

## Entity Authorization Policy
Entity Authorization Policy (Entity Policy) is a custom [auth policy](Security.md#authorization) designed to secure entity data by ID. 

Entity policy requires unique combination between policy name and the entity type, the definition is like below.

```typescript
entityPolicy(ENTITY_CLASS)
    .register(POLICY_NAME, (auth:AuthorizationContext, id:any) => boolean)
```

* `ENTITY_CLASS` is the entity which authorization policy registered to.
* `POLICY_NAME` is the policy name, policy name may the same with other entity but must be unique when combined with entity class.
* Authorization callback is where you put the authorization logic, return `true` or `Promise<true>` to allow otherwise `false` to restrict.

Since the internal process of entity policy is quite complex, its a lot easier to understand entity policy from its implementation. For example we created an entity policy named `ResourceOwner` which means the current data is owned by the login user. Then its easy to understand that for entity `User`, the logic of `ResourceOwner` is when the provided ID by authorization callback is the same as the current login user ID like below. 

```typescript
// define policy for User entity
entityPolicy(User)
    // ResourceOwner is when current login user id is the same as current User id 
    .register("ResourceOwner", (auth, id) => auth.user?.userId === id)
```

This policy then can be applied on the generic controller configuration builder, to secure specific route like below.

```typescript {2}
@genericController(c => {
    c.delete().authorize("ResourceOwner")
})
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id:number

    @Column()
    email: string

    @Column()
    name: string
}
```

By using above configuration only the `ResourceOwner` of the User entity allowed to access `DELETE /users/{id}` route. By giving `DELETE /users/12345` only user with user ID `12345` allowed to access it. 

The policy also can be used to secure property using `@authorize.read()` or `@authorize.write()` like below.

```typescript {7}
@genericController()
@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id:number

    @authorize.read("ResourceOwner")
    @Column()
    email: string

    @Column()
    name: string
}
```

Above configuration will make `email` filed only visible (in response body) by the owner of user, this behavior applied when the `User` entity used as child property. 

#### Entity Policy Restriction

Since entity policy designed to secure resources by ID, its important to note that route authorization (defined with `@authorize.route()` or `ActionBuilder.authorize()`) and parameter authorization (`@authorize.write()`) only works on route with entity ID specified.

| Route                             | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `POST /users`                     | Not allowed, since no ID specified              |
| `DELETE /users/{id}`              | Allowed, Callback called with ID of User entity |
| `POST /users/{id}/logs`           | Allowed, Callback called with ID of User entity |
| `DELETE /users/{id}/logs/{logId}` | Allowed, Callback called with ID of Log entity  |

Important to note that response authorization (`@authorize.read()`) has no restriction, its mean it will always work on all routes.

## Request Hook

Request hook enables entity to have a method contains piece of code that will be executed during request. Request hook has some simple rule
* It executed before or after the entity saved into the database, use decorator `@preSave()` and `@postSave()`
* It will be executed only on request with http method `POST`, `PUT`, `PATCH`. By default it will execute on those three http methods except specified on the parameter.
* It can be specified multiple request hooks on single entity
* It can have parameter with parameter binding
* It possible to bind ActionResult (execution result of the controller) on request hook `@postSave()`

```typescript {20,26}
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, preSave } from "plumier"
import bcrypt from "bcrypt"

@genericController()
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
        // executed before user saved
        this.password = await bcrypt.hash(data.password, 10)
    }

    @postSave()
    async sendConfirmationEmail(){
        // executed after user saved
        await mailer.sendTemplate("confirmation-email")
    }
}
``` 

Above code will hash password before the entity saved into the database. Request hook has parameter binding feature, you can `@bind` any request part into the hook parameter, it works exactly like common [Parameter Binding](Controller.md#parameter-binding) which also support name binding, model binding and decorator binding.

:::info
The ID of the current entity only accessible on `@postSave` using `this.id`, since on `@postSave()` the entity is not saved yet to database.
:::

:::warning
Keep in mind that entity used for `@preSave()` and `@postSave()` is different, means if you using state variable to share between `@preSave()` and `@postSave()` its may not working like expected.
:::

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, preSave } from "plumier"
import bcrypt from "bcrypt"

@genericController()
@Entity()
class User {
    
    /** other properties **/

    @preSave()
    async hook(@bind.ctx() ctx:Context){
        // ctx will contains context
    }

    @postSave()
    async postHook(@bind.ctx() ctx:Context){
         // ctx will contains context
    }
}
``` 

Its possible to specify in which http method should the hook executed by specify http method on the request hook parameter

```typescript
import { Entity, PrimaryGeneratedColumn } from "typeorm"
import { route, preSave } from "plumier"
import bcrypt from "bcrypt"

@genericController()
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

When the default generic controller doesn't match your need, you can provide your own custom generic controllers. For example the default generic controller for `GET` method doesn't contains count of the match records usually used for table pagination on UI side. You can override this function by provide a new generic controller inherited from your ORM/ODM helper: 

| Generic Controller                                   | Package           | Description                                            |
| ---------------------------------------------------- | ----------------- | ------------------------------------------------------ |
| `TypeORMControllerGeneric<T, TID>`                   | @plumier/typeorm  | TypeORM generic controller implementation              |
| `TypeORMOneToManyControllerGeneric<P, T, PID, TID>`  | @plumier/typeorm  | TypeORM One To Many generic controller implementation  |
| `MongooseControllerGeneric<T, TID>`                  | @plumier/mongoose | Mongoose generic controller implementation             |
| `MongooseOneToManyControllerGeneric<P, T, PID, TID>` | @plumier/mongoose | Mongoose One To Many generic controller implementation |

First define the model represent the response schema returned by each controller using generic type like below 

```typescript
import {generic, type, noop} from "@plumier/reflect"

@generic.template("T")
export class Response<T> {
    @type(["T"])
    data: T[]
    @noop()
    count: number
}
```

Then create a new generic controller for both based on any of above generic controller like below 

```typescript 
import {TypeORMControllerGeneric, TypeORMOneToManyControllerGeneric} from "@plumier/typeorm"

@generic.template("T", "TID")
@generic.type("T", "TID")
export class CustomControllerGeneric<T, TID> extends TypeORMControllerGeneric<T, TID> {
    @type(Response, "T")
    async list(offset: number, limit: number, filter: FilterEntity<T>, select: string, order: string, ctx: Context) {
        const data = await super.list(offset, limit, filter, select, order, ctx)
        const count = await this.repo.count(filter)
        return { data, count } 
    }
}

@generic.template("P", "T", "PID", "TID")
@generic.type("P", "T", "PID", "TID")
export class CustomOneToManyControllerGeneric<P, T, PID, TID> extends TypeORMOneToManyControllerGeneric<P, T, PID, TID>{
    @type(Response, "T")
    async list(pid: PID, offset: number, limit: number, filter: FilterEntity<T>, select: string, order: string, ctx: Context) {
        const data = await super.list(pid, offset, limit, filter, select, order, ctx)
        const count = await this.repo.count(pid, filter)
        return { data, count } 
    }
}
```

Using above code, we simply call the `super.list` method and use the repository `count` method to create the response match the `Response` data structure.

Note that we define the return type of the method as `@type(Response, "T")`, this means we specify that the `Response.data` property is of type of `T` of the generic controller.

Next, we need to register above custom generic controller on the Plumier application like below 

```typescript {5}
new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility())
    .set({
        genericController: [CustomControllerGeneric, CustomOneToManyControllerGeneric]
    })
```

:::note
Make sure you register the controller under the `TypeORMFacility` or `MongooseFacility` to take effect. 
:::