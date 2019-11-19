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
(info: AuthorizeMetadataInfo, location: "Class" | "Parameter" | "Method") => boolean | Promise<boolean>
```

* `info` Metadata information about current authorization.
* `location` location of decorator applied `Class` `Parameter` `Method`

`AuthorizeMetadataInfo` members is like below

```typescript
export interface AuthorizeMetadataInfo {
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

## Separate Decorator and Implementation
Authorization decorator that is applied for parameter authorization, sometime need to be free from server specific dependency because will be shared with UI. To do so Plumier provided separation between logic and decorator by providing `ID` of the validator logic inside configuration, example:

```typescript
import { authorize } from "@plumier/core";

export function isAdminOrOwner(){
    return authorize.custom("auth:isAdminOrOwner") 
}
```

Define logic of the validation by providing key-value pair of authorize id and authorize logic like below

```typescript
//here is separate logic (can be place in different file)
export const authorizeStore:AuthorizeStore = {
    "auth:isAdminOrOwner": async (info, position) => {
        const {role, user, parameters} = info
        const id = parameters[0]
        return role.some(x => x === "Admin") || user.id === id
    }
}
```

To use it, register the authorize logic on the configuration, can be from `JwtAuthFacility` or from `Plumier.set({authorizer: {}})`

```typescript

const plumier = new Plumier()
plumier.set(new JwtAuthFacility({ authorizer: authorizeStore }))
//or
plumier.set({ authorizer: authorizeStore })
```