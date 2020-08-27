---
id: first-class-entity
title: First Class Entity
---

Entity object takes an important role in Plumier, it's not just as an object mapping to database table, but can be safely used as a DTO (Data Transfer Object). 

## Features

Plumier treats entity objects as a first class citizen and provides some extra features to make it possible to use in every part of the application.

### 1. Property Authorization 
Its a common best practice to have a separate class for DTO and entity because entities may contains properties related wit a sensitive data. 

```typescript
class User {
    // auto generated (no one allowed to write)
    @authorize.readonly()
    id:number

    email:string

    // prevent value being visible on any response
    @authorize.writeonly()
    password:string

    name:string

    // visible to anyone but only Admin and SuperAdmin allowed to set
    @authorize.set("Admin", "SuperAdmin")
    role: "User" | "Admin" | "SuperAdmin"
}
```

Property authorization allows you to use above entity as a DTO safely, and make security review on your code easier. Above code showing that the `User` entity decorated with some authorization decorator
* It prevents end user to set the `id` property
* It prevents password being leaked to the end user 
* It prevents `User` role set the role property


### 2. Overridable Relation Metadata
Its a common feature that an ORM/ODM entity contains relation property to represent relation with another entities. 

```typescript
class Item {
    @primaryId()
    id:number

    name:string

    price: number

    @relation()
    category: ItemCategory
}

class ItemCategory {
    @primaryId()
    id:number 

    name:string

    @relation()
    items:Item[]
}
```

Overridable relations means the metadata information of the relation properties can be overridden into of type of opposites ID instead of the object itself. This means 
* Type conversion module allows end user to provide ID of the relation instead of the full object. On above example the `Item.category` can be filled with ID of the `Category` (a number). And the `ItemCategory.items` also can be filled with array of `Item` ids (array of number).
* Open API generation module can provide a proper information that above relations can be filled with data of type number.

### 3. Escapable Required Validation
When an entity used as DTO its need to add some required validation rule into the entity itself. But in case of `PATCH` method which should allow any property to be filled with null, its need to be configured like below

```typescript
class Item {
    id:number

    @val.required()
    name:string

    @val.required()
    price:string
}

class ItemsController {
    // PATCH /items/:id
    @route.patch(":id")
    modify(id:number, @val.partial(Item) data:Item){ }
}
```

Above code showing that the `@val.partial(Item)` will tells the validator that all the required properties should be skipped from the validation. 

### 4. Sharable Authorization 

Plumier provide the same authorization decorator that can be used in Controllers or Entities. Providing authorization on the class level of the controller is possible.

```typescript
@authorize.set("Admin")
class ItemsController {
    // handles CRUD with POST, PUT, GET, DELETE
}
```

Using above code will make all `ItemsController` actions handles write access (`POST`, `PUT`, `PATCH` and `DELETE`) will be restricted only to Admin role. Above code will 

1. Nested routes 
   - Map one to many entity relation into nested routes 
2. Flexible parameter binding
   - Parameter binding should able to map entity into query string for searching
   - Search should follow secure property on rule #1
3. Auto populate nested properties 
   - Entity with relation one to one or many to one should be automatically populated



## Benefit
When 