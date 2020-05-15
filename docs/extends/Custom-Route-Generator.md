---
id: custom-route-generator
title: Custom Route Generator
---

Plumier provided extension point to be able to extends the route generation system. This functionalities important when you develop a Facility that handles an endpoint internally and you want this endpoint visible on route analysis or Swagger UI.

## Action Routes and Virtual Routes
Plumier provided `RouteMetadata` type which separated into 2 kinds:  
* `ActionRoute` is a kind of route that handled by controller, this route will have Controller and Action metadata information required by the Open API Specification.
* `VirtualRoute` is a kind of route that handled internally by a middleware, this route doesn't have Controller associated thus it need to specify Open API Specification for `Operation` itself. 

## Example
For example you develop a Facility that handles and endpoint to generate CSRF key for the client `/auth/generate-csrf`. First you create middleware that handles the `/auth/generate-csrf` endpoint like below:

```typescript 
import { CustomMiddlewareFunction, ActionResult } from "@Plumier/core"

const CsrfMiddleware: CustomMiddlewareFunction = async ({ ctx, proceed }) => {
    if (ctx.method === "GET" && ctx.path.toLocaleLowerCase() === "/auth/generate-csrf") 
        return new ActionResult()
            .setCookie("__csrf_key", "your generated csrf key")
    else
        return proceed()
}
```

Next you register your middleware above and provide the Virtual Route definition for the `/auth/generate-csrf` endpoint like below

```typescript
import { DefaultFacility, RouteMetadata, PlumierApplication } from "@plumier/core"

class CsrfGenerationFacility extends DefaultFacility {
    async generateRoutes(): Promise<RouteMetadata[]> {
        return [{
            kind: "VirtualRoute",
            method: "get",
            overridable: false,
            provider: CsrfGenerationFacility,
            url: "/auth/generate-csrf",
            access: "Public",
            openApiOperation: /** Operation Open API 3.0 Specification **/
        }]
    }

    setup(app: Readonly<PlumierApplication>): void {
        app.use(CsrfMiddleware)
    }
}
```

## Generate ActionRoute from Controller 
Plumier provided function to generate route metadata from controller `generateRoutes`. To generate routes from controller simply call the function like below: 

```typescript
class CsrfController {
    @route.get("/auth/generate-csrf")
    get(){
        return new ActionResult()
            .setCookie("__csrf_key", "your generated csrf key")
    }
}
```

Then you can generate the controller from the facility like below 

```typescript
import { DefaultFacility, RouteMetadata, PlumierApplication, generateRoutes } from "@plumier/core"

class CsrfGenerationFacility extends DefaultFacility {
    async generateRoutes(): Promise<RouteMetadata[]> {
        return generateRoutes(CsrfController)
    }

    setup(app: Readonly<PlumierApplication>): void {
        app.use(CsrfMiddleware)
    }
}
```

## Control Duplicate Routes
In some case the endpoint handles by your Facility can be conflict with user endpoint, you can choose wether the endpoint can be automatically overridden or show conflict message on the route generation system. 

`RouteMetadata` has `overridable` property that you can set to define its behavior like below: 

```typescript 
// for Action Route
return generateRoutes(YourController, { overridable: false })

// for Virtual Route 
return [{ kind: "VirtualRoute", overridable: false }]
```

