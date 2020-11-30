---
id: controller
title: Controller
---

Controller is a group of similar functionalities, for example `UserController` contains functionalities to manage User. Plumier controller is a plain ES6 class contains several methods that will handle http request. Further it provided convention to automatically generate route based on its name, methods name and parameters name.

## Controller Naming
Plumier doesn't strictly limit the controller name, but controller must has name that end with `Controller`. This is useful when you have a non controller class inside `controller/` directory. Controller naming best practice is using plural word, such as `AnimalsController`, `UsersController` 

## Parameters
Controller parameter can be bound into some Http Request part automatically by using [Parameter Binding](Parameter-Binding.md). Plumier provided automatic type conversion based on parameter data type and can do some validation to sanitize http request part populated into controller parameters.

## Return Value
Controller can return JavaScript object that will be formatted into JSON result. For more advance result that require setting http status or response header can be done using [`ActionResult`](Action-Result.md).

## Throwing Errors
Any uncaught error will automatically handled by Plumier and translated into http response with status 500. You can throw `HttpStatusError` to provide custom error message with some http status that will be rendered into proper JSON response with appropriate status.

## Registration
By default controller registration done by traverse through all files contains Controller class inside `controller/` directory.

Position of the `controller/` directory should be the same directory level with the script file that call `Plumier.initialize()` method. 

```typescript
new Plumier()
    .set(new WebApiFacility())
    .initialize()
    .then(koa => koa.listen(8000))
```

Registration above will search for controllers classes inside `controller/` directory that the same level as the script above.

Registration can be specified from `WebApiFacility` or `RestfulApiFacility` by providing one of below:

#### Absolute directory

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: join(__dirname, "custom-path") }))
    .initialize()
    .then(koa => koa.listen(8000))
```

#### Relative directory

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: "custom-path" }))
    .initialize()
    .then(koa => koa.listen(8000))
```

#### Controller class

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: AnimalsController }))
    .initialize()
    .then(koa => koa.listen(8000))
```

#### Array of controller class 

```typescript
new Plumier()
    .set(new WebApiFacility({ controller: [
        AnimalsController,
        UsersController
    }))
    .initialize()
    .then(koa => koa.listen(8000))
```
