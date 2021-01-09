---
id: tutorial-01
title: Step 1 - Get Started
---

This tutorial will walk you through creating a Restful API managing a Todo data with MySQL database, first we will learn about how to create a Plumier project, then we will learn how to create CRUD API using generic controller then finally we add authorization to protect the data.

## Project Description

On this tutorial We will created 3 CRUD API using generic controller, and one custom controller for login endpoint. The APIs will be like below


| Functions        | Path                              | Action |
| ---------------- | --------------------------------- | ------ |
| User API         | `/api/v1/users`                   | CRUD   |
| Todo API         | `/api/v1/todos`                   | CRUD   |
| Todo Comment API | `/api/v1/todos/{todoId}/comments` | CRUD   |
| User login       | `/api/v1/login`                   | POST   |


## Software Requirements 

To be able to follow this example you need some software installed in your computer.
* [Node.js](https://nodejs.org/en/) v10 or newer 
* Any terminal app
* Any text editor, in this example using VSCode

Confirm that Node.js installed properly on your machine by execute command below in your terminal

```
node -v
```

## Init Project

To get started we need to download [TypeORM Rest API project starters](https://github.com/plumier/starters/tree/master/rest-api-typeorm) from GitHub repository. In this example we will use [Degit](https://www.npmjs.com/package/degit) to download it. 

:::info
There are more project starters available on the `plumier/starters`, check the [repository](https://github.com/plumier/starters) readme file for more information.
:::

Execute commands below in your terminal to download the project starter

```sh
npx degit plumier/starters/rest-api-typeorm todo-api
``` 

Above command will download Degit locally then download Plumier TypeORM Rest API project starter into `todo-api` directory. 

:::caution
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

Plumier TypeORM Rest API project starter contains minimal files required to create API with SQL database using Node.js and TypeScript. The project structure is like below

```
- src/
  - api/
    - _shared/
      - entity-base.ts      // default base entity
    - user/
      - user-entity.ts      // simple user entity 
  - app.ts                  // Plumier bootstrap application
  - index.ts                // main entry of our API
- .env-example              // example dot env file (rename into .env)
- tsconfig.json
- package.json 
```

## Running The Project

After all dependencies installed then it should be good to go, but before we start codding we need to provide required environment variable to make the project work correctly.

Rename the `.env-example` file into `.env` file, then execute command below to run the project

```
npm run debug
```

If you are follow step above correctly then above code will print message indicating it serve CRUD user API like below 

```
> rest-api-typeorm@1.0.0 debug /
> ts-node-dev --inspect -- src/index

[INFO] 06:30:39 ts-node-dev ver. 1.1.1 (using ts-node ver. 9.1.1, typescript ver. 4.1.3)
Debugger listening on ws://127.0.0.1:9229/c1c7d1b2-e887-4c50-9520-a832526e370d
For help, see: https://nodejs.org/en/docs/inspector

Route Analysis Report
1. TypeORMControllerGeneric.list            -> Authenticated GET    /users
2. TypeORMControllerGeneric.save(data, ctx) -> Authenticated POST   /users
3. TypeORMControllerGeneric.get             -> Authenticated GET    /users/:id
4. TypeORMControllerGeneric.modify          -> Authenticated PATCH  /users/:id
5. TypeORMControllerGeneric.replace         -> Authenticated PUT    /users/:id
6. TypeORMControllerGeneric.delete(id, ctx) -> Authenticated DELETE /users/:id
```

Next step we will start program the API, adding entities and map them into API with first class entity. 