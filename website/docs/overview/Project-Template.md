---
id: project-template
title: Project Template
---

Plumier provided some official project template starters contains minimum source files, package setup and some default configuration required to start a fresh new API project. Project starters hosted in [this repository](https://github.com/plumier/starter) on each branch.

## Project Templates

Each project templates consist of: 
1. Minimum source file such as application bootstrap, controller etc.
2. Minimum source file for unit testings using Jest
3. Minimum dependencies required on `package.json` file
4. VSCode launch configuration to debug the application and debug the test
5. Some TypeScript files for post install script and deployment

There are several project starter available on the repository: 

| Name                     | Stack           | Description                                                                  |
| ------------------------ | --------------- | ---------------------------------------------------------------------------- |
| `basic-rest-api`         | Plumier         | Basic Plumier application starter                                            |
| `monorepo-plumier-react` | Plumier, React  | Monorepo SPA starter. Plumier as the API backend and React as the front end  |
| `monorepo-plumier-vue`   | Plumier, Vue.js | Monorepo SPA starter. Plumier as the API backend and Vue.js as the front end |


## Requirements 
Some software required in your local development to make things run smoothly. 

* [Node.js](https://nodejs.org/en/download/) version 8 or newer version 
* [Visual Studio Code](https://code.visualstudio.com/download) 
* [Yarn](https://yarnpkg.com/lang/en/docs/install) 
  
Test the following code in your terminal application (Terminal, Cmd, Powershell, Git Bash) to make sure everything installed properly.

```bash
$ node -v
$ npx -v
$ yarn -v
$ code -v
```

Make sure all commands above run correctly.

## Plumier Starter CLI App

Use `plumier-starter` cli application to download the project template you need, by execute command below: 

```
$ npx plumier-starter
```

Command above will download and execute `plumier-starter` application temporarily. Type the project name and select the starter you wish. Wait a moment until yarn finish installing dependencies. After process finished execute command below to run start the Plumier application. 


```
$ cd <project name>
$ yarn debug
```

