---
id: framework-skeleton
title: Framework Skeleton
---

The simplest Plumier application consist of two parts: **Application bootstrap** and a **controller**. This simple application can be written in single TypeScript file like below:

```typescript title="index.ts"
import Plumier, { WebApiFacility } from "plumier"

// controller
export class HelloController {
    index(name:string) {
        return { say: `Hello ${name}` }
    }
}

// application bootstrap
new Plumier()
    .set(new WebApiFacility({ controller: __filename }))
    .listen(8000)
```

Above code host an API listens to port 8000 and serve an endpoint `GET /hello/index?name=<string>`. 

## Minimum TypeScript Configuration
To be able to run the Plumier application properly, some TypeScript option need to be enabled. Below is minimum required configuration to be able to run Plumier application properly. 

```json title="tsconfig.json"
{
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // optional 
    "strict": true,
    //required if using @plumier/typeorm and strict:true enabled
    "strictPropertyInitialization": false,
  }
}
```

## Bootstrap Application
The bootstrap application consists of two steps: initialization and listen to the port for incoming http request. 

```typescript
new Plumier()
    .set(new WebApiFacility())
    .listen(8000)
```
## Facility
Facility is a component used to configure Plumier application to add a new functionalities. It consist of ordered middlewares, some initialization process before the application started and some application configuration. Plumier provided some facilities for development convenient, here are some facilities that commonly used

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


## Controller 
The term of Controller in Plumier is the same as in other MVC framework. Controller is a group of actions handled the request. Controller should follow a simple rules
1. Controller name should be ends with `Controller`, for example `export class UsersController { }` 
2. By default controller files should be put inside directory named `controller` in the same level with the bootstrap application file. But this behavior can be changed by using `ControllerFacility`

```typescript 
import { route } from "plumier"

//file: ./controller/animal-controller.ts
class AnimalsController {
    @route.get()
    get() { }
}
```

## Controller Return Value
Controller's return value by default will rendered into JSON response with status code 200. Controller allowed to returned value or promised value. 

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string){
        //return static value
        return { name: "Mimi" }
    }
}
```

Or return promised value returned by database library

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string){
        // mongoose model
        return AnimalModel.findById(id)
    }
}
```

For more advanced result, controller should returned any object derived from `ActionResult` class. Using `ActionResult` possibly to set more advanced response values such as cookie, header etc.

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string){
        return new ActionResult({ name: "Mimi" })
            .setCookie("Name", "Value")
    }
}
```

Plumier provided several `ActionResult` derived class for development convenient. 

| Action                 | Alias                 | Description                | Package                 |
| ---------------------- | --------------------- | -------------------------- | ----------------------- |
| `ActionResult`         | `response.json()`     | Return json response       | `plumier`               |
| `RedirectActionResult` | `response.redirect()` | Redirect response          | `plumier`               |
| `FileActionResult`     | `response.file()`     | Serve static file response | `@plumier/serve-static` |

Refer to [action result documentation](../refs/Action-Result.md) for more information.

## Project Layout 
Plumier doesn't provide any style on how to layout your project files, instead its provide flexibility on how the project files match your convenient. For example in the above code the application and controller are placed in a single file, Plumier allows you to have that kind of structure if you have tiny project with a few source code.

Below are some common project structure usually used by developers, You can choose any of them match your like.

### Single File Style
This style usually used by Express for small app with a fewer code. To use this style setup your application bootstrap like below 

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

Use `ControllerFacility` facility to locate the controller location. Plumier will automatically search through all files to find controllers.

```typescript
new Plumier()
    .set(new WebApiFacility())
    .set(new ControllerFacility({ controller: __dirname, directoryAsPath:false }))
    .listen(8000)
```
