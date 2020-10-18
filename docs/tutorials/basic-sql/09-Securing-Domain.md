---
id: securing-domain
title: Securing Domain Models
---

> **Info**  
> This is the ninth part of 10 steps tutorial on creating basic SQL restful API. Check navigation to navigate to other steps.

This section will teach about securing domain model by applying `@authorize` decorator into the domain properties.

## Issue 
If you notice that our `PUT /api/v1/users/:id` has a security hole, that any authenticated user can modify the `role` property, thats make any authorize user can make him self an `Admin`. We can fix this issue by securing domain model.

## Securing Domain Model
`@authorize` decorator can be applied into the method's parameter or domain properties, it will restrict user from setting the value of the property. By using this technique we keep implementation clean from security check that pollute the implementation.

> Note that adding `@authorize` decorator into domain property only affect on how user can set the value of the domain not on retrieving data. Means Plumier will not automatically hide returned JSON property based on user role requesting the data.

Navigate to the `domain.ts` file and modify `User` domain like below

```typescript
@domain()
export class User extends Domain {
    constructor(
        @val.email()
        @uniqueEmail()
        public email: string,
        public password: string,
        public name: string,
        @authorize.write("Admin") // <-- add this line
        public role: UserRole
    ) { super() }
}
```

By adding `@authorize.write("Admin")` above `role` property like above code, it will prevent `User`  role modify the property. If `User` role tries to set the value, Plumier will return Unauthorized error with http status code 401.

## Securing Domain With Default Value
If you review our domain closely you will notice that there are another security hole that possibly cause some issue on our domain, take a look at our domains below

```typescript
@domain()
export class Todo extends Domain {
    constructor(
        public todo: string,
        public userId:number,
        public completed: boolean = false
    ) { super() }
}
```

Above domain having security hole on the `userId` property. By using `PUT /api/v1/todos/:id` any authorized user can associate todo into another user. In an application with sensitive data this issue will become serious security hole.

To resolve above issue we can set authorization to the property using `@authorize.role("Machine")`. We specify `Machine` role just to make it readable, it explicitly showing that the property will be set by `Machine` with a default value. You can use other value than `Machine` the idea is using different role so no user role can set the value.

Navigate to the `domain.ts` file and modify the `Todo` domain like below

```typescript
@domain()
export class Todo extends Domain {
    constructor(
        public todo: string,
        @authorize.role("Machine") // <--- add this line
        public userId:number,
        public completed: boolean = false
    ) { super() }
}
```

We also need to secure the `Domain` base class because it has properties that vulnerable to change which is `id` and `createdAt`. Navigate to `Domain` class and modify like below

```typescript
@domain()
export class Domain {
    constructor(
        @authorize.role("Machine") // <--- add this line
        public id: number = 0,
        @authorize.role("Machine") // <--- add this line
        public createdAt: Date = new Date(),
        public deleted:boolean = false
    ) { }
}
```