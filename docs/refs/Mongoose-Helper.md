---
id: mongoose-helper
title: Mongoose Helper
---

Generate [Mongoose](http://mongoosejs.com/) schema based on your domain model.

## Enable The Functionality
MongoDB helper is optional in Plumier, it can be enabled by installing `@plumier/mongoose` module and plug `MongooseFacility` into Plumier application.

```typescript
const plum = new Plumier()
plum.set(new MongooseFacility({ uri: "mongodb://localhost:27017/test-data" }))
//if no uri provided will check for environment variable PLUM_MONGODB_URI
plum.set(new MongooseFacility())
```

Mongoose facility will automatically connect to the MongoDB database and make sure it ready before application started.

There are several ways to use the mongodb connection: 
1. By providing the uri on the `MongooseFacility` constructor, like example above.
2. By providing the environment variable named `PLUM_MONGODB_URI`. This can be achieve using `.env` file or by set the environment variable manually.
3. If none above provided, connection should be done manually using `mongoose.connect()` function. 

## Domain Model Declaration 
Plumier Mongoose Helper uses tinspector to extract type metadata on runtime. Currently there are two domain models declaration supported

### Using Property Field 
```typescript
@collection()
class Dummy {
    @collection.property()
    stringProp: string

    @collection.property()
    numberProp: number

    @collection.property()
    booleanProp: boolean

    @collection.property()
    dateProp: Date
}
```

This is the common model declaration when you are familiar with Nest.js or other TypeScript framework. This declaration required `strictPropertyInitialization` disabled on `tsconfig.json` file. Note that the `@collection.property()` is required when there are no decorator applied on the property. 

### Using TypeScript Parameter Properties

```typescript 
import reflect from "tinspector"

@collection()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
```

This declaration good when `tsconfig.json` uses `strict: true` because we unable to use field properties. Using this declaration reduce the need of using `@collection.properties()` on all properties. 

## Create Model
`@plumier/mongoose` provided `model` function to create Mongoose model

```typescript
import { model } from "@plumier/mongoose"

const UserModel = model(User)
```

> You can create model anywhere in your code, but best practice is put them under the domain model class.


## Helper API Overview 
Plumier Mongoose Helper help you easily map your domain model and create Mongoose model using it. Helper automatically generate schema definition based on your domain model metadata.

```typescript
import { model, collection } from "@plumier/mongoose"

// base class, all derived class will inherit the behavior
@collection({ timestamp: true, toJSON: { virtuals: true } })
class Domain {
    @collection.property()
    id:string
    @collection.property({ default:false })
    deleted:boolean
    @collection.property()
    createdAt:Date
    @collection.property()
    updatedAt:Date
}

@collection()
class User extends Domain{
    constructor(
        public name:string,
        @collection.property({ unique:true })
        public email:string,
        public dateOfBirth: Date
    ) { super() }
}

// create mongoose model
const UserModel = model(User)

@collection()
class UserActivity extends Domain {
    constructor(
        @collection.ref(User)
        public user: User,
        @collection.property({ default: () => new Date() })
        public date: Date,
        public browser:string,
        public os:string,
        @reflect.types([Number])
        public latLong: number[]
    ){ super() }
}

// create mongoose model
const UserActivityModel = model(UserActivity)
``` 

## Helper API

### Basic Schema Generation 

```typescript
import { model, collection } from "@plumier/mongoose"

@collection()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
// create Mongoose model by using below
const DummyModel = model(Dummy)
// example usage
const result = await DummyModel.findById(<id>)
// model can be called multiple time to create other model instance
// for example from inside controller or in other place
const SecondDummyModel = model(Dummy)
```

### Advanced Data Type 
Array type required extra decorator information. Use `@reflect.type([<type>])` decorator to inform generator about extra type information.

```typescript
import { model, collection } from "@plumier/mongoose"

@collection()
class Child {
    constructor(
        public name:string
    ){}
}

@collection()
class Dummy {
    constructor(
        // primitive array
        @reflect.type([String])
        public arrayOfPrimitive: string[],

        // nested type 
        public child: Child,

        // nested array of model 
        @reflect.type([Child])
        public children: Child[],
    ) { }
}

const DummyModel = model(Dummy)
```

### Nested Document With Ref (Populate)
```typescript
import { model, collection } from "@plumier/mongoose"

@collection()
class Child {
    constructor(
        public name:string
    ){}
}

@collection()
class Dummy {
    constructor(
        // nested type 
        @collection.ref(Child)
        public child: Child,

        // nested array of model 
        @collection.ref([Child])
        public children: Child[],
    ) { }
}

const ChildModel = model(Child)
const DummyModel = model(Dummy)
```

### Configure Properties 
Extra Mongoose schema configuration can be passed to each decorator 

```typescript
import { model, collection } from "@plumier/mongoose"

@collection({ timestamps: true, toJSON: { virtuals: true } })
class Dummy {
    constructor(
        @collection.property({ uppercase:true })
        public stringProp: string,
        @collection.property({ unique:true })
        public email: string,
        @collection.property({ default:() => new Date() })
        public dateProp: Date
    ) { }
}

const DummyModel = model(Dummy)
```

### Inheritance 
Inheritance work naturally, all child document will inherit parent configuration properly. 

```typescript
import { model, collection } from "@plumier/mongoose"

@collection({ timestamp: true })
class DomainBase {
    @collection.property({ default:false })
    deleted:boolean
    @collection.property()
    createdAt:Date
    @collection.property()
    updatedAt:Date
}

@collection()
class Dummy extends DomainBase{
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { super() }
}

const DummyModel = model(Dummy)
```

Using configuration above, all class inherited from `DomainBase` will have `deleted` property with default value `false` and properties `createdAt` and `updatedAt` which automatically populated as timestamps.

### Custom Model Name 

```typescript
import { model, collection } from "@plumier/mongoose"

@collection()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
// use the second parameter to change the model name
const DummyModel = model(Dummy, "Empty")
// calling next model will not require passing name
const SecondDummyModel = model(Dummy)
```

### Schema Generation Hook

```typescript
import { model, collection } from "@plumier/mongoose"
import mongoose from "mongoose"

@collection()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
// pass function on second parameter to hook schema generation
const DummyModel = model(Dummy, schema => {
    schema.pre("save", next => {
        // do something
        next()
    })
})
// calling next model will not require passing the hook
const SecondDummyModel = model(Dummy)
```

## Unique Validation
Mongoose helper provided `@val.unique()` that augmented (merged) with `@plumier/validator` module. Means if you install `@plumier/mongoose` `@val` decorator will automatically has `unique()` function.

> This validation done some http check and only work on `POST` method, since for `PUT` and `PATCH` method, uniqueness check require more complex condition.

This function is not using the mongoose `unique` schema, but it automatically check to the database for uniqueness, so validation engine can execute the validation rule without touching controller.

```typescript
import { val } from "plumier"

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

## POST Form With Relational Data
Mongoose helper provided custom object converter, so it possible to post relational data from HTML Form by providing the ObjectId of the child model.

```typescript
//domains
@collection()
class Image {
    constructor(
        public name: string
    ) { }
}
@collection()
class Animal {
    constructor(
        public name: string,
        @array(Image)
        public images: Image[]
    ) { }
}
const ImageModel = model(Image)
const AnimalModel = model(Animal)

//controller
class AnimalController {
    @route.post()
    async save(data: Animal) {
        const newly = await new AnimalModel(data).save()
        return newly._id
    }
}
```

Above code showing that we created a route named `POST /animal/save` which will save Animal information with relational data which is images data that previously saved. Below request will be valid:

```
POST /animal/save
payload:
{name: "Mimi", images: ["507f191e810c19729de860ea", "507f191e810c19729de239ca"]}
```
