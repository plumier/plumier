# Plumier Mongoose Helper

[![Build Status](https://github.com/plumier/plumier/workflows/ubuntu/badge.svg)](https://github.com/plumier/plumier/actions?query=workflow%3Aubuntu)
[![Build status](https://github.com/plumier/plumier/workflows/windows/badge.svg)](https://github.com/plumier/plumier/actions?query=workflow%3Awindows)
[![Coverage Status](https://coveralls.io/repos/github/plumier/plumier/badge.svg?branch=master)](https://coveralls.io/github/plumier/plumier?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/plumier/plumier.svg)](https://greenkeeper.io/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
![npm (canary)](https://img.shields.io/npm/v/plumier/canary)
![npm (latest)](https://img.shields.io/npm/v/plumier/latest)



## Description
Plumier Mongoose Helper help you easily map your domain model and create Mongoose model using it. Helper automatically generate schema definition based on your domain model metadata.

- [x] Pure POJO, used conditional type to increase type inference on nested documents.
- [x] Same schema configuration used by mongoose
- [x] Inheritance
- [x] Field properties or parameter properties declaration
- [x] Model analysis

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
import { collection } from "@plumier/mongoose"

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

## Features 

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

const dummy = await DummyModel.findById("").populate("child")
// child inferred as Document, so its possible to call Document related props/methods
dummy.child.id
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

### Model Analysis 
Mongoose helper has built-in model analysis contains information about model, configuration and their appropriate MongoDB collection, use it like below


```typescript
import { model, collection, printAnalysis, getAnalysis } from "@plumier/mongoose"

@collection()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
const DummyModel = model(Dummy)

// somewhere when your code starting
printAnalysis(getAnalysis())
```

## Dockify
`Dockify<T>` is an advanced TypeScript type, it converts all Property of `T` inherit from `Object` into mongoose `Document`. For example: 

```typescript 
class Child {
    constructor(
        public name:string
    ){}
}

class Parent {
    constructor(
        public child:Child
    ){}
}

let parent:Dockify<Parent>
// child property converted into `Child & mongoose.Document` 
// thus its possible access document properties/method like below
parent.child._id
parent.child.save()
```

`Dockify<T>` provide syntax sugar to access ref (populate) properties, while keep entity definition POJO (clean from Mongoose specific types). 

> **CAVEAT**: Dockify will treat all properties with custom type as Document, thus for non ref (populate) property will keep inferred as `Document`. 


