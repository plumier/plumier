# TypedConverter
Convert object into classes match with TypeScript type annotation

[![Build Status](https://travis-ci.org/plumier/typedconverter.svg?branch=master)](https://travis-ci.org/plumier/typedconverter)
[![Coverage Status](https://coveralls.io/repos/github/plumier/typedconverter/badge.svg?branch=master)](https://coveralls.io/github/plumier/typedconverter?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/plumier/typedconverter.svg)](https://greenkeeper.io/)


## Performance 
TypedConverter uses several performance optimization, first it traverse Type properties using efficient properties traversal then compiles TypeScript types into optimized object graph contains functions for conversion. 

Performance compared to Joi
```
Test Type                          Sec
Joi - Type conversion            17.62
Joi - Validation                 61.67
TypedConverter - Type conversion  7.29
TypedConverter - Validation      23.51
```

To run benchmark: 
* Clone this repo 
* `yarn install` 
* `yarn benchmark`

## Usage 

```typescript
import reflect from "@plumier/reflect"
import { createValidator, val } from "@plumier/validator"

@reflect.parameterProperties()
class User {
    constructor(
        @val.email()
        public email:string,
        public name:string,
        @val.before()
        public dateOfBirth:Date,
        public isActive:boolean
    ){}
}

// create validation function
const validate = createValidator(User)
// this configuration will result the same
// const validate = createValidator({ type: User })
// validate raw value
const user = validate({ 
    email: "john.doe@gmail.com", name: "John Doe", 
    dateOfBirth: "1991-1-2", isActive: "true" 
})

// create validation function for array
const validate = createValidator([User])
// validate raw value
const user = validate([{ 
    email: "john.doe@gmail.com", name: "John Doe", 
    dateOfBirth: "1991-1-2", isActive: "true" 
}, { 
    email: "jane.deane@gmail.com", name: "Jane Deane", 
    dateOfBirth: "1994-1-2", isActive: "false" 
},
])


```

## Without Factory
`createValidator` good to have a shared validator configuration, but for single usage its better to use the `validate` function. 

```typescript
import reflect from "@plumier/reflect"
import { validate, val } from "@plumier/validator"

@reflect.parameterProperties()
class User {
    constructor(
        @val.email()
        public email:string,
        public name:string,
        @val.before()
        public dateOfBirth:Date,
        public isActive:boolean
    ){}
}

// pass the Type as the second parameter
const user = validate({ 
    email: "john.doe@gmail.com", name: "John Doe", 
    dateOfBirth: "1991-1-2", isActive: "true" 
}, User)
// can be passed as option too
// const user = validate(<raw value>, { type: User })
```

## Guess Array Element
Useful when converting data from url encoded, where single value could be a single array. 

```typescript
const b = await convert("1", { type: [Number], guessArrayElement: true }) // -> result = [1]
```

Note that, when the type passed to the configuration is of type Array, providing single value will guessed as Array.

## Extending with Visitors
Visitors executed after conversion process traverse through properties / array element. Invocation can be multiple and run in sequence the last sequence will execute the converter. Visitors work like [Plumier middleware](https://plumierjs.com/docs/middleware)

Signature of Visitor is like below: 

```typescript
type Visitor = (invocation: VisitorInvocation) => VisitorResult
```

Visitor is a function receive two parameters `value` and `invocation`. 
* `invocation` next invocation 

Example:


```typescript
import { createValidation, Result, VisitorInvocation } from "@plumier/validator"

const olderThanEightTeen = (i: VisitorInvocation) => {
    if (i.type === Number && i.value < 18)
        return Result.error(i.path, "Must be older than 18")
    else
        return i.proceed()
}

const validate = createValidation({ type: Number, visitors: [olderThanEightTeen] })
const result = validate("40") // { value: 40 }
const other = validate("12") // { issues: [{path: "", messages: ["Must be older than 18"]}]  }
```