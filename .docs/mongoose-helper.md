## MongoDB Helper
Generate [Mongoose](http://mongoosejs.com/) schema based on your domain model.

## Enable The Functionality
MongoDB helper is optional in Plumier, it can be enabled by installing `@plumjs/mongoose` module and plug `MongooseFacility` into Plumier application.

```typescript
const plum = new Plumier()
plum.set(new MongooseFacility({uri: "mongodb://localhost:27017/test-data"}))
```

> It is required to use [parameter properties](https://www.typescriptlang.org/docs/handbook/classes.html#parameter-properties) to be able to make auto schema generate work properly. Common common decorated property is not supported, because its best practice to use parameter properties with null safety enabled.

Mongoose facility will automatically connect to the MongoDB database and make sure it ready before application started.

## Mark Domain Model For Schema Generated
Your domain model and you MongoDB collection is not 1 : 1 relation, means not all domain model will will have an appropriate MongoDB collection. 

Mark domain model with `@collection` decorator for auto generated schema.

```typescript
import { collection } from "@plumjs/mongoose"

@collection()
export class User {
    constructor(
        public name: string,
        public image: string,
        public address:string,
        public city:string,
        public zip:string,
    ) { }
}
```

> When using `@collection()` decorator `@domain()` decorator can be omitted, because `@domain()` decorator actually does nothing except just to make TypeScript generate the design type information.

You don't need to specify the ID because mongoose will automatically gives you the `_id` property (actually that make the domain model cleaner)

## Create Model
`@plumjs/mongoose` provided `model` function to create Mongoose model

```typescript
import { model } from "@plumjs/mongoose"

const UserModel = model(User)
```

> You can create model anywhere in your code, but best practice is put them under the domain model class.

## Relational Schema (populate)
If you defined relational class on your domain model, Mongoose helper will automatically generate a relation with mongoose `ObjectId`

```typescript
@collection()
class Child {
    constructor(
        public name:string
    ){}
}

@collection()
class Parent {
    constructor(
        public name:string
        //1 - 1 relation
        public child:Child
    ){}
}
```

Using above code, mongoose facility will generate mongoose schema like below:

```typescript
//child
{
    name: String
}

//parent
{
    name: String,
    child: { type: Schema.Types.ObjectId, ref: "Parent" }
}
```

It also work with collection relation 

```typescript
@collection()
class Parent {
    constructor(
        public name:string
        //collection relation
        public children:Child[]
    ){}
}
```

```typescript
//parent
{
    name: String,
    child: { type: [Schema.Types.ObjectId], ref: "Parent" }
}
```

## Custom Mongoose Collection Name
You can specify a name alias on `@collection()` decorator to specify custom collection name. But keep in mind mongoose will pluralize your model name when creating the collection.

```typescript
@collection("ParentCollection")
class Parent {
    constructor(
        public name:string
        //collection relation
        public children:Child[]
    ){}
}
```

## Unique Validation
Mongoose helper provided `@val.unique()` that augmented (merged) with `@plumjs/validator` module. Means if you install `@plumjs/mongoose` `@val` decorator will automatically has `unique()` function.

This function is not using the mongoose `unique` schema, but it automatically check to the database for uniqueness, so validation engine can execute the validation rule without touching controller.

```typescript
import { val } from "@plumjs/plumier"

@collection()
export class User {
    constructor(
        public name: string,
        @val.unique()
        public email:string,
        public image: string,
        public address:string,
        public city:string,
        public zip:string,
    ) { }
}
```