---
id: overview
title: Plumier in 5 Minutes
slug: /
---

Plumier is A TypeScript backend framework focuses on development productivity with dedicated reflection library to help you create a robust, secure and fast API delightfully. 

### Map ORM Entities into CRUD APIs

Plumier provided generic controllers to increase your productivity developing secure Restful API. Generic controllers are reusable controllers with a generic type signature, its take advantage of reflection and inheritance to provide Restful CRUD function with some useful operation such as filtering, ordering and response projection out of the box. Using it you will be able to create CRUD API rapidly based on your ORM entities (TypeORM entity, Mongoose with mongoose helper).

:::info 
In some frameworks you may avoid mapping ORM entities directly into CRUD APIs because its may lead into some issues. Plumier has [First Class Entity](../refs/First-Class-Entity.md) which provided functionalities to make it possible to map Entity into CRUD APIs safely.
:::

You use generic controller by decorating your entity with `@route.controller()` then Plumier automatically create derived controller based on your entity on the fly. 

```typescript {4}
import { route } from "plumier"
import { Entity, Column, CreateDateColumn, PrimaryGeneratedColumn } from "typeorm"

@route.controller()
@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    slug:string

    @Column()
    title:string

    @Column()
    content:string

    @CreateDateColumn()
    createdAt:Date
}
```

Above code is a common TypeORM entities marked with Plumier decorators. The `Category` entity marked with `@route.controller()` it tells Plumier that the entity should be handled by a generic controller. Code above will generated into routes that follow Restful best practice like below.

| Method | Path         | Description                                                 |
| ------ | ------------ | ----------------------------------------------------------- |
| POST   | `/posts`     | Create new post                                             |
| GET    | `/posts`     | Get list of posts with paging, filter, order and projection |
| GET    | `/posts/:id` | Get single post by id with projection                       |
| PUT    | `/posts/:id` | Replace post  by id                                         |
| PATCH  | `/posts/:id` | Modify post property by id                                  |
| DELETE | `/posts/:id` | Delete post by id                                           |

Generic controller provided functionalities to refine the API response, such as filter, paging, order and projection. Using above generated API you may request like below.

```bash
# Filter response based on slug property using exact comparison
# Filter require more specific conf
GET /posts?filter[slug]=my_cool_post

# Paginate response to narrow filter result 
GET /posts?filter[slug]=my_cool_post&offset=20&limit=50

# Order response by createdAt desc and slug asc
GET /posts?order=-createdAt,slug

# Select only title and content visible on response 
GET /posts?select=title,content
```

Generic controller functionalities are highly customizable, you can define your own route path, disable some routes, hook the saving process and even you can provide your own custom generic controller. 

### Map ORM Relation Into Nested CRUD API

ORM entities may contains relations to represent join to another table, Plumier provided nested generic controller to perform parent-child  operation easily.

```typescript {11}
import { route } from "plumier"
import { Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    id: number

    /** other properties **/

    @route.controller()
    @OneToMany(x => Comment, x => x.post)
    comments: Comment[]
}
```

Above code showing that the relation property `comments` marked with `@route.controller()` decorators. It tells Plumier to create a nested generic controller to perform parent-child operation. Above code will generated into routes below.

| Method | Path                       | Description                                                           |
| ------ | -------------------------- | --------------------------------------------------------------------- |
| POST   | `/posts/:pid/comments`     | Create new post's comment                                             |
| GET    | `/posts/:pid/comments`     | Get list of post's comments with paging, filter, order and projection |
| GET    | `/posts/:pid/comments/:id` | Get single post's comment by id with projection                       |
| PUT    | `/posts/:pid/comments/:id` | Replace post's comment  by id                                         |
| PATCH  | `/posts/:pid/comments/:id` | Modify post's comment property by id                                  |
| DELETE | `/posts/:pid/comments/:id` | Delete post's comment by id                                           |

To do the parent-child operation on Post and Comment its required to use the Post ID on the route like below 

```bash
# create new comments for Post with ID 12345
POST /posts/12345/comments 
{ body }

# get all comments for Post with ID 12345
GET /posts/12345/comments?offset=20&limit=50
```

Nested generic controller also supported query parameter to refine the response result explained earlier. 

:::info Documentation
Read more detail information about Generic Controller in this [documentation](../refs/Generic-Controller.md)
::::

### Securing Data Based on User Role 

Plumier has a powerful authorization system to protect your API endpoints and data based on your user roles. The authorization can be enabled by installing `JwtAuthFacility`.

:::info
Facility is a component used to configure Plumier application to add a new functionalities. It consist of ordered middlewares, some initialization process before the application started and some application configurations. Facility installed on application bootstrap like below.

```typescript
new Plumier()
  .set(new WebApiFacility()) //install API functionalities
  .set(new JwtAuthFacility()) //install authorization functionalities
```
:::

Before proceeding on security functionality, its important to notice that Plumier role system is depends on the JWT claim named `role`. You define the login user role by specify user role during JWT signing process like below.

```typescript {12}
import { route } from "plumier"
import { sign } from "jsonwebtoken"

export class AuthController {
    // POST /auth/login
    @route.post()
    async login(email:string, password:string) {
        // other login process
        const user = await repo.findByEmail(email)
        const token = sign({ 
          // role claim is mandatory 
          role: user.role, 
          // other claims 
        }, process.env.YOUR_JWT_SECRET)
        return { token }
    }
}
```

Role claim can be any string such as `SuperAdmin`, `Supervisor`, `Staff`, `Admin`, `User` etc. Further more this roles can be used to secure your API endpoints or data using `@authorize` decorator like below 

```typescript {5,16-17,22}
import { route } from "plumier"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

// only supervisor has mutation access (post,put,patch,delete) to the API endpoints
@authorize.route("Supervisor", actions("mutations"))
@route.controller()
@Entity()
export class Item {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    name: string

    // only Supervisor can read/write basePrice property
    @authorize.write("Supervisor")
    @authorize.read("Supervisor")
    @Column()
    basePrice: string

    // price can be read by everyone but can be write only by Supervisor
    @authorize.write("Supervisor")
    @Column()
    price: string
}
```

Code above showing that the entity handled by a generic controller. The `basePrice` property protected by `@authorize.write("Supervisor")` and `@authorize.read("Supervisor")` which means this property only can be read and write by user with `Supervisor` role. While `price` property protected with `@authorize.write("Supervisor")` will make it visible to everyone but only can be set by `Supervisor`. 

There are more authorization decorator available

| Decorator                  | Description                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `@authorize.route(<role>)`  | Protect API endpoints by specific role                                                            |
| `@authorize.write(<role>)` | Protect property only can be write by specific role                                               |
| `@authorize.read(<role>)`  | Protect property only can be read by specific role                                                |
| `@authorize.readonly()`    | Protect property only can be read and no other role can write it                                  |
| `@authorize.writeonly()`   | Protect property only can be write and no other role can read it                                  |
| `@authorize.custom()`      | Protect action or property using [custom authorizer function](../extends/Custom-Authorization.md) |


:::info documentation 
Refer to [this documentation](../refs/Authorization.md) to get detail information about authorization
:::

:::info documentation 
Refer to [this documentation](../refs/Generic-Controller.md#control-access-to-the-generated-routes) to get detail information on securing generic controller routes. 
:::


### Filter Data Based on Your User Role


### Generate Open API 3.0 Schema from Controllers

Plumier provided `SwaggerFacility` to automatically generate Open API 3.0 schema from both controller and generic controller. Open API 3.0 Schema automatically generated by reading and transforming controller's metadata on the fly. 

The generated Open API 3.0 schema can be customized minimally, but mostly everything will just work out of the box. `SwaggerFacility` hosts the SwaggerUI under `/swagger` endpoint.

![swagger](../assets/swagger.png)

### Handle Complex Request with Common Controller

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
Refer to the complete documentation about [routing](../refs/Route-Generation-Cheat-Sheet.md), [parameter binding](../refs/Parameter-Binding.md) and [type converter](../refs/Converters.md)
:::

### Plug Facilities Into Application Bootstrap

The entry point of Plumier application is an instance of `Plumier`. `Plumier` consist of features that can be enabled/disabled by installing `Facility`. 

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
| `MongooseFacility`    | Mongoose schema generator, generic controller and connection management                | `@plumier/mongoose`     |
| `TypeORMFacility`     | Provided helper and generic controller for TypeORM                                     | `@plumier/typeorm`      |
| `ServeStaticFacility` | Serve static files middleware                                                          | `@plumier/serve-static` |
| `SwaggerFacility`     | Serve Swagger UI and generate Open API 3.0 automatically                               | `@plumier/swagger`      |


### Layout Your Source Code Freely
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
