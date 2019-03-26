---
id: serve-static
title: Serve Static Files
---

Plumier provided functionality to serve static file using [koa-send](https://www.npmjs.com/package/koa-send) middleware

## Enable Functionality
Serve static files is optional, you can enable this functionality by install `@plumier/serve-static` and plug `ServeStaticFacility` into Plumier application

```typescript
import Plumier from "plumier"
import { join } from "path"
import { ServeStaticFacility } from "@plumier/serve-static"

const app = new Plumier()
app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
```

You can serve multiple folder by specifying multiple facility

```typescript
const app = new Plumier()
app.set(new ServeStaticFacility({ root: join(__dirname, "./assets") }))
app.set(new ServeStaticFacility({ root: join(__dirname, "./images") }))
```

## Serve Single File From Controller
Its possible to serve single file from controller by using `FileActionResult` or `response.file()`

```typescript
const HomeController {
    @route.get()
    index(){
        return response.file(join(__dirname, "index.html"))
        //or use FileActionResult
        //return new FileActionResult(join(__dirname, "index.html"))
    }
}
```