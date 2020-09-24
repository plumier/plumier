---
id: first-class-entity
title: First Class Entity
---

First class entity is a term used for some features to be able to make an ORM entity as a first class citizen, means ORM entities have more control in the system. 

Using entity as a DTO (Data Transfer Object) to represent request and response body actually is not a good idea, because its may lead into some issues. Here are issues that first class entity try to resolve.

### Authorization  
ORM entity usually contains properties that holds sensitive data such as password, date of birth etc, which will introduce security issue when ORM entity used as DTO. 

Plumier provided authorization in property basis, which make it possible to restrict read/write access to property. 

```typescript {6,11}
class User {
    id: number

    email: string

    @authorize.writeonly()
    password: string

    name: string

    @authorize.write("SuperAdmin", "Admin")
    role: "SuperAdmin" | "Admin" | "User"
}
```

Using above code, when used as request body model, will only allow `SuperAdmin` and `Admin` to set the `role` property. And when used as response body model will prevent `password` being visible to any user. 

### Relation Data Type
ORM entity may contains relation properties to represent join with another tables, usually relation properties defined with data type of the relation table instead of the ID data type. 

```typescript {15}
class User {
    @PrimaryGeneratedColumn()
    id: int

    /** other properties **/
}

class Log {
    @PrimaryGeneratedColumn()
    id: int

    /** other properties **/

    @ManyToOne(x => User)
    user: User 
}
```

`Log.user` data type is `User` but when inserting value usually we will use `number` instead of `User` object. 

When used as request body model, framework Type Converter need to understand that the `Log.user` property should be filled with data of type `number` instead of the `User` object. Open API Schema generator also should be showing proper data type for `Log.user` property instead of showing `User` object schema. 

### Validation 
ORM entity may contains `@val.required()` validation on its properties

Issue to resolve: required validation

### Request Hook
Issue to resolve: default value

### Inheritable Controller 
Issue to resolve: generic controller

### Configurable Controller from Class Scope
Issue to resolve: endpoint authorization, ignore endpoints

### Projection, Filter and Order
Issue to resolve: 

