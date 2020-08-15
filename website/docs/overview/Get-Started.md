---
id: get-started
title: Get Started
---

This documentation will show you how to create a secure CRUD restful API with a proper validation and authorization. We will use Plumier Generic Controller to automatically host CRUD restful API based on your ORM entities. 


As a bonus we will setup Swagger which the schema automatically generated. 



| Method | Path                       | Access         | Description                           |
| ------ | -------------------------- | -------------- | ------------------------------------- |
| POST   | /api/v1/users              | Public         | Register user                         |
| GET    | /api/v1/users?offset&limit | Admin          | Get all users                         |
| GET    | /api/v1/users/:id          | Owner or Admin | Get single user by id                 |
| PUT    | /api/v1/users/:id          | Owner or Admin | Replace user with new user info by id |
| PATCH  | /api/v1/users/:id          | Owner or Admin | Modify user by id                     |
| DELETE | /api/v1/users/:id          | Owner or Admin | Delete user by id                     |
| POST   | /auth/login                | Public         | Login                                 |

## Requirements 
To be able to follow this example you need some software installed in your computer.
* [Node.js](https://nodejs.org/en/) v10 or newer 
* Any terminal app
* Any editor

Confirm that all below code is working by execute it in your terminal

```
node -v
npm -v
```

## Init Project

To get started create a directory and initiate a common Node.js project by executing command below on your terminal.

```bash
npm init --yes
``` 

Above command will create a new `package.json` with default setup. Create more files for our base project structure like below

* `tsconfig.json`
* `.env`
* `/src/index.ts`
* `/src/user/user-entity.ts`

The project structure will be like below

```
- src/
  - user/
    - user-entity.ts
  - index.ts
- .env
- tsconfig.json
- package.json
```

### TypeScript Configuration 
Open `tsconfig.json` file and copy paste code below. 

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "es2017",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "module": "commonjs",
    "strict": true,
    "strictPropertyInitialization": false
  }
}
```

Plumier uses TypeScript as its core development, above file required to run the project properly. 

### Install Dependencies 

Next we will install some Node.js packages required by the project. Back to your terminal and execute command below

```
npm i --save plumier
``` 

Above will install Plumier package into the project, next we will install package for data access, here we use TypeORM as our data access with SQLite database. 

```
npm i --save typeorm @plumier/typeorm sqlite3
```

We also need a capability to read configuration from environment variable. 

```
npm i --save dotenv
```

The last one, we need to add package to be able to run TypeScript code directly without transpile.

```
npm i --save-dev typescript ts-node-dev
```

## Codding

Our project now has the required files and packages, now we are ready to program the main functionality. You can use your favorite text editor to program.

### Generic Controller 

In this step we will use Plumier Generic Controller to automatically host a CRUD restful endpoints.
Now we are ready to program our first Plumier application. First we will create TypeORM entity and let Plumier automatically generate CRUD endpoints for us

```typescript title="src/index.ts"
import { TypeORMFacility, TypeORMGenericControllerFacility } from "@plumier/typeorm"
import { genSalt, hash } from "bcryptjs"
import dotenv from "dotenv"
import Plumier, { LoggerFacility, val, WebApiFacility } from "plumier"
import { BeforeInsert, Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    @val.email()
    email: string

    @Column()
    name: string

    @Column()
    password: string

    @Column({ default: "User" })
    role: "User" | "Admin"

    @BeforeInsert()
    async beforeInsert() {
        const salt = await genSalt()
        this.password = await hash(this.password, salt)
    }
}

dotenv.config()

new Plumier()
    .set(new WebApiFacility({ controller: __filename }))
    .set(new LoggerFacility())
    .set(new TypeORMFacility())
    .set(new TypeORMGenericControllerFacility({ rootPath: "api/v1" }))
    .listen(8000)
```

### Add Configuration File
Next we will add TypeORM configuration to be able to connect to our database. We will connect to SQLite in memory database.  Open `.env` file and copy paste source code below

```
TYPEORM_CONNECTION = sqlite
TYPEORM_DATABASE = :memory:
TYPEORM_ENTITIES = src/index.ts
TYPEORM_SYNCHRONIZE = true
TYPEORM_LOGGING = false
```

### Add Start Script 
Last step, open `package.json` file and modify the `start` script like below 

```json title="package.json"
{
  // ... other configuration ...
  "scripts": {
    "start": "ts-node-dev --inspect --no-deps -- src/index"
  },
  // ... other configuration ...
}

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

## Install Dependency For JWT Token

We will also add login functionalities to our project using JWT token, and hash password using bcrypt. Install the appropriate packages like below.

```
npm i --save jsonwebtoken @types/jsonwebtoken @plumier/jwt bcryptjs @types/bcryptjs
```

## Add JWT Secret Configuration

```
JWT_SECRET = very secret key
```



## Enable Swagger Functionality 
Next we will also add Swagger to our project for our front end developer to be able to inspect the request and response of our API. 

```
npm i --save @plumier/swagger
```