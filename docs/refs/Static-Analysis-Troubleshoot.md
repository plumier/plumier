---
id: static-analysis
title: Static Analysis
---

Plumier will check for issue / possible issue inside your controller and models in boot phase. This feature will disabled in production mode.

Here are list of issue detected by the static analysis and how to fix them.

## Error Code: PLUM1000
This error occur when you specify an override route in `@route` decorator with some parameter, but the appropriate action parameter doesn't have parameter with the same name. 

```typescript
export class AnimalController {
    @route.get("/get/:id/:type")
    get(id:number){}
}
```

Above code will throw PLUM1000 error because you missing `:type` parameter on the `get(id:number)` action.

### Fix It
Fixing it by adding `type` parameter on the `get(id:number)` action become

```typescript
export class AnimalController {
    @route.get("/get/:id/:type")
    get(id:number, type:string){}
}
```
