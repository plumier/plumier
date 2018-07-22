# Route Generation Cheat Sheet

## Without Route

If no `@route` decorator provided, generated route will be of type GET. 
> Parameter binding will be ignored (due to no type information if no decorator provided)
> All data type assumed to be of type string even if you provided other type

```typescript
export class AnimalController {
    get(id:string){}
    list(last:string, limit:string)
}
```
```
GET /animal/get?id=<number>
GET /animal/list?last=<number>&limit=<number>
```

## Basic Route (No Route Override)

Basic route will only defined http method of the route, route will be constructed using controller name (omit controller word) and action name

```typescript
export class AnimalController {
    @route.put()
    modify(id:number, model:AnimalDto)
    @route.post()
    save(model:AnimalDto){}
}
```
```
POST /animal/save
PUT  /animal/modify?id=<number>
```

## Absolute Route Override

Absolute route override (route start with `/`) will ignore all the controller and action name, instead it will used provided route.

```typescript
export class AnimalController {
    @route.get("/beast/:id")
    get(id:number){}
    @route.get("/beast/list")
    list(last:number, limit:number)
}
```
```
GET /beast/:id
GET /beast/list?last=<number>&limit=<number>
```

## Relative Route Override

Relative route override will only rename the name of the action and keep using controller name.

```typescript
export class AnimalController {
    @route.get(":id")
    get(id:number){}
    @route.get("list")
    list(last:number, limit:number)
}
```
```
GET /animal/:id
GET /animal/list?last=<number>&limit=<number>
```

## Ignore Action Name

You can provided empty string on the route parameter to ignore action name

```typescript
export class AnimalController {
    @route.get("")
    get(id:number){}
}
```
```
GET /animal?id=<number>
```

## Example Restful Api

Sum up of above rule you can create Restful API route like below:

```typescript
export class AnimalController {
    @route.get(":id")
    get(id:number){}
    @route.get("")
    getAll(){}
    @route.post("")
    save(animal:any)
    @route.put(":id")
    modify(id:number, animal:any)
    @route.delete(":id")
    delete(id:number){}
}
```
```
GET    /animal/:id
GET    /animal
POST   /animal
PUT    /animal/:id
DELETE /animal/:id
```

## Root Route

Root route only override the controller name

```typescript
@route.root("/beast")
export class AnimalController {
    get(id:number){}
    list(last:number, limit:number)
}
```
```
GET /beast/get?id=<number>
GET /beast/list?last=<number>&limit=<number>
```

## Parameterized Root Route

Root route can be parameterized and provided backing parameter on all of the action, except absolute route

```typescript
@route.root("/beast/:beastId")
export class AnimalController {
    get(beastId:number, id:number){}
    //absolute route doesn't need to provided backing parameter
    //fpr beastId
    @route.get("/list")
    list(last:number, limit:number)
}
```
```
GET /beast/<beastId>/get?id=<number>
GET /list?last=<number>&limit=<number>
```

## Example Nested Restful API

By using rules above you can configure nested restful api like below:

```typescript
@route.root("category/:type/animal")
export class AnimalController {
    @route.get(":id")
    get(type:string, id:number){}
    @route.get("")
    getAll(type:string){}
    @route.post("")
    save(type:string, animal:any)
    @route.put(":id")
    modify(type:string, id:number, animal:any)
    @route.delete(":id")
    delete(type:string, id:number){}
}
```
```
GET    category/:type/animal/:id
GET    category/:type/animal
POST   category/:type/animal
PUT    category/:type/animal/:id
DELETE category/:type/animal/:id
```
