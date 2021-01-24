---
id: tutorial-01
title: Step 1 - Get Started
---

This tutorial will walk you through creating a Restful API managing a Todo data with MySQL database, first we will learn about how to create a Plumier project, then we will learn how to create CRUD API using generic controller then finally we add authorization to protect the data.

## Software Requirements 

To be able to follow this example you need some software installed in your computer.
* [Node.js](https://nodejs.org/en/) v10 or newer 
* Any terminal app
* Any text editor, in this example using VSCode
* MySQL database and MySQL client

## Init Project

To get started we need to download [TypeORM Rest API project starters](https://github.com/plumier/starters/tree/master/rest-api-typeorm) from GitHub repository. In this example we will use [Degit](https://www.npmjs.com/package/degit) to download it. 

Execute commands below in your terminal to download the project starter

```sh
npx degit plumier/starters/rest-api-typeorm todo-api
``` 

Above command will download Degit locally then download Plumier TypeORM Rest API project starter into `todo-api` directory. 

:::info
If you having problem executing `npx` you can manually install Degit globally
```sh
npm i -g degit 
```

Then followed by executing Degit manually like below

```sh
degit plumier/starters/rest-api-typeorm todo-api
```
:::

Enter to the project directory by executing command below

```
cd todo-api
```

Install package dependencies by executing command below 

```sh
npm install
```

## Project Starter File Structure
Open the project directory using your favorite text editor or IDE, on this example we will use VSCode. 

![project structure](assets/tutorial-01/project-structure.png)

 Project starter already has a simple user management and login functionality generates JWT tokens. Its contains authorization setup to secure the API.

### File Structure
The default file structure is separate files per resource, a resource consists of several endpoints to serve CRUD functionality.

### User System 
Project starter shipped with user management system, consist of login API and simple user API and authorization setup.

The login API uses basic login function using email/password returned JWT tokens (login token and refresh token). The login token has limited live time while refresh token will never expired. 

The user api served by a generic controller using `User` entity. The `POST /users` intended to be accessible by public 


An authorization already defined so by default all API endpoints are protected by default, user should use login token to access resources. 

### Authorization


Plumier TypeORM Rest API project starter contains some files required to create API with SQL database using Node.js and TypeScript.

* `entity-base.ts` is a TypeORM base class entity contains basic properties required by an Entity, such as ID, Created Date, Updated Date and Delete Flag column. 
* `login-user.ts` is data type of current login user, its the JWT claims used as a bearer authentication.
* `auth-controller.ts` is the login functionality, its provides login using email and password, provides a refresh token API and logout functionality. 
* `auth-policy.ts` is authorization policy definitions, contains definition of global auth policy and and refresh token policy 

## Running The Project

After all dependencies installed then it should be good to go, but before we start codding we need to provide required environment variable to make the project work correctly.

Rename the `.env-example` file into `.env` file, then execute command below to run the project

```
npm run debug
```

If you are follow step above correctly then above code will print message indicating it serve CRUD user API like below 

```
> rest-api-typeorm@1.0.0 debug /Users/ktutnik/Documents/todo-api
> ts-node-dev --inspect -- src/index

[INFO] 05:02:34 ts-node-dev ver. 1.1.1 (using ts-node ver. 9.1.1, typescript ver. 4.1.3)
Debugger listening on ws://127.0.0.1:9229/a0b8a811-cf64-485c-9686-5a5a66abed7e
For help, see: https://nodejs.org/en/docs/inspector
node-pre-gyp info This Node instance does not support builds for N-API version 6
node-pre-gyp info This Node instance does not support builds for N-API version 6

Route Analysis Report
1. AuthController.login(email, password)    -> Public        POST   /auth/login
2. AuthController.refresh(user)             -> RefreshToken  POST   /auth/refresh
3. AuthController.logout()                  -> Authenticated GET    /auth/logout
4. TypeORMControllerGeneric.list            -> Authenticated GET    /users
5. TypeORMControllerGeneric.save(data, ctx) -> Public        POST   /users
6. TypeORMControllerGeneric.get             -> Authenticated GET    /users/:id
7. TypeORMControllerGeneric.modify          -> Authenticated PATCH  /users/:id
8. TypeORMControllerGeneric.replace         -> Authenticated PUT    /users/:id
9. TypeORMControllerGeneric.delete(id, ctx) -> Authenticated DELETE /users/:id
```

Above is the route analysis report created by Plumier route generator system, it prints generated routes from controllers and generic controllers during the generation process, it may print issues on each route if occur.

On the left is the controller's action handles the route, 


Next step we will start program the API, adding entities and map them into API with first class entity. 