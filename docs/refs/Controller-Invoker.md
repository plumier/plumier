---
id: controller-invoker
title: Controller Invoker
---

Sometime its necessary to get the result of another controller including its middleware execution, from inside another controller or from a middleware. The real case for this function is create a redirect request without changing the URL.

Controller invoker execute the middleware pipeline to execute controller including its middleware, its returned `ActionResult` so it can be returned from inside the calling controller or middleware. Its support all HTTP Method as long as it has the same signature and provided a proper parameters (see Caveat at the last section)

### Signature 

```typescript
function invoke(ctx: Context, route: RouteInfo)
```

Parameters: 
* `ctx` the request context 
* `route` route info metadata of the controller will be invoked, route metadata information can be retrieved from `ctx.routes`

### Context State 
When called from inside middleware its necessary to check the context state to prevent infinite call loop. Plumier provide `ctx.state.caller` property which possibly contains value: 
* `system` mean the request called by the Plumier request system.
* `invoke` mean the request called by controller invoker.

### Example Usage
Invoke another controller from inside controller 
```typescript
class AnimalController {
    get() {
        return { method: "get" }
    }

    list(@bind.ctx() ctx:Context){
        //invoke the AnimalController.get 
        return invoke(ctx, ctx.routes.find(x => x.action.name === "get")!)
    }
}
```

Invoke another controller from inside middleware 

```typescript
class AnimalMiddleware implements Middleware {
    execute(i: Readonly<Invocation>): Promise<ActionResult> {
        //make sure to check the context state property
        //only invoke another controller if the state is "system"
        if (i.context.state.caller === "system" && i.context.request.path === "/hello")
                //assume that it execute the first controller's action
                return invoke(i.context, i.context.routes[0])
            else
                return i.proceed()
    }
}
```

Above middleware will create a new route `/hello` that will execute the first controller's action registered in Plumier system.

### Caveat
* When called from inside controller, the calling action must have the same signature with the called action. 
* When called from inside middleware with a new endpoint, make sure to populate the `ctx.parameters` to supply the controller's action accordingly.