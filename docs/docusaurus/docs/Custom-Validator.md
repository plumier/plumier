---
id: custom-validator
title: Custom Validator
---

Custom validator can be created using `@val.custom` decorator, you can wrap the `@val.custom` inside a function and make a new validator decorator, and provide logic on the Validator function callback. Validator function signature is like below:

```typescript 
(value: string, info: ValidatorContext) => string | AsyncValidatorResult[] | undefined | Promise<AsyncValidatorResult[] | string | undefined>
```

* `value` is the current value that will be validated. value will always of type string
* `info` is the context information required for validation see below
* return value: return error message if not valid, or return `undefined` for valid value.

Signature of the `ValidatorContext` is like below

```typescript
interface ValidatorContext {
    name: string,
    ctx: Context,
    parent?: { type: Class, decorators: any[] }
}
```

* `name` name of the current validating property or parameter 
* `ctx` Koa context of current request 
* `parent` parent class of current validation property, can be `undefined` if the current validating is a method parameter

### Example
For example we will create an age restriction validator which restrict only 18+ age allowed.

```typescript
import { val } from "@plumier/validator";

export async function is18plus(){
    return val.custom(val => parseInt(val) < 18 : "Should greater than 18 years old" : undefined)
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
    return val.custom((x, info) => {
        if(x.password !== x.confirmPassword)
            return val.result("confirmPassword", "Password is not the same") 
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


## Separate Decorator and Its Implementation
Putting validator implementation inside decorator is simple and easy to read, but in some case it might cause circular dependency issue. You can use dependency resolver to solve this issue, by register the validator classes by ID. 

The first step, create a class implements `CustomValidator` interface like below.

```typescript
import { CustomValidator, ValidatorContext, DefaultDependencyResolver } from "plumier"

//create instance of DefaultDependencyResolver globally
const resolver = new DefaultDependencyResolver()

//register the custom authorizer with the ID
@resolver.register("is18plus")
export class Is18PlusValidator implements CustomValidator {
    validate(value: any, info: ValidatorContext)
        if(parseInt(val) < 18)
            return "Should greater than 18 years old"
    }
}
```

Register the created resolver into the Plumier application 

```typescript
import { Plumier, WebApiFacility } from "plumier"

const app = new Plumier()
    .set(new WebApiFacility({ dependencyResolver: resolver }))
    //other facilities or middlewares
    .initialize()
```

Then use the ID on each authorization applied. 

```typescript

@domain()
class User {
    constructor(
        //use the ID here, Plumier will use resolver 
        //to create instance of the custom authorizer 
        //then execute it
        @val.custom("is18plus")
        public age:number
    ){}
}
```

:::info 
This functionality work well with dependency injection, register the custom validator by name/id and plumier will automatically pass the ID into the custom dependency resolver.
:::