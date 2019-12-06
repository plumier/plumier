---
id: custom-dependency-resolver
title: Custom Dependency Resolver
---

Plumier uses global factory method to create instance of framework components such as Controller, Middleware, Custom Validator, Custom Authorizer etc. This factory method can be used as the [composition root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/) when using custom dependency injection framework.

## Custom Dependency Resolver 
By default Plumier doesn't have a proper dependency injection functionality, but Plumier has an extension point to possibly extend its functionality by using Custom Dependency Resolver. 

## Signature 
The signature of Plumier Dependency Resolver is very simple and straightforward, it simply like below

```typescript
interface DependencyResolver {
    resolve(type: Class | string | symbol): any
}
```

## Example Usage
This example is a show case how you can create custom `DependencyResolver` and use an IoC container library to resolve controller's dependency. 

This example uses [My Own IoC Container](https://github.com/ktutnik/my-own-ioc-container), its a light weight zero dependency IoC container library. The source code can be copy pasted to your project and become the part of your project. 

By default Plumier will need a parameterless constructor because it doesn't have dependency injection capability. The controller is like below: 

```typescript 
import {inject} from "./my-own-ioc-container"
import {route} from "plumier"

class AnimalsController {
    constructor(
        @inject.name("repository") 
        private repository: AnimalRepository
    ) { }

    @route.post("")
    save(animal: Animal) {
        return this.repository.save(animal)
    }
}
```

`AnimalsController` dependent to `AnimalRepository` from its constructor parameter. Note that the `repository` parameter decorated with `@inject.name("repository")` means its will automatically injected with instance of object registered as `repository`. the `AnimalRepository` is an interface with contract like below

```typescript
interface AnimalRepository {
    save(animal: Animal):any
}
```

Somewhere inside the project, implementation of `AnimalRepository` is like below, furthermore we will register this repository by name as `repository` so it will injected properly into the `AnimalsController`.

```typescript
class AnimalRepositoryImpl implements AnimalRepository {
    save(animal: Animal) {
        //save the data and then return the new ID
        //for example return 123
        return { id: 123 }
    }
}
```

Next we need to glue the object and its dependency by using the Inversion of Control container, here we will glue them together inside the custom dependency resolver. 

```typescript
import {Container} from "./my-own-ioc-container"

class CustomResolver implements DependencyResolver {
    readonly container: Container
    constructor() {
        this.container = new Container()
        this.container.register("repository").asType(AnimalRepositoryImpl)
        this.container.register(AnimalsController)
    }

    resolve(type: string | symbol | Class) {
        //My Own IoC Container doesn't supported symbol, Inversify http://inversify.io/ does
        if (typeof type === "symbol") throw new Error("IoC Container doesn't supported symbol")
        return this.kernel.resolve(type)
    }
}
```

Thats all the configuration you need, next you need to register the custom resolver into the Plumier application.

```typescript
import {Plumier} from "plumier"

const plumier = new Plumier()
    .set(new WebApiFacility({ dependencyResolver: new CustomResolver() }))
```

