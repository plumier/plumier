---
id: entry-point
title: Entry Point
---

Plumier application is the entry point of all Plumier based API. Creating Plumier application simply by creating instance of `Plumier` class. The simplest Plumier application at least must have `WebApiFacility` installed like below.

```typescript
import Plumier from "plumier"

new Plumier()
    .set(new WebApiFacility())
    .listen(8000)
```

Above configuration does noting because no controller specified. We can start above code using [ts-node](https://www.npmjs.com/package/ts-node) or [ts-node-dev](https://www.npmjs.com/package/ts-node-dev), by specify it on the `package.json` script like below.

```json {5}
{
  "name": "my-cool-api",
  "version": "1.0.0",
  "scripts": {
    "debug": "ts-node-dev --inspect -- src/index",
    "build": "tsc",
    "start": "node src/index"
  },
  "dependencies": {
    "plumier": "^1.0.0-rc.7",
  },
  "devDependencies": {
    "ts-node-dev": "^1.1.1",
    "typescript": "^4.1.3",
  }
}
```

## Facilities 

Plumier application is configurable using facility, facility is a framework component consist of configurations, ordered middlewares and some micro process before the framework started.

There are list of built-in facility that ready to be used.


| Facility              | Includes                                                                               | Package                 |
| --------------------- | -------------------------------------------------------------------------------------- | ----------------------- |
| `WebApiFacility`      | Body parser, CORS middleware, Default dependency resolver                              | `plumier`               |
| `RestApiFacility`     | Same as `WebApiFacility` except its provided more strict restful API status code       | `plumier`               |
| `ControllerFacility`  | Host controllers by path or type, furthermore controllers can be grouped and versioned | `plumier`               |
| `LoggerFacility`      | Simple request logging and error reporting                                             | `plumier`               |
| `JwtAuthFacility`     | Jwt middleware, Enable authorization, Jwt Secret configuration                         | `@plumier/jwt`          |
| `MongooseFacility`    | Mongoose schema generator, generic controller and connection management                | `@plumier/mongoose`     |
| `TypeORMFacility`     | Provided helper and generic controller for TypeORM                                     | `@plumier/typeorm`      |
| `ServeStaticFacility` | Serve static files                                                           | `@plumier/serve-static` |
| `SwaggerFacility`     | Serve Swagger UI and generate Open API 3.0 automatically                               | `@plumier/swagger`      |

## Application For Testing

When Plumier `listen` method called immediately its make Plumier lost its ability for testing purpose. To do that you can use `initialize` method to get a testable server like below. 

```typescript
import Plumier, { Configuration, WebApiFacility } from "plumier"

function createApp(config?: Partial<Configuration>) {
    return new Plumier()
        .set({ ...config})
        .set(new WebApiFacility())
        .initialize()
}

export default createApp
```

By using code above, you can test your API using [supertest](https://www.npmjs.com/package/supertest) like below.

```typescript
import createApp from "../src/app"
import supertest from "supertest"

it("Should serve API properly", async () => {
    const app = await createApp({ mode: "production" })
    await supertest(app.callback())
        .get("/")
        .expect(200)
})
```