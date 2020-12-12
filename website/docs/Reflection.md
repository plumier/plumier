---
id: reflection-basic
title: Reflection Fundamentals
---

If you're coming from a static types language such as C# or Java you may found that TypeScript reflection is quite odd, since its only supported reflection using decorators, thus TypeScript unable to use reflection as automatic as C# or Java. 

:::info
Plumier uses dedicated reflection library `@plumier/reflect`, that make it possible to extract type information statically.
:::

This documentation Explain about above limitation and how we commonly resolved those issue using decorators in TypeScript. By understanding its limitation, you will able to use Plumier components properly.


## Problem with Property Fields 
JavaScript uses property fields dynamically, its make it impossible for framework to get the property information statically. Thus its required to use at least one decorator on property field declaration like below

```typescript 
import { noop } from "@plumier/reflect"

class AnimalModel {
    @noop()
    id:number 

    @noop()
    name:string
}
```

Above code showing that we decorate each class properties with decorators. `@noop()` decorator actually does nothing except to get the information of the property statically. 

If you are using `strict:true` TypeScript configuration its impossible to define property without initialization. Its possible to use constructor property for property declaration like below

```typescript 
import { parameterProperties } from "@plumier/reflect"

@parameterProperties()
class AnimalModel {
    constructor(
        public id:number,
        public name:string
    ){}
}
```

`@parameterProperties()` will tell reflection that all constructor parameter is parameter property. Plumier has `@domain()` decorator which is just an alias of `@parameterProperties()`, so they can be used appropriately. 

## Problem With Data Type Information

TypeScript provided `emitDecoratorMetadata` to emit type information on decorated declaration. Its make it possible to get data type information of properties, parameters and method return type. 

```typescript 
import { noop } from "@plumier/reflect" 

class AnimalRepository {

    @noop()
    get(type:string): Animal{
        return 
    }
}
```

`@noop()` decorator above the `get` method will persist the data type information of the `get` method such as `type` parameter data type, and its return value data type.

## Problem With Generic Data Type 

Decorator possible to provide data type like explained above, but it unable to provide further information of generic data type such as `Array<number>` or `Partial<Animal>`. Reflection provided decorator to define data type using `@type()`

```typescript 
import { noop } from "@plumier/reflect" 

class AnimalRepository {

    @type([Animal])
    get(type:string): Animals[]{
        return 
    }
}
```

Above code showing that we decorate the `get` method with `@type([Animal])`, which informed reflection that the return type of the method is Array of Animal. Notice that tuple used for array type `[Animal]`.

This behavior also required on property with data type array 

```typescript 
import { noop, type } from "@plumier/reflect"

class AnimalModel {
    @noop()
    id:number 

    @type([String])
    tags:string[]
}
```

Above showing that we use `@type([String])` above the `tags` property which is of type `string[]`. Note that the type used is the string constructor `[String]` (capitalized) instead of `[string]`.

Its also required when using parameter properties like below 

```typescript 
import { parameterProperties } from "@plumier/reflect"

@parameterProperties()
class AnimalModel {
    constructor(
        public id:number,
        @type([String])
        public tags:string[]
    ){}
}
```