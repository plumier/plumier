---
id: custom-authorization
title: Custom Authorization
---

Custom authorization can be created using `@authorize.custom` decorator. Wrap it using function to create a new decorator like below

```typescript
export function myCustomAuthorization(){
    return authorize.custom(async info => {
        //return true to authorize user otherwise false
    })
}
```

Apply your new created authorization decorator like below

```typescript
export class AnimalController {
    @myCustomAuthorization()
    index(){

    }
}
```

## Callback Signature 
`@authorize.custom` receive two parameters a callback which will evaluate user authorization and `tag` metadata that will be used for further metadata processing. The callback signature is like below

```typescript
(info: AuthorizationContext, location: "Class" | "Parameter" | "Method") => boolean | Promise<boolean>
```

* `info` Metadata information about current authorization.
* `location` location of decorator applied `Class` `Parameter` `Method`

`AuthorizationContext` members is like below

```typescript
export interface AuthorizationContext {
    role: string[]
    user:any
    ctx: Koa.Context
    value?: any
}
```

* `role` is roles of current login user, single or multiple role
* `user` Current login user
* `ctx` Koa context of current request
* `value` optional, value of current parameter (if authorization applied into parameter)

## Example
Example we will create custom authorization to authorize if the current user is an `Admin` or the owner of the data. As an example we have controller to modify user data like below

```TypeScript
@domain()
export class User {
    constructor(
        id:number,
        email:string,
        displayName:string,
        address:string,
        birthDate:Date
    ){}
}
```

Controller to modify above domain is like below

```typescript
export class UsersController {
    @route.put(":id")
    async modify(id:number, user:User){
        await db("User").update(id, user)
    }
}
```

Action `modify` above will only authorized to `Admin` or if the login user has the same ID with the requested data. 

```typescript
export function isAdminOrOwner() {
    return authorize.custom((info, position) => {
        const {role, user, ctx} = info
        //the first parameter MUST be the ID of the requested user
        const id = ctx.parameters[0]
        return role.some(x => x === "Admin") || user.id === id
    })
}
```

Above snippet we created a new decorator `@isAdminOrOwner()` that can be applied to any method that the first parameter was the ID. Than we query if the current login user is an `Admin` or have the same ID with the requested data. To apply above decorator simply add it above the `modify` 

```typescript
export class UsersController {
    @isAdminOrOwner()
    @route.put(":id")
    async modify(id:number, user:User){
        await db("User").update(id, user)
    }
}
```

## Separate Decorator and Its Implementation
Putting authorization implementation inside decorator is simple and easy to read, but in some case it might cause circular dependency issue. You can use dependency resolver to solve this issue, by register the authorization classes by ID. 

The first step, create a class implements `Authorizer` interface like below.

```typescript
import { Authorizer, AuthorizationContext, DefaultDependencyResolver } from "plumier"

//create instance of DefaultDependencyResolver globally
const resolver = new DefaultDependencyResolver()

//register the custom authorizer with the ID
@resolver.register("isAdminOrOwner")
export class IsAdminOrOwnerAuthorizer implements Authorizer {
    authorize({ role, user, ctx }:AuthorizationContext, location: "Class" | "Parameter" | "Method") {
        const id = ctx.parameters[0]
        return role.some(x => x === "Admin") || user.id === id
    }
}
```

Register the created resolver into the Plumier application 

```typescript
import { Plumier, WebApiFacility } from "plumier"

const app = new Plumier()
    .set(new WebApiFacility({ dependencyResolver: resolver }))
    //other facilities or middlewares
    .initialize()
```

Then use the ID on each authorization applied. 

```typescript
export class UsersController {
    //use the ID here, Plumier will use resolver 
    //to create instance of the custom authorizer 
    //then execute it
    @authorize.custom("isAdminOrOwner")
    @route.put(":id")
    async modify(id:number, user:User){
        
    }
}
```

> This functionality work well with dependency injection, register the custom authorizer by name/id and plumier will automatically pass the ID into the custom dependency resolver.