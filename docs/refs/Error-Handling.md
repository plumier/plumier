---
id: error-handling
title: Error Handling
---

Plumier has a default error handler that will handle all error thrown inside controllers or middlewares. Default error handler will automatically format thrown `HttpStatusError` or `ValidationError` into JSON response like below

```javascript
{
    error: {
        status: <http status code>,
        message: <error message>
    }
}
```

`message` can be a plain text message or can be a JSON object. 

> 500 (Internal server error)  will not formatted into JSON response for security reason.

## Override Error Handling
You can provide a global error handler to override the behavior or the default error handler above, by providing another middleware. 

```typescript 
import { Middleware, Invocation, ActionResult } from "plumier"

export class MyGlobalErrorHandlerMiddleware implements Middleware {
    execute(next: Readonly<Invocation>): Promise<ActionResult> {
        try {
            return await i.proceed()
        } catch (e) {
            //process the error and return JSON with ActionResult
        }
    }
}
```

Most important part is register above middleware in the application startup before the `WebApiFacility` or `RestApiFacility` registration.

```typescript

const koa = new Plumier()
    .use(new MyGlobalErrorHandlerMiddleware())
    .set(new WebApiFacility())
    .initialize()
```

Registration order is important so the custom error handler can catch framework error thrown by all middleware registered inside `WebApiFacility` such as `ValidationError` etc.