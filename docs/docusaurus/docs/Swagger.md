---
id: swagger
title: Swagger
---

Plumier provide facility to generate Open API 3.0 Specification commonly used by [Swagger](https://swagger.io/) UI. The API specification directly generated from controllers metadata. 

## Enable The Facility 
To enable this facility you need to install the `@plumier/swagger` and use the `SwaggerFacility` on existing Plumier application like below: 

```typescript
import { SwaggerFacility } from "@plumier/swagger"

new Plumier()
        // ...... other facility
        // activate Open Api generation and Swagger UI
        .set(new SwaggerFacility())
```

Above is the minimum configuration required to generate the Open Api 3.0 Specification, some configuration may needed but optional. 

Using above code Plumier automatically generate Open API 3.0 Specification using controllers metadata and create two endpoints: 

* `/swagger.json`  The Open API 3.0 Specification 
* `/swagger` The swagger UI  (API explorer)

:::note 
Swagger UI and `swagger.json` will be disabled on production. To force enable SwaggerUI on production, use environment variable `PLUM_ENABLE_SWAGGER` with value `ui`, `json` or `false`.
:::

## Swagger Endpoint
By default the endpoint of the Swagger ui is `/swagger` this endpoint is customisable by providing `endpoint` on the `SwaggerFacility` like below: 

 ```typescript
import { SwaggerFacility } from "@plumier/swagger"

new Plumier()
        // ...... other facility
        .set(new SwaggerFacility({ endpoint: "/explorer" }))
```

Above code will host the Swagger ui in `/explorer` endpoint.

## Project Info 
Swagger facility provide default project info for OpenAPI 3.0 spec, you can override this by providing it in facility constructor 

 ```typescript
import { SwaggerFacility } from "@plumier/swagger"

new Plumier()
        // ...... other facility
        .set(new SwaggerFacility({ 
            info: { 
                title: "Pet Api Explorer", 
                version: "1.0.0", 
                description: "Lorem ipsum" 
            } 
        }))
```

## Decorator Customization (Optional)
Plumier provided decorators to customize the appearance of the swagger UI 
### Description 
Description can be applied on the action or parameter like below

```typescript
import { api } from "plumier"

class UsersController {
    @api.description("Get user by user id")
    @route.get(":id")
    get(id:string){ }
}
```

Description receive string with markdown syntax

### Response 

Open API generator automatically check for action return type to generate the response schema. Keep in mind that when provided `Promise` you need to specify the return type manually like below.

```typescript {5}
import { api, meta } from "plumier"

class UsersController {
    @route.get(":id")
    @meta.type(x => User)
    get(id:string): Promise<User>{ }
}
```