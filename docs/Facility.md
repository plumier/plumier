---
id: facility
title: Facility
---

Facility is prebuilt middlewares and configuration bundled into one component. 
For example to build an API you will need: a Body parser, CORS, Generic error handler 
and some configuration etc, all can be bundled into one facility called `WebApiFacility`. 

## Signature
Facility is a class that implements `Facility`, the signature of `Facility` is like below:

```typescript
export interface Facility {
    setup(app: Readonly<PlumierApplication>): Promise<void>
}
```

Facility only contains one methods, it takes one parameter and return promise. This method 
will be called during startup based on its registration order.

## Develop Your Own Facility 
Develop your own Facility is not required, you can register middleware and set some configuration 
manually. You develop Facility if you want to make it reusable.

For example the `WebApiFacility` facility is like below:

```typescript 
import Cors from "@koa/cors"
import BodyParser from "koa-bodyparser"

export class WebApiFacility implements Facility {
    async setup(app: Readonly<PlumierApplication>) {
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

export class WebApiFacility implements Facility {
    async setup(app: Readonly<PlumierApplication>) {
        const koa = app.koa 
        //do something with the Koa instance
    }
}
```
