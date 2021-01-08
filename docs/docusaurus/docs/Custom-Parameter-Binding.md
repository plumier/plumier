---
id: custom-parameter-binding
title: Custom Parameter Binding
---

Custom parameter binding can be created easily by using `@bind.custom` decorator. You can create a new decorator by wrap the `@bind.custom` decorator inside a function.

Example below we will create parameter binder for ip address (instead of using `@bind.request("ip")`)


```typescript
import {bind} from "plumier"

export function ip(){
    return bind.custom(ctx => ctx.request.ip)
}
```

The main logic of parameter binding is in inside the function callback, where the logic of which part of the context will be bound to the parameter. The call back function signature is like below:

```typescript
process: (context:Koa.Context) => any
```

To use the `ip` decorator above is like below:

```typescript
export class AnimalController {
    @route.get()
    save(@ip() ipAddress:string){

    }
}
```