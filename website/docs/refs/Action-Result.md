---
id: action-result
title: ActionResult
---


`ActionResult` is a special class that used to create an Http Response. `ActionResult` has ability to modify Http Response which make it possible to make a custom response such as return an html, file, file download etc. 

### Signature
`ActionResult` signature has some similarities with the http response like below:

```typescript
class ActionResult {
    static fromContext(ctx: Context) : ActionResult
    constructor(public body?: any, public status?: number)
    setHeader(key: string, value: string) : ActionResult
    setStatus(status: number): ActionResult
    execute(ctx: Context): Promise<void> 
}
```

* `fromContext` create `ActionResult` from Koa context
* `setHeader` set header that will be used by Http Response
* `setStatus` set Http Status that will be use by Http Response
* `execute` internally called by Plumier to generate Koa context and render the response

`setHeader` and `setStatus` designed to be chainable, so it will be able to create `ActionResult` object like below

```typescript
return new ActionResult({ message: "The body" })
    .setStatus(400)
    .setHeader("key", "value")
```

### Action Result Implementation
Currently now Plumier has three types of `ActionResult` implementation: 

* `ActionResult` by default will returned JSON response
* `RedirectActionResult` used to redirect request to specific url, internally it calls Koa `Context.redirect` 
* `FileActionResult` returned a file response based on provided file path. This class only enable when `@plumier/serve-static` installed.

A shorthand namespace available to access all of above implementation called `response` 

```typescript
import {route, response} from "plumier"

class AnimalController {
    @route.get()
    index(){
        return response.redirect(<url>)
    }
}

```

### Custom Action Result

It is possible to extends the ability of `ActionResult` to modify the Http response to return custom http response. The main logic is on the `execute` method.

For example the implementation of `FileActionResult` is quite simple as below

```typescript
import send from "koa-send"
import { extname } from "path"

export class FileActionResult extends ActionResult {
    constructor(path: string) {
        super(path)
    }

    async execute(ctx: Context) {
        await super.execute(ctx)
        ctx.type = extname(this.body)
        await send(ctx, this.body)
    }
}
```