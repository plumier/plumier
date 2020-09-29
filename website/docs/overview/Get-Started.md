---
id: get-started
title: Get Started
---

This documentation will show you how to create a secure CRUD restful API with a proper validation and authorization. We will use Plumier Generic Controller to automatically host CRUD restful API based on your ORM entities. 


| Method | Path                | Access         | Description                           |
| ------ | ------------------- | -------------- | ------------------------------------- |
| POST   | `/api/v1/users`     | Public         | Register user                         |
| GET    | `/api/v1/users`     | Admin          | Get all users                         |
| GET    | `/api/v1/users/:id` | Owner or Admin | Get single user by id                 |
| PUT    | `/api/v1/users/:id` | Owner or Admin | Replace user with new user info by id |
| PATCH  | `/api/v1/users/:id` | Owner or Admin | Modify user by id                     |
| DELETE | `/api/v1/users/:id` | Owner or Admin | Delete user by id                     |
| POST   | `/auth/login`       | Public         | Login endpoint                        |

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
Open the project directory using IDE or text editor you like, on this example we will use VSCode. 

Plumier blank project starter contains minimal files required to create API with Node.js and TypeScript. The project structure is like below

```
- src/
  - index.ts       // main entry of Plumier application
- tsconfig.json    // typescript configuration file
- package.json     // Node.js package configuration
```

There are more project starter available on the `plumier/starter` repository on each appropriate branch. 

## Add TypeORM

Next we will install [TypeORM](https://typeorm.io) package for data access, we will use SQLite 3 database to store the user data. TypeORM supported several databases so it will be possible to change your configuration later appropriately. 

Back to your terminal and execute command below

```
npm i --save typeorm @plumier/typeorm sqlite3 
```

Above code will install TypeORM package, Plumier TypeORM helper and SQLite driver into the package configuration file.  

## User Entity 

Now we can start modelling our User by creating TypeORM entity. We define `User` entity with properties below 

```typescript title="File: src/user/user-entity.ts"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    email: string

    @Column()
    name: string

    @Column()
    password: string

    @Column({ default: "User" })
    role: "User" | "Admin"
}
```

## Generic Controller 

In this step we will use Plumier Generic Controller to automatically host a CRUD restful endpoints.
Now we are ready to program our first Plumier application. First we will create TypeORM entity and let Plumier automatically generate CRUD endpoints for us



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

