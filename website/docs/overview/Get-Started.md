---
id: get-started
title: Get Started
---

This tutorial will walk you through creating a Restful API managing a Todo data with some security features. The detail requirements of our API will be like below.

* User register using email, name and password .
* Provided login using email and password which returned JWT token. 
* Provide CRUD for TODO data, any user can create TODO, but only the owner of TODO can modify and delete it. 
* Provide CRUD to add comment to specific TODO, any user can add comments to specific TODO, but only the owner can modify and delete it
* Provide endpoint to upload picture used for user profile picture

List of endpoints will be created for above requirements are like below.

| Functions                                    | Path                       | Http Method      | Accessible By    |
| -------------------------------------------- | -------------------------- | ---------------- | ---------------- |
| User registration                            | `/users`                   | POST             | Public           |
| User login                                   | `/login`                   | POST             | Public           |
| Create a TODO                                | `/todos`                   | POST             | All login users  |
| Modify/delete TODO by ID                     | `/todos/:id`               | PUT PATCH DELETE | Owner of TODO    |
| Get TODO by id                               | `/todos/:id?select`        | GET              | All login users  |
| Get list of TODOs with filter and pagination | `/todos?filter`            | GET              | Public           |
| Add comment to specific todo                 | `/todos/:pid/comments`     | POST             | All login users  |
| Modify/remove comment to specific todo       | `/todos/:pid/comments/:id` | PUT PATCH DELETE | Owner of comment |


## Requirements 

To be able to follow this example you need some software installed in your computer.
* [Node.js](https://nodejs.org/en/) v10 or newer 
* Any terminal app
* Any text editor (VSCode preferred)

Confirm that Node.js installed properly on your machine by execute command below in your terminal

```
node -v
```

## Init Project

To get started we need to download [blank Plumier project starter](https://github.com/plumier/starter) from GitHub repository. In this example we will use [Degit](https://www.npmjs.com/package/degit) to download it. Execute commands below in your terminal

```sh
npx degit plumier/starter#blank plumier-get-started
``` 

Above command will download Degit locally then download Plumier blank project starter into `plumier-get-started` directory. 

:::info
If you having problem executing `npx` you can manually install Degit globally
```sh
npm i -g degit
```

Then followed by executing Degit manually like below

```sh
degit plumier/starter#blank plumier-get-started
```
:::

Enter to the project directory by executing command below

```
cd plumier-get-started
```

Install package dependencies by executing command below 

```sh
npm install
```

## Project Starter File Structure
Open the project directory using your favorite text editor or IDE, on this example we will use VSCode. 

Plumier blank project starter contains minimal files required to create API with Node.js and TypeScript. The project structure is like below

```
- src/
  - index.ts       // main entry of Plumier application
- tsconfig.json    // typescript configuration file
- package.json     // Node.js package configuration
```

There are more project starter available on the `plumier/starter` repository on each appropriate branch. 

## Add Dependencies

Next step we will install some NPM package required to build our API. The project starter already provided some basic packages required. 

Next we will install [TypeORM](https://typeorm.io) package for data access, we will use SQLite 3 database to store the user data. TypeORM supported several databases so it will be possible to change your configuration later appropriately. 

Back to your terminal and execute command below

```
npm i --save typeorm @plumier/typeorm sqlite3 
```

Above code will install TypeORM package, Plumier TypeORM helper and SQLite driver into the package configuration file.  


```
npm i --save @plumier/jwt jsonwebtoken @types/jsonwebtoken @plumier/jwt bcryptjs @types/bcryptjs
```


```
npm i --save @plumier/swagger
```

## Bootstrap Application 

```typescript
import Plumier, { ControllerFacility, WebApiFacility } from "plumier";
import dotenv from "dotenv"
import { TypeORMFacility } from "@plumier/typeorm";
import { JwtAuthFacility } from "@plumier/jwt";
import { SwaggerFacility } from "@plumier/swagger";

dotenv.config()

new Plumier()
    .set(new WebApiFacility())
    .set(new TypeORMFacility())
    .set(new ControllerFacility({controller: "./*/*-entity.{ts,js}"}))
    .set(new JwtAuthFacility())
    .set(new SwaggerFacility())
    .listen(process.env.PORT ?? 8000)
```

## User Entity 

Now we can start modelling our User by creating TypeORM entity. We define `User` entity with properties below 

```typescript title="File: src/user/user-entity.ts"
import { applyTo, authorize, preSave, route, val } from "plumier"
import { Column, Entity } from "typeorm"

import { EntityBase } from "../_shared/entity-base"
import { genSalt, hash } from "bcryptjs"

@authorize.public(applyTo("post"))
@route.ignore(applyTo("get", "put", "patch", "delete"))
@route.controller()
@Entity()
export class User extends EntityBase {
    @val.email()
    @val.unique()
    @Column()
    email: string

    @authorize.writeonly()
    @Column()
    password: string

    @val.required()
    @Column()
    name: string

    @val.url()
    @Column({ default: "User" })
    role: "Admin" | "User"

    @preSave("post")
    async hashPassword() {
        this.password = await hash(this.password, await genSalt())
    }
}
```



## Add Configuration File
Next we will add TypeORM configuration to be able to connect to our database. We will connect to SQLite in memory database.  Open `.env` file and copy paste source code below

```
TYPEORM_CONNECTION = sqlite
TYPEORM_DATABASE = :memory:
TYPEORM_ENTITIES = src/index.ts
TYPEORM_SYNCHRONIZE = true
TYPEORM_LOGGING = false
```

## Enable Swagger 
Next we will also add Swagger to our project for our front end developer to be able to inspect the request and response of our API. 

```
npm i --save @plumier/swagger
```

## Run The Project
Our project now is ready to start, go back to terminal app and execute command below

```
npm start
```

If you are follow the steps above correctly, the terminal will print output like below 

```
> plumier-get-started@1.0.0 start /inheritance
> ts-node-dev --inspect --no-deps -- src/index

Using ts-node version 8.10.1, typescript version 3.9.3
Debugger listening on ws://127.0.0.1:9229/a20c2330-ee14-4196-849e-af89350049d7
For help, see: https://nodejs.org/en/docs/inspector

Route Analysis Report
1. TypeORMControllerGeneric.list       -> GET    /api/v1/users
2. TypeORMControllerGeneric.save(data) -> POST   /api/v1/users
3. TypeORMControllerGeneric.get(id)    -> GET    /api/v1/users/:id
4. TypeORMControllerGeneric.modify     -> PATCH  /api/v1/users/:id
5. TypeORMControllerGeneric.replace    -> PUT    /api/v1/users/:id
6. TypeORMControllerGeneric.delete(id) -> DELETE /api/v1/users/:id

Server ready http://localhost:8000/
```

## Securing Resources

We will also add login functionalities to our project using JWT token, and hash password using bcrypt. Install the appropriate packages like below.

```
npm i --save jsonwebtoken @types/jsonwebtoken @plumier/jwt bcryptjs @types/bcryptjs
```

```
JWT_SECRET = very secret key
```


```typescript title="File: src/user/user-entity.ts"
import { preSave, val, authorize } from "plumier"
import { genSalt, hash } from "bcryptjs"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    @authorize.readonly()
    id: number

    @Column()
    @val.email()
    @val.required()
    email: string

    @Column()
    @val.required()
    name: string

    @Column()
    @val.required()
    @authorize.readonly()
    password: string

    @Column({ default: "User" })
    @authorize.write("Admin")
    role: "User" | "Admin"

    @preSave()
    async preSaveHook() {
        const salt = await genSalt()
        this.password = await hash(this.password, salt)
    }
}
```

