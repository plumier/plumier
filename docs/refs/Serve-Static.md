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

## History Api Fallback
History Api Fallback help SPA application which commonly handle navigation using History Api. Its become problem when user hitting refresh button in the middle of navigation or if user bookmark the page because it will result in 404. 

Plumier provide `@route.historyApiFallback()` decorator to automatically redirect all the browser request (API or file request can be detected) into the specific controller action. Internally it detects the request `Accept` header to guess if the request comes from a browser or an API call.

> Keep in mind that `@route.historyApiFallback()` require the `ServeStaticFacility` enabled on the Plumier application.


```typescript
const HomeController {
    @route.get("/")
    @route.historyApiFallback()
    index(){
        return response.file(join(__dirname, "../../build/index.html"))
    }
}
```

Example above showing that you host the SPA html built by `create-react-app` or `@vue/cli` as the root url `/`. The `@route.historyApiFallback()` will automatically redirect all browser request into the root url `/` with exception:
* Requested url doesn't have any appropriate controller / handler 
* Requested url is not a static file serve
* Requested url is not an API call