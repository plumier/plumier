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
interface AuthorizationContext {
    value?: any
    parentValue?: any
    role: string[]
    user: { [key: string]: any } | undefined
    ctx: ActionContext
    metadata: Metadata
    access: AccessModifier
}
```

* `value` is Current property value, only available on authorize read/write
* `parentValue` is Current property's parent value, only available on authorize read/write
* `role` is List of user roles
* `user` is Current login user JWT claim
* `ctx` is Current request context
* `metadata` is Metadata information of the current request
* `access` is Type of authorization applied read/write/route/filter

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
