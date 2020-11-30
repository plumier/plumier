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
import {collection } from "@plumier/mongoose"

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
import {collection } from "@plumier/mongoose"

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

@collection({ name: "Empty" })
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
const DummyModel = model(Dummy)
// calling next model will not require passing name
const SecondDummyModel = model(Dummy)
```

### Schema Generation Hook
Its possible to provide hook when mongoose schema generated, so its possible to register the mongoose middleware from provided schema like below: 

```typescript
@collection({
    hook: (schema) => {
        schema.pre("save", async function (this: Dummy & mongoose.Document) {
            const newString = await new Promise<string>(resolve => setTimeout(() => resolve("Delayed"), 100))
            this.stringProp = newString
        })
    } 
})
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
const DummyModel = model(Dummy)
```

### PreSave Decorator 
You can add hook during schema generation, but for simple use case to hash password before saving is too messy if using hook and `pre` middleware. Plumier provided `@collection.preSave()` decorator to automatically call decorated method before save.

```typescript
@collection()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }

    @collection.preSave()
    async beforeSave() {
        this.stringProp = await new Promise<string>(resolve => setTimeout(() => resolve("Delayed"), 100))
    }
}
const DummyModel = model(Dummy)
```

## Relation with Cyclic Dependency 
Its possible to map relation with cyclic dependency using mongoose helper using `proxy` method. `proxy` will defer schema generation until its first accessed, thus make it able to get the proper data type.

:::info
Note when you define model with cyclic dependency its required to use `Ref<T>`  data type and use callback on the `@collection.ref()` parameter to prevent TypeScript `ReferenceError: Model is not defined` error.
:::

```typescript
import { collection, proxy, Ref } from "@plumier/mongoose"

@collection()
class Child {
    constructor(
        public name:string,
        // use callback to define ref type
        @collection.ref(x => Dummy)
        // use Ref<T> to define data type
        public dummy:Ref<Dummy>
    ){}
}

const ChildModel = proxy(Child)

@collection()
class Dummy {
    constructor(
        public name:string,
        // nested array of model 
        @collection.ref(x => [Child])
        public children: Ref<Child[]>,
    ) { }
}

const DummyModel = proxy(Dummy)
```

## Unique Validation
Mongoose helper provided `@val.unique()` that augmented (merged) with `@plumier/validator` module. Means if you install `@plumier/mongoose` `@val` decorator will automatically has `unique()` function.

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
Mongoose helper provided custom object converter, so it possible to post relational data (with populate) from HTML Form by providing the ObjectId of the child model.

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
        @collection.ref([Image])
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
