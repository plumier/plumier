---
id: custom-validator
title: Custom Validator
---

Custom validator can be created using `@val.custom` decorator, you can wrap the `@val.custom` inside a function and make a new validator decorator, and provide logic on the Validator function callback. Validator function signature is like below:

```typescript 
(value: string, ctx:Context) => Promise<string | undefined>
```

* `value` is the current value that will be validated. value will always of type string
* `ctx` the Koa context of current request
* return value: return error message if not valid, or return `undefined` for valid value.

### Example
For example we will create an age restriction validator which restrict only 18+ age allowed.

```typescript
import { val } from "@plumier/validator";

export function is18plus(){
    return val.custom(async val => parseInt(val) < 18 : "Should greater than 18 years old" : undefined)
}
```

Then you can use our new validator like below:

```typescript
@domain()
class User {
    constructor(
        @is18Plus()
        public age:number
    ){}
}
```

The `ctx` parameter of the validator function useful when you need to validate value that require request context parameter such as `body`, `params` etc.

### Separate Decorator and Implementation
Validator decorator sometime need to be free from dependencies, for example if you want to separate Domain (with validation) into single package and will be shared between UI and Server side. Thus, validation that tightly coupled with database logic (for example `@val.unique()`) can't be used.

Plumier provided separation between logic and decorator by providing `ID` of the validator logic inside configuration, example:

```typescript
//@plumier/validator can be used in UI and Server because it uses pure JS code
import { val } from "@plumier/validator";

export function is18plus(){
    return val.custom("val:18+") //provided the ID (val:18+)
}
```

Define logic of the validation by providing key-value pair of validator id and validator logic like below

```typescript
//here is separate logic (can be place in different file)
export const validatorStore:ValidatorStore = {
    "val:18+": function (val:string){
        return async val => parseInt(val) < 18 : "Should greater than 18 years old" : undefined
    }
}
export 
```

To use it, register the validator logic on the configuration, can be from `WebApiFacility`, `RestfulApiFacility` or from `Plumier.set({validators: {}})`

```typescript

const plumier = new Plumier()
plumier.set(new WebApiFacility({ validators: validatorStore }))
//or 
plumier.set(new RestfulApiFacility({ validators: validatorStore }))
//or
plumier.set({ validators: validatorStore })
```
