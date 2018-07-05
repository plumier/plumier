# Parameter Binding Cheat Sheet

> To be able to make parameter binding work properly Plumier need TypeScript design type information, by providing any decorator on the appropriate action. Use `@route` decorator is best practice to make data binding work properly

### Number

```typescript
export class AnimalController {
    @route.get()
    get(id:number){}
}
```
id parameter will automatically convert to `number` inside `get` action
```
GET /animal/get?id=123    -> 123
GET /animal/get?id=123.33 -> 123.33
GET /animal/get?id=hello  -> NaN 
```

### Boolean
```typescript
export class AnimalController {
    @route.get()
    get(id:boolean){}
}
```
id parameter will automatically convert to `boolean` inside `get` action
```
GET /animal/get?id=ON    -> true
GET /animal/get?id=on    -> true
GET /animal/get?id=On    -> true
GET /animal/get?id=TRUE  -> true
GET /animal/get?id=True  -> true
GET /animal/get?id=true  -> true
GET /animal/get?id=1     -> true
// anything else is false
```

### Date
```typescript
export class AnimalController {
    @route.get()
    get(id:Date){}
}
```
id parameter will automatically convert to `Date` inside `get` action
```
GET /animal/get?id=2018-2-1    -> equals to new Date(2018, 2, 1)
GET /animal/get?id=hello       -> Invalid Date
```


### Model
Model binding only works for POST and PUT method

> To be able to make Model binding work properly, the model must use [Parameter Properties](https://www.typescriptlang.org/docs/handbook/classes.html#parameter-properties) and any of decorator (on the constructor, or on any of constructor parameter decorator)

```typescript
@model() //any decorator will works
class AnimalModel {
    constructor(
        public id:number
        public name:string
        public deceased:boolean
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    save(model:AnimalModel){}
}
```
model parameter will automatically convert to `AnimalModel` inside `save` action
```
POST /animal/save
JSON Payload: { id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }
Result: 
AnimalController {
    id: 200,
    name: "Mimi",
    deceased: true,
    birthday: Date //equals to new Date(2018,1,1)
}
```

### Nested Model
```typescript
@model()
class ClientModel {
    constructor(
        public id: number,
        public name: string,
        public join: Date
    ) { }
}
@model()
class AnimalModel {
    constructor(
        public id: number,
        public name: string,
        public deceased: boolean,
        public birthday: Date,
        public owner: ClientModel
    ) { }
}

export class AnimalController {
    @route.post()
    save(model:AnimalModel){}
}
```
model parameter will automatically convert to `AnimalModel` inside `save` action
```
POST /animal/save
JSON Payload: {
    id: "200",
    name: "Mimi",
    deceased: "ON",
    birthday: "2018-1-1",
    owner: {
        id: "400",
        name: "John Doe",
        join: "2015-1-1"
    }
}

Result: 
AnimalModel {
    birthday: new Date("2018-1-1"), 
    deceased: true, 
    id: 200, 
    name: "Mimi",
    owner: ClientModel {
        id: 400,
        name: "John Doe",
        join: new Date("2015-1-1")
    }
}
```

### Array Binding
Array binding will use regular binding, no further conversion will be done on the array item due to TypeScript [design type emit limitation](https://github.com/Microsoft/TypeScript/issues/12463)

