---
id: overview
title: Plumier in 5 Minutes
slug: /
---

Plumier is A TypeScript backend framework focuses on development productivity with dedicated reflection library to help you create a robust, secure and fast API delightfully. 

## Map ORM Entities into CRUD APIs

Plumier provided generic controllers to increase your productivity developing secure Restful API. Generic controllers are reusable controllers with a generic type signature, its take advantage of reflection and inheritance to provide Restful CRUD function with some useful operation such as filtering, ordering and response projection out of the box. Using it you will be able to create CRUD API rapidly based on your ORM entities (TypeORM entity, Mongoose with mongoose helper).

:::info 
In some frameworks you may avoid mapping ORM entities directly into CRUD APIs because its may lead into some issues. Plumier has [First Class Entity](../refs/First-Class-Entity.md) which provided functionalities to make it possible to map Entity into CRUD APIs safely.
:::

You use generic controller by decorating your entity with `@route.controller()` then Plumier automatically create derived controller based on your entity on the fly. 

```typescript {4,12}
import { route } from "plumier"
import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

@route.controller()
@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    /** other properties **/

    @route.controller()
    @OneToMany(x => Item, x => x.post)
    comments: Comment[]
}
```

Above code is a common TypeORM entities marked with Plumier decorators. The `Category` entity marked with `@route.controller()` it tells Plumier that the entity should be handled by a generic controller which handled endpoints below

| Method | Path         | Description                                                 |
| ------ | ------------ | ----------------------------------------------------------- |
| POST   | `/posts`     | Create new post                                             |
| GET    | `/posts`     | Get list of posts with paging, filter, order and projection |
| GET    | `/posts/:id` | Get single post by id with projection                       |
| PUT    | `/posts/:id` | Replace post  by id                                         |
| PATCH  | `/posts/:id` | Modify post property by id                                  |
| DELETE | `/posts/:id` | Delete post by id                                           |

The other `@route.controller()` decorator on the `Category.items` property tells Plumier to create another controller on the fly with nested behavior which will handle routes below: 

| Method | Path                       | Description                                                           |
| ------ | -------------------------- | --------------------------------------------------------------------- |
| POST   | `/posts/:pid/comments`     | Create new post's comment                                             |
| GET    | `/posts/:pid/comments`     | Get list of post's comments with paging, filter, order and projection |
| GET    | `/posts/:pid/comments/:id` | Get single post's comment by id with projection                       |
| PUT    | `/posts/:pid/comments/:id` | Replace post's comment  by id                                         |
| PATCH  | `/posts/:pid/comments/:id` | Modify post's comment property by id                                  |
| DELETE | `/posts/:pid/comments/:id` | Delete post's comment by id                                           |

Nested generic controller will automatically populate the values for relation properties (children relation property and reverse property). 

Generic controller functionalities are highly customizable, you can define your own route path, disable some routes, hook the saving process and even you can provide your own custom generic controller. 

:::info Documentation
Read more detail information about Generic Controller in this [documentation](../refs/Generic-Controller.md)
::::

## Security 

Plumier has a powerful authorization system to protect your API endpoints and data based on your user roles. The authorization can be enabled by installing `JwtAuthFacility` (we will learn about Facility on the next section). 

Before proceeding on security functionality, its important to notice that Plumier role system is depends on the JWT claim named `role`. You define the login user role by specify user role during JWT signing process like below.

```typescript
import { route } from "plumier"
import { sign } from "jsonwebtoken"

export class AuthController {
    @route.post()
    login(data:Login) {

        /** other login process **/

        const token = sign({ role: user.role, /* other claims */  }, <secret>)
        return { token }
    }
}
```

Role claim can be any string such as `SuperAdmin`, `Supervisor`, `Staff`, `Admin`, `User` etc. Further more this roles can be used to secure your API endpoints or data using `@authorize` decorator like below 

```typescript {4,13,17}
import { route } from "plumier"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@route.controller()
@Entity()
export class Item {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    @authorize.role("Supervisor")
    @Column()
    basePrice: string

    @authorize.write("Supervisor")
    @Column()
    price: string
}
```

Code above showing that the entity handled by a generic controller. The `basePrice` property protected by `@authorize.role("Supervisor")` which means this property only can be read and write by user with `Supervisor` role. While `price` property protected with `@authorize.write("Supervisor")` will make it visible to everyone but only can be set by `Supervisor`. 

There are more authorization decorator available

| Decorator                        | Description                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@authorize.role("SuperAdmin")`  | Protect action or property can be read and write by specific role (`SuperAdmin`)                  |
| `@authorize.write("SuperAdmin")` | Protect property only can be write by specific role (`SuperAdmin`)                                |
| `@authorize.read("SuperAdmin")`  | Protect property only can be read by specific role (`SuperAdmin`)                                 |
| `@authorize.readonly()`          | Protect property only can be read and no other role can write it                                  |
| `@authorize.writeonly()`         | Protect property only can be write and no other role can read it                                  |
| `@authorize.custom()`            | Protect action or property using [custom authorizer function](../extends/Custom-Authorization.md) |

Furthermore the `@authorize.role()` and `@authorize.custom()` can be used to secure API endpoints based on user role. 

:::info documentation 
Refer to [this documentation](../refs/Authorization.md) to get detail information about authorization
:::

:::info documentation 
Refer to [this documentation](../refs/Generic-Controller.md#control-access-to-the-generated-routes) to get detail information on securing generic controller routes. 
:::


## Plumier Controller 

Generic controller is just an implementation of Plumier controller with generic class signature. Even though generic controller can be fully customized to match your app requirements, in some case its may required to use a controller manually to handle user request. 

The term of Controller in Plumier is the same as in other MVC framework. Plumier controller is a plain class end with `Controller` for example `class UsersController`. A route automatically generated based on `/controller/action`. This behavior can be customized using `@route` decorator see more detail route cheat sheet [here](../refs/Route-Generation-Cheat-Sheet.md)

```typescript
import { route } from "plumier"

export class UsersController {
    // GET /users/:id
    @route.get(":id")
    get(id:string) { }
}
```

Action parameter can be bound into request part such as query, body, header etc. Request values received automatically converted into data type match with action parameter data type. 

```typescript
import { route } from "plumier"

export class UsersController {
    // GET /users/list
    @route.get()
    list(offset:number = 0, limit:number = 50, active:boolean = true) {
        
    }
}
```

Above controller generated into `GET /users/list?limit&offset&active`. All parameters are optional with their default values. Note that the value automatically converted match with parameter data type, giving these request are valid

```
GET /users/list 
GET /users/list?limit=20
GET /users/list?offset=20&limit=20
GET /users/list?offset=10&active=true
GET /users/list?active=1
```

Important to notice that boolean parameter can be filled with: `yes`, `no`, `true`, `false`, `1`, `0`. And parameter of type datetime can be filled with `2020-12-31` or `2020-10-05T23:28:33.598Z` 

Parameters also can be bound with request body by providing a parameter of type of custom object to hold the request body like example below

```typescript
import { route, domain } from "plumier"

@domain()
export class Login {
    constructor(
        public email:string,
        public password:string,
    ){}
}

export class AuthController {
    // POST /auth/login
    @route.post()
    login(data:Login) {
        
    }
}
```

Above controller will be generated into `POST /auth/login` with request body `{ "email":<string>, "password": <string> }` 

:::info documentation
Refer to the complete documentation of controller routing [here](../refs/Route-Generation-Cheat-Sheet.md), 
:::

:::info documentation
Refer to the complete documentation of parameter binding [here](../refs/Parameter-Binding.md), 
:::

:::info documentation
Refer to the complete documentation type converter [here](../refs/Converters.md), 
:::

## Application Bootstrap

The entry point of Plumier application is an instance of `Plumier`. `Plumier` consist of features that can be enabled/disabled by installing `Facility`. 

Facility is a component used to configure Plumier application to add a new functionalities. It consist of ordered middlewares, some initialization process before the application started and some application configurations.

```typescript
import { JwtAuthFacility } from "@plumier/jwt"
import { SwaggerFacility } from "@plumier/swagger"
import { TypeORMFacility } from "@plumier/typeorm"
import Plumier, { WebApiFacility, ControllerFacility } from "plumier"

new Plumier()
    .set(new WebApiFacility())
    .set(new ControllerFacility({ 
      controller: "./**/*controller.{ts,js}", 
      rootPath: "api/v1"
    }))
    .set(new JwtAuthFacility())
    .set(new TypeORMFacility())
    .set(new SwaggerFacility())
    .listen(8000);
```

Above code will start Plumier application with some installed features and listens to the port 8000. Plumier provided some facilities for development convenient they are:

| Facility              | Includes                                                                               | Package                 |
| --------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| `WebApiFacility`      | Body parser, CORS middleware, Default dependency resolver                              | `plumier`               |
| `RestApiFacility`     | Same as `WebApiFacility` except its provided more strict restful API status code       | `plumier`               |
| `ControllerFacility`  | Host controllers by path or type, furthermore controllers can be grouped and versioned | `plumier`               |
| `LoggerFacility`      | Simple request logging and error reporting                                             | `plumier`               |
| `JwtAuthFacility`     | Jwt middleware, Enable authorization, Jwt Secret configuration                         | `@plumier/jwt`          |
| `MongooseFacility`    | Mongoose schema generator, Schema analyzer, Connection management                      | `@plumier/mongoose`     |
| `TypeORMFacility`     | Provided helper to easily use TypeORM from Plumier                                     | `@plumier/typeorm`      |
| `ServeStaticFacility` | Serve static files middleware                                                          | `@plumier/serve-static` |
| `SwaggerFacility`     | Serve Swagger UI and generate Open API 3.0 automatically                               | `@plumier/swagger`      |


## Project Layout 
Plumier doesn't strictly provided the project layout, but it provided flexibility to layout your project files match your need. Below are some common project structure usually used by developers, You can choose any of them match your like.

### Single File Style
This style usually used by Express for small app with a fewer code. Put all controllers and entities in a single file and configure the bootstrap application like below.

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: ___filename }))
    .listen(8000)
```

By providing `__filename` you ask Plumier to search your controllers in the same file. 

:::caution
If using `__filename` as source of controller, its required to export your controller to make reflection library able to locate it.
:::

### Classic MVC Style 
This is default style supported by Plumier. Classic MVC style app separate project files by functionalities such as `controllers`, `models`, `repositories`, `entities`, `services` etc.

```
+ src/
  + controller/
    - item.controller.ts
    - user.controller.ts
  + repository/
    - item.repository.ts
    - user.repository.ts
  + service/
    - item.service.ts
    - user.service.ts
  + entity/
    - item.entity.ts
    - user.entity.ts
  - app.ts
  - index.ts
- package.json
- tsconfig.json
```

No more setup required to use this style.

```typescript
new Plumier()
    .set(new WebApiFacility())
    .listen(8000)
```

### Modular Style 
This style usually used by modern frameworks, files separated by module per directory, each directory consist of controller, model, service, entity etc separated in different files. 

```
+ src/
  + item/
    - item.controller.ts
    - item.entity.ts
    - item.service.ts
    - item.repository.ts
  + user/
    - user.controller.ts
    - user.entity.ts
    - user.service.ts
    - user.repository.ts
  - app.ts
  - index.ts
- package.json
- tsconfig.json
```

Use `ControllerFacility` to locate the controller location. Plumier will automatically search through all files to find controllers.

```typescript
new Plumier()
    .set(new WebApiFacility())
    .set(new ControllerFacility({ controller: "./*/*.controller.{ts,js}" }))
    .listen(8000)
```
