---
id: testing-tips
title: Testing Tips
---

To make testing easy, some tips below will make your testing easier

## Pick what you need to minimize mock
The common problem of testing web api is mocking `Request` and `Response` object.
Plumier provided a request binding to pick what part of request you need.

### Request Binding
For example to get the Remote IP address you can provide a binding to IP request part like below.

```typescript
export class UserController {
    @route.post()
    async saveUserIpAddress(@bind.request("ip") ip:string){
        //your implementation
        return success
    }
}
```

Testing above code will not require any mocking

```typescript
it("Should save user IP Address", async () => {
    const controller = new UserController()
    const success = await controller.saveUserIpAddress("125.162.125.309")
    expect(success).toBe(true)
}
```

### Other Binding
You can almost get every part of request with `@bind.request(<part>)`, But in some case you need to get part of the object to prevent mocking. For example you need to get `x-api-key` and the request body at the same time, use `@bind.header()` and `@bind.body()`.

```typescript
export class UserController {
    @route.post()
    async saveUser(@bind.header("x-api-key") apiKey:string, @bind.body() user:any){
        //your implementation
        return success
    }
}
```

The testing part will be like below

```typescript
it("Should save user and api key", async () => {
    const controller = new UserController()
    const success = await controller.saveUser("<api key>", { user: "John Doe" })
    expect(success).toBe(true)
}
```

## Return value for testing evaluation
You might be thinking how do we use `Response` on Plumier, actually we don't. Plumier will automatically return JSON from what your action's return value.

```typescript
export class UserController {
    @route.post()
    async saveUser(@bind.body() user:any){
        //your implementation
        return { newId }
    }
}
```

By returning raw value like above code, evaluating the result will be easy without needing to mock `Response` or `Context`. The testing will be as easy as below:

```typescript
it("Should save user and api key", async () => {
    const controller = new UserController()
    const result = await controller.saveUser("<api key>", { user: "John Doe" })
    expect(result.newId).toBe(1234)
}
```


### More advance return value
In some case you need more advance return value such as setting header and some response status code. You can return `ActionResult` and evaluate it easily.

```typescript
export class UserController {
    @route.post()
    async saveUser(@bind.body() user:any){
        //your implementation
        return new ActionResult({ newId }, 201)
    }
}
```

```typescript
it("Should save user and api key", async () => {
    const controller = new UserController()
    const result = await controller.saveUser("<api key>", { user: "John Doe" })
    expect(result.body.newId).toBe(1234)
    expect(result.status).toBe(201)
}
```

## Throw error if something bad happening
Using `ActionResult` might be good to return response with status code, but in some case for example data validation, using `ActionResult` may be bad because it introduce more return value to evaluate.

```typescript
export class UserController {
    @route.post()
    async saveUser(@bind.body() user:any){
        if(await isExists(user.username)) {
            return new ActionResult("Username exists", 400)
        }
        //your implementation
        return new ActionResult({ newId }, 201)
    }
}
```

You can also simply throw `HttpStatusError` to make the code control flow look better.


```typescript
export class UserController {
    @route.post()
    async saveUser(@bind.body() user:any){
        if(await isExists(user.userName)) {
            throw new HttpStatusError(400)
        }
        //your implementation
        return new ActionResult({ newId }, 201)
    }
}
```

The testing part will be a lot easier

```typescript
it("Should throw 400 if username exists", async () => {
    const controller = new UserController()
    expect(controller.saveUser({ userName: "john" })).rejects.toEqual(new HttpStatusError(400))
}
```
<!-- 
## Dependency Injection for advance use case
If your project managed in separate layers, testing in isolation will be very difficult. Plumier optionally support Dependency Injection to make layered application easy to test.

For example your application have `Service` layer which will communicate with database.

```javascript
export class UserService {
    //this will save user to database
    async saveUser(user:UserDto){}
}

@domain()
export class UserDto{
    constructor(
        public userName:string
    ){}
}

export class UserController{
    controller(public service:UserService){}

    saveUser(user:UserDto){

    }
}
``` -->