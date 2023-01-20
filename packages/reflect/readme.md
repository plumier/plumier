# Reflect: A JavaScript/TypeScript Reflection Library

A reflection library that extracts JavaScript/TypeScript object into an object graph containing object preferences and metadata information


## Companies Using Reflect

[![HP Inc](https://avatars.githubusercontent.com/u/9728779?s=200)](https://github.com/HPInc)

## Example Usage

```typescript
import reflect from "@plumier/reflect"

class Awesome{
    awesome(){}
}

class MyAwesomeClass extends Awesome {
    @decorateMethod({ cache: "20s" })
    myAwesomeMethod(stringPar:string, numberPar:number): number {
        return Math.random()
    }
}

const obj = reflect(MyAwesomeClass)
```

Result of `obj` variable above is like below
    
```javascript
{
    kind: 'Class',
    name: 'MyAwesomeClass',
    type: MyAwesomeClass,
    decorators: [],
    properties: [],
    ctor: {
        kind: 'Constructor',
        name: 'constructor',
        parameters: []
    },
    methods: [
        {
            kind: 'Method',
            name: 'myAwesomeMethod',
            parameters: [
                {
                    kind: 'Parameter',
                    name: 'stringPar',
                    type: String,
                    decorators: [],
                    properties: {}
                },
                {
                    kind: 'Parameter',
                    name: 'numberPar',
                    type: Number,
                    decorators: [],
                    properties: {}
                }
            ],
            decorators: [{ cache: '20s' }],
            returnType: Number,
        },
        {
            kind: 'Method',
            name: 'awesome',
            parameters: [],
            decorators: [],
            returnType: undefined,
        }
    ]
}
```

## Features

- [x] Inspect function
- [x] Inspect module or file
- [x] Inspect class
- [x] Inspect class with inheritance
- [x] Inspect getter and setter
- [x] Inspect methods
- [x] Inspect parameters
- [x] Supported inspect destructured parameter
- [x] Supported inspect rest parameter
- [x] Supported inspect parameter with complex default value
- [x] (TypeScript only) Inspect metadata using decorators
- [x] (TypeScript only) Inspect parameter properties
- [x] (TypeScript only) Inspect type information 
- [x] (TypeScript only) Configurable decorator (inheritable / allow multiple)
- [x] (TypeScript only) Generic class inheritance

## TypeScript Requirement
To be able to inspect type information its required to enable configuration below in `tsconfig.json`

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true           
  }
}
```

## Inspect Type Information
TypeScript when `emitDecoratorMetadata` enabled, TypeScript will add type information during compile time. This make it possible to extract typescript type information during runtime. 

> **CAVEAT**
>  
> TypeScript `emitDecoratorMetadata` has some limitation. 
> * Declaration should have at least one decorator to get metadata (type information)
> * Array element type information not included. 
> * Generic type information not included.

Based on limitation above its required at least have one decorator to make reflection to be able to extract type information: 

```typescript 
import reflect from "@plumier/reflect"

class Awesome {
    @reflect.noop()
    awesome(multiply:number): number { return 1 }
}

const obj = reflect(Awesome)
```

reflection will be able to get type information of the method's return type and parameters of the `awesome` method above. Note that we applied `@reflect.noop()` decorator on the `awesome` method. `@reflect.noop()` does nothing except to force TypeScript to emit metadata information.

```typescript 
import reflect from "@plumier/reflect"

class Awesome {
    @reflect.noop()
    aweProperty:number
}

const obj = reflect(Awesome)
```

Above code showing that we able to get type information of a property. 

```typescript 
import reflect from "@plumier/reflect"

@reflect.noop()
class Awesome {
    constructor(multiply:number){}
}

const obj = reflect(Awesome)
```
Above code showing that we able to get type information of parameters of the constructor, by applying decorator on the class level. 

## Inspect Array and Generic Type
To get type information of an Array and Generic type its required to use `@reflect.type()` decorator and provide the type on the callback parameter.

```typescript 
import reflect from "@plumier/reflect"

class Awesome {
    @reflect.type([Number])
    awesome(multiply:number): Array<number> {}
}

const obj = reflect(Awesome)
```

Above code showing that we able to get method's return type information by providing `@reflect.type([Number])`. Note that the `[Number]` is an array of `Number`. 

```typescript 
import reflect from "@plumier/reflect"

class Option { 
    data:string
}

class Awesome {
    @reflect.type(Option)
    awesome(multiply:number): Partial<Option> {}
}

const obj = reflect(Awesome)
```

We will be able to get generic type information such as `Partial`, `Required` etc by applying `@reflect.type()` like above. 

> If you receive `ReferenceError: <type name> is not defined` error, thats mean you use `@reflect.type(MyType)` prior than its declaration. To solve this issue you can use callback `@reflect.type(x => MyType)` or `@reflect.type(x => [MyType])` for array type.

## Inspect Generic Class Information
With above trick its possible to get generic type information in a generic class members with some extra configuration below

```typescript
@generic.parameter("T", "U")
class SuperAwesome<T, U> {
    awesome(@reflect.type("T") par: T, @reflect.type("U") par2: U) {}
}

@generic.argument(Number, String)
class Awesome extends SuperAwesome<Number, String> { }

const obj = reflect(Awesome)
```

Above code showing that we add a specialized decorator `@generic.parameter()` to define generic type parameter. We also defined data type of the generic parameters using `@reflect.type()` decorator. Next on the inherited class we specify `@generic.argument()` to define types replace the generic template. Note that the order of the parameter on `@generic.parameter()` and `@generic.argument()` is important.

## Inspect Parameter Properties
TypeScript has parameter properties feature, which make it possible to use constructor parameter as property. reflection able to extract parameter properties type information by using `@reflect.parameterProperties()` decorator.

```typescript 
import reflect from "@plumier/reflect"

@reflect.parameterProperties()
class Awesome {
    constructor(public multiply:number){}
}

const obj = reflect(Awesome)
```

## Metadata Decorator 
Reflection able to extract classes/methods/properties/parameters decorated with predefined metadata decorators. There are predefined decorators should be use to be able for reflection to inspect the decorators

| Decorator           | Description                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `decorateClass`     | Decorate class with object specified in parameter                                    |
| `decorateProperty`  | Decorate property with object specified in parameter                                 |
| `decorateMethod`    | Decorate method with object specified in parameter                                   |
| `decorateParameter` | Decorate parameter with object specified in parameter                                |
| `decorate`          | Decorate any (class, property, method, parameter) with object specified in parameter |
| `mergeDecorator`    | Merge multiple decorators into one, useful on creating custom decorator               |

Example usage

```typescript
import { decorateClass, decorateProperty } from "@plumier/reflect"

@decorateClass({ message: "hello world" })
class Awesome {
    @decorateProperty({ message: "awesome!" })
    awesome: number = 10
}
```

Parameter passed on each decorator can be any object contains value, methods etc, those value will be returned when the class metadata extracted.

Create your own custom decorator by creating function returns decorator above

```typescript
import { decorateMethod } from "@plumier/reflect"

// create custom decorator
function cache(duration:number){
    return decorateMethod({ type: "Cache", duration })
}

class Awesome{
    @cache() // use it like usual decorator
    awesome(){}
}
```

Use `mergeDecorator` to combine multiple decorator on custom decorator


```typescript
import { decorateMethod, mergeDecorator } from "@plumier/reflect"

// create custom decorator
function cacheAndDelay(duration:number){
    return mergeDecorator([
        decorateMethod({ type: "Cache", duration }), 
        decorateMethod({ type: "Delay", duration })
    ])
}
```

## Decorator Option (Inheritance, Allow Multiple)
Decorator can be further configured to match the behavior you need like below.

```typescript
decorateMethod(<data>, <option>)
```

Option is a simple object with properties: 

* `inherit` `Boolean` If `false` decorator will not be merged on the derived class. Default `true` 
* `allowMultiple` `Boolean` If `false` throw error when multiple decorator applied on class. Also when set `false` will prevent super class decorator being merged into derived class when already exists. When set `false`, decorator required to have `DecoratorId` property to identify the similar decorator.
* `applyTo` `String` or `String[]` apply decorator into the specified properties or methods.
* `removeApplied` `Boolean` Remove applied decorator using `applyTo` on the class scope. Default `true`.


Example disable decorator inheritance

```typescript
@decorateClass({ log:true }, { inherit: false })
class Awesome {
    awesome(){}
}

// { log: true} will not inherited on this class
class IamAwesome extends Awesome{ }
```

Example disable multiple decorator on inheritance

```typescript
import { DecoratorId, decorateClass } from "@plumier/reflect"

function log(){
    return @decorateClass({ [DecoratorId]: "logging",  log:true }, { allowMultiple: false })
}

@log()
class Awesome {
    awesome(){}
}

// parent decorator will not merged
// guaranteed derived class only have single decorator with specific ID
@log()
class IamAwesome extends Awesome{ }
```

## Apply Decorator from Class
Sometime its required to add decorator into specific methods or properties from class. This is useful when you want to decorate specific super class method from derived class. Use `applyTo` and `removeApplied` properties on decorator option to control decorator to be copied into the properties or methods.


```typescript
import { decorateClass } from "@plumier/reflect"

@decorateClass({ message: "hello world" }, { applyTo: "myMethod" })
class Awesome {
    myMethod(){}
}
```

By specifying `{ applyTo: "myMethod" }` on the decorator option will make the decorator copied into the `myMethod` method, while the decorator removed from the class. 

```typescript
import { decorateClass } from "@plumier/reflect"

@decorateClass({ message: "hello world" }, { applyTo: "myMethod", removeApplied: false })
class Awesome {
    myMethod(){}
}
```

Above code will copy decorator into `myMethod` method but keep the decorator on the class.

## Flush Cache 
By default reflect process cached globally for performance reason. But in some case if you modify the class preferences by adding a new decorator etc, your new update will not returned until you flush the cache.

```typescript
reflect.flush(Type)
```