---
id: create-domain
title: Create Domain Model
---

Next we will define some domain for our application that commonly used for controller parameter data type.

In Plumier, domain represent data structure that will be saved to database and used as data transfer object. In this section we will define two domains: User and Todo domain.

## Define Domain
Expand `src` directory then create new directory named `model` and add new file inside `model` directory named `domain.ts` and write script below

```typescript
import { domain, val } from "plumier";

export type UserRole = "User" | "Admin"

@domain()
export class Domain {
    constructor(
        @val.optional()
        public id: number = 0,
        @val.optional()
        public createdAt: Date = new Date(),
        @val.optional()
        public deleted:boolean = false
    ) { }
}

@domain()
export class User extends Domain {
    constructor(
        @val.email()
        public email: string,
        public password: string,
        public name: string,
        public role: UserRole
    ) { super() }
}

@domain()
export class Todo extends Domain {
    constructor(
        public todo: string,
        public userId:number,
        @val.optional()
        public completed: boolean = false
    ) { super() }
}
```

All above class is a plain ES6 classes defined with parameter properties. We define base class for all domains, contains information related to database (`id` and `createdAt` timestamp). All domains then inherit from `Domain` base class.

> Using parameter properties is best practice and required for null safety programming in TypeScript. 

`@domain()` decorator tells TypeScript to save data type information for each domain properties and tells [tinspector](https://github.com/plumier/tinspector) (reflection library) that all parameters inside domain constructor is parameter properties and create appropriate meta data reflection for them.

By default all properties inside domain class is required, we define `@val.optional()` validation for both `id` and `created` properties because both will automatically populated on database and api client doesn't need to provide value for them.

On the `User` domain we define `@val.email()` validation for `email` property, doing so Plumier will automatically return Unprocessable entity error http status 422 to the api client if provided invalid email format.

