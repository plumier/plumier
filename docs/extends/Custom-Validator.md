---
id: custom-validator
title: Custom Validator
---

Custom validator can be created using `@val.custom` decorator, you can wrap the `@val.custom` inside a function and make a new validator decorator, and provide logic on the Validator function callback. Validator function signature is like below:

```typescript 
(value: string, info: ValidatorInfo) => Promise<AsyncValidatorResult[] | string | undefined>
```

* `value` is the current value that will be validated. value will always of type string
* `info` is the context information required for validation see below
* return value: return error message if not valid, or return `undefined` for valid value.

Signature of the `ValidatorInfo` is like below

```typescript
interface ValidatorInfo {
    name: string,
    route: RouteInfo,
    ctx: Context,
    parent?: { type: Class, decorators: any[] }
}
```

* `name` name of the current validating property or parameter 
* `route` route information, contains metadata information of current route 
* `ctx` Koa context of current request 
* `parent` parent class of current validation property, can be `undefined` if the current validating is a method parameter

### Example
For example we will create an age restriction validator which restrict only 18+ age allowed.

```typescript
import { val } from "@plumier/validator";

export async function is18plus(){
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

The `info` parameter of the validator function useful when you need to validate value that require request context parameter such as `body`, `params` etc.

### Class Validation
Sometime its not possible to validate value only on single property, but require multiple properties. Real world example is the confirm password.

```typescript
function checkConfirmPassword() {
    return val.custom(async (x, info) => {
        return x.password !== x.confirmPassword ? [{ path: "confirmPassword", messages: ["Password is not the same"] }] : undefined
    })
}

@domain()
class User {
    constructor(
        public password: string,
        public confirmPassword: string
    ) { }
}

class UsersController {
    @route.post()
    get(@checkConfirmPassword() model: User) { }
}
```

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
    "val:18+": async (val:string) =>  parseInt(val) < 18 : "Should greater than 18 years old" : undefined
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
