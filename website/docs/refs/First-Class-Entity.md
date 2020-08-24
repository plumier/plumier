---
id: first-class-entity
title: First Class Entity
---

If you are an experienced programmer, you will understand that using Entity as a DTO (Data Transfer Object) is not a good idea, because it has some unexpected property such as relational property, and may expose some sensitive data such as user password etc.

Plumier has some built-in functionalities to be able to make entity as a first class citizen. First class entity means its safe to use entity anywhere on the application layers, for example as DTO and also as an object map to database table. 

### Security
Security issue is the most important issue that need to tackle on first class entity. Without proper security handling entity can expose sensitive data easily. 

Plumier has [parameter authorization](../refs/Authorization.md#parameter-authorization) and [authorization filter](../refs/Authorization.md#authorization-filter) to restrict access to request or response properties declaratively. 

As an example, we can configure our `User` entity that we used earlier to safely used as a DTO for request or response body. 

```typescript {7,11}
@Entity()
export class User {
    
    /* ... other properties ... */

    @Column()
    @authorize.writeonly()
    password:string

    @Column({ default: "User" })
    @authorize.set("SuperAdmin")
    role: "User" | "Admin" | "SuperAdmin"
}
```

Above showing that we secure our sensitive data using `@authorize` decorator. We restrict `password` only as write only, it will make password will not visible in any response body including nested property that uses `User` entity as data type. We also configure the `role` property to only can be set by `SuperAdmin` but can be viewed by everyone. 

### Relation Issue

### Type Conversion
Entity relation can be difficult issue when dealing with type conversion. Type converter need to understand that the relation property can be populated by id which mostly a primitive value. 

```typescript
@Entity()
export class Item {
    
    /* ... other properties ... */

    @ManyToOne(x => Category)
    category: Category
}
```

When above entity used as a request body DTO without having further setup will cause type conversion error when API client tries to set the `category` property. 

### Open API Schema
