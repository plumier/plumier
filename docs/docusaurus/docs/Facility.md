---
id: facility
title: Facility
---

Facility is a configuration component used to configure Plumier application to get a new ability. It consist some middlewares in a correct order, some process before the application initialized and some default application configuration. 

For example to build an API you will need: a Body parser, CORS, Generic error handler and some configuration etc, all can be bundled into one facility called `WebApiFacility`. 

## Signature
Facility is a class that implements `Facility`, the signature of `Facility` is like below:

```typescript
export interface Facility {
    setup(app: Readonly<PlumierApplication>): void
    generateRoutes(app: Readonly<PlumierApplication>): Promise<RouteMetadata[]>
    initialize(app: Readonly<PlumierApplication>, routes:RouteMetadata:[]): Promise<void>
}
```

* `setup` called during setup process. This method usually used for registering configurations and middlewares
* `generateRoutes` called during initialization process before the `initialize` method. This method provides list of routes produced by Facility. 
* `initialize` called during initialization process. This method usually used for some preparation required before application run, and possible to call promised functions

## Develop Your Own Facility 
Develop your own Facility is not required, you can register middleware and set some configuration 
manually. You develop Facility if you want to make it reusable.

For example the `WebApiFacility` facility is like below:

```typescript 
import Cors from "@koa/cors"
import BodyParser from "koa-bodyparser"
import { DefaultFacility, PlumierApplication } from "plumier"

export class WebApiFacility extends DefaultFacility {
    setup(app: Readonly<PlumierApplication>) {
        app.use({execute: async next => {
            try{
                return next.proceed()
            }
            catch(e){
                //do something with the error
            }
        }})
        app.use(BodyParser({ /* configuration */ }))
        app.use(Cors({ /* configuration */ }))
    }
}
```

Above code showing that we setup error handler, body parser and cors with some order. 
Error handler in the top most, it means it will handle all error caused by the next middleware / action.

## Access Koa from Facility
In some case if you want to configure Koa, you can do it in facility.

```typescript 
import Cors from "@koa/cors"
import BodyParser from "koa-bodyparser"
import { DefaultFacility, PlumierApplication } from "plumier"

export class WebApiFacility extends DefaultFacility {
    async setup({ koa }: Readonly<PlumierApplication>) {
        //do something with the Koa instance
        koa.use(<koa middleware>)
    }
}
```