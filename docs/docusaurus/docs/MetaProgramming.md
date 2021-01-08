---
id: metaprogramming
title: Metaprogramming
---

Key feature that make Plumier different than other TypeScript backend framework is its ability to perform metaprogramming. Plumier has its own reflection (introspection) library named `@plumier/reflect`, that makes metaprogramming possible.

Metaprogramming in Plumier increases reusability of custom extension, because it can access information about current controller and action handles the request and the location of custom extension applied. 

## Metadata 
Metadata is specialized class contains information about current request metadata, such as controller object graph, action object graph, action parameters etc. It has properties below

1. `actionParams` current action parameters, contains information about action parameters values used to execute the action.
2. `controller` current controller object graph, contains information about controller name, decorators, methods, constructor etc. 
3. `action` current action object graph, contains information about action name, parameters, decorators etc.
4. `current` metadata information where the appropriate decorator applied, can be Class metadata, Method metadata, Property metadata or Parameter metadata. For global middleware the `current` property will be `undefined`.


## Access The Metadata
Metadata object accessible through all custom extension, it accessible by `metadata` property. 

### Middleware 
Invocation object has `metadata` property, you can access it like below

```typescript
const myCustomMiddleware:CustomMiddlewareFunction = ({ metadata, proceed }) => {
    // process metadata 
    return proceed()
}
```

Or accessible from class style middleware 

```typescript
class MyCustomMiddleware implements CustomMiddleware {
    async execute({ metadata, proceed }: Invocation) {
        // process metadata 
        return proceed()
    }
}
```

### Custom Authorizer
Metadata can be accessed from `AuthorizationContext` class like below 

```typescript
const myCustomAuthorizer: CustomAuthorizerFunction = ({ metadata }) => {
    // process metadata
    return true
}
```

Or accessible from class style authorizer

```typescript
class MyCustomAuthorizer implements CustomAuthorizer {
    authorize({ metadata }: AuthorizationContext) {
        // process metadata
        return true
    }
}
```

### Custom Validator 
Metadata can be accessed from `ValidatorContext` class like below 

```typescript
const myCustomValidator:CustomValidatorFunction = (val, { metadata }) => {
    // process metadata
}
```

Or accessible from class style validator

```typescript 
class MyCustomValidator implements CustomValidator {
    validate(value: any, { metadata } : ValidatorContext) {
        // process metadata
    }
}
```

### Custom Binder 
Metadata accessible from the second parameter of custom binder 

```typescript
const myCustomBinder:CustomBinderFunction = (ctx, metadata) => {
    // process metadata
}
```

## Controller and Action Object Graph 
Metadata object contains information of current controller and action handle the request, Access them like below 

```typescript
const controllerName = metadata.controller.name 
const actionName = metadata.action.name 
```

Access the parameter names of the action 

```typescript 
const actionParameterNames = metadata.action.parameters.map(x => x.name)
```

Access decorator applied to the Controller or Action 

```typescript
const controllerDecorators = metadata.controller.decorators
const actionDecorators = metadata.action.decorators
```

## Action Params 
Action parameter useful to get information about current action parameters and their values. For example with controller below 

```typescript 
class AnimalController {
    @route.get(":id")
    get(id:string, breed:string){

    }
}
```

With the request `GET /animal/12345?breed=canine` you can access the values of the parameter from metadata object like below

```typescript
const id = metadata.actionParams.get("id") //result id = 12345 
const breed = metadata.actionParams.get("breed") //result breed = canine 
```

You can access the parameter by its index like below 

```typescript
const id = metadata.actionParams.get(0) //result id = 12345 
const breed = metadata.actionParams.get(1) //result breed = canine 
```

To increase your app robustness it is necessary to check if current action handles the request has specific parameter. You can do that like below 

```typescript
if(!metadata.actionParams.has("id"))
    throw new Error("Applied method doesn't have 'id' parameter")
```


