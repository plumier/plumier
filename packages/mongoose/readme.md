# Plumier Mongoose Helper

[![Build Status](https://travis-ci.org/plumier/plumier.svg?branch=master)](https://travis-ci.org/plumier/plumier)
[![Build status](https://ci.appveyor.com/api/projects/status/6carp7h4q50v4pj6?svg=true)](https://ci.appveyor.com/project/ktutnik/plumier-isghw)
[![Coverage Status](https://coveralls.io/repos/github/plumier/plumier/badge.svg?branch=master)](https://coveralls.io/github/plumier/plumier?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/plumier/plumier.svg)](https://greenkeeper.io/)
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)
![npm (canary)](https://img.shields.io/npm/v/plumier/canary)
![npm (latest)](https://img.shields.io/npm/v/plumier/latest)


## Motivation


## Domain Model Declaration 
Plumier Mongoose Helper uses tinspector to extract type metadata on runtime. Currently there are some domain model declaration supported

### Using Property Field 
```typescript
class Dummy {
    @document.property()
    stringProp: string

    @document.property()
    numberProp: number

    @document.property()
    booleanProp: boolean

    @document.property()
    dateProp: Date
}
```

This is the common model declaration when you are familiar with Nest.js or other TypeScript framework. 

This declaration required `strictPropertyInitialization` disabled on `tsconfig.json` file. 

Note that the `@document.property()` is required when there are no decorator applied on the property. 

### Using TypeScript Parameter Properties

```typescript 
import reflect from "tinspector"

@document()
class Dummy {
    constructor(
        public stringProp: string,
        public numberProp: number,
        public booleanProp: boolean,
        public dateProp: Date
    ) { }
}
```

This declaration good when `tsconfig.json` uses `strict: true` because we unable to use field properties. 

Using this declaration reduce the need of using decorators on all properties.

Note that `@document()` is required to mark all the constructor parameter is a parameter properties, internally it uses tinspector `@reflect.parameterProperties()` decorator. This decorator is not required when using property field declaration.

Optionally you can use `@domain()` from `@plumier/core` to mark your model instead of using `@document()` because it uses the same function.


## Features 

### Basic Schema Generation 

```typescript
import { model, document } from "@plumier/mongoose"

@document()
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
```

### Advanced Data Type (Non Populate)
Array type required extra decorator information. Use `@reflect.type([<type>])` decorator to inform generator about extra type information.

```typescript
import { model, document } from "@plumier/mongoose"

@document()
class Child {
    constructor(
        public name:string
    ){}
}

@document()
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
import { model, document, schema } from "@plumier/mongoose"

@document()
class Child {
    constructor(
        public name:string
    ){}
}

@document()
class Dummy {
    constructor(
        // nested type 
        @document.ref(Child)
        public child: Child,

        // nested array of model 
        @document.ref([Child])
        public children: Child[],
    ) { }
}

const ChildModel = model(Child)
const DummyModel = model(Dummy)
```

### Configure Properties 
Extra Mongoose schema configuration can be passed using 

```typescript
import { model, document, schema } from "@plumier/mongoose"

@document({ timestamps: true })
class Dummy {
    constructor(
        @document.property({ uppercase:true })
        public stringProp: string,
        @document.property({ unique:true })
        public email: string,
        @document.property({ default:() => new Date() })
        public dateProp: Date
    ) { }
}
// create Mongoose model by using below
const DummyModel = model(Dummy)
```

### Inheritance 
Inheritance work naturally, all child document will inherit parent configuration properly. 

```typescript
import { model, document, schema } from "@plumier/mongoose"

@document({ timestamp: true })
class DomainBase {
    // default value = false
    @document.property({ default:false })
    deleted:boolean
    @document.property()
    createdAt:Date
    @document.property()
    updatedAt:Date
}

@document()
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
