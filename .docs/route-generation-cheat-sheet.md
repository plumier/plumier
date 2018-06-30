# Route Generation Cheat Sheet

### Basic Controller
```typescript
export class AnimalController {
    get(id:number){}
    list(last:number, limit:number)
}
```
```
GET /animal/get?id=<number>
GET /animal/list?last=<number>&limit=<number>
```

### Controller With Decorator
```typescript
export class AnimalController {
    @route.post()
    save(model:any){}
    @route.put()
    modify(id:number, model:any)
}
```
```
POST /animal/save
PUT  /animal/modify?id=<number>
```

### Controller With Route Override
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

### Controller With Relative Override
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


### Restful style
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

### Controller With Controller Name Override
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

### Controller With Controller Name Override and Relative Override
```typescript
@route.root("/beast")
export class AnimalController {
    @route.get("retrieve/:id")
    get(id:number){}
    @route.get("paginate/:last/:limit")
    list(last:number, limit:number)
    @route.get("/category/:type")
    getByCategory(type:string){}
}
```
```
GET /beast/retrieve/:id
GET /beast/paginate/:last/:limit
GET /category/:type
```

### Nested Restful style
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

### Model Binding

```typescript
//./model
@model()
export class AnimalModel{
    constructor(
        public id:string,
        public name:string
    ){}
}

//./controller
export class AnimalController {
    @route.post()
    save(animal:AnimalModel){}
}
```
```
POST /animal/save
payload body automatically assigned to animal parameter
```

### Bind Request

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request() req:Request){}
}
```
```
POST /animal/save
req parameter automatically populated with request
```

### Bind Part of Request

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request("params") params:any){}
}
```
```
POST /animal/save
params parameter automatically populated with params
```

### Bind Part of Request

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request("params") params:any){}
}
```
```
POST /animal/save
params parameter automatically populated with params
```