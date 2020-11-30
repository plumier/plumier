---
id: converters
title: Converters
---

Converters will automatically convert bound value (provided by Parameter Binding) into parameter type specified.

:::info
To be able to make converters work properly Plumier need TypeScript design type information, by providing any decorator on the appropriate action. Use `@route` decorator is best practice to make converter and parameter work properly.
:::

### Number Converter

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
GET /animal/get?id=hello  -> Error status 400 
```

### Boolean Converter
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
GET /animal/get?id=Hello -> Error status 400 
// working values (case insensitive): 
// ON, OFF, YES, NO, TRUE, FALSE, 1, 0
```

### Date Converter
```typescript
export class AnimalController {
    @route.get()
    get(id:Date){}
}
```
id parameter will automatically convert to `Date` inside `get` action
```
GET /animal/get?id=2018-2-1    -> equals to new Date(2018, 2, 1)
GET /animal/get?id=hello       -> Error status 400
```

### Domain Converter
Domain converter only works for POST and PUT method

:::info
To be able to make Domain converter work properly, the domain model must use [Parameter Properties](https://www.typescriptlang.org/docs/handbook/classes.html#parameter-properties) and any of decorator (on the constructor, or on any of constructor parameter decorator). Best practice is using `@domain()` decorator on the top of any dto.
:::

```typescript
@domain() //any decorator will works
class Animal {
    constructor(
        public id:number,
        public name:string,
        public deceased:boolean,
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    save(model:Animal){}
}
```
model parameter will automatically convert to `Animal` inside `save` action
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

### Nested Domain Converter
```typescript
@domain()
class Client {
    constructor(
        public id: number,
        public name: string,
        public join: Date
    ) { }
}
@domain()
class Animal {
    constructor(
        public id: number,
        public name: string,
        public deceased: boolean,
        public birthday: Date,
        public owner: Client
    ) { }
}

export class AnimalController {
    @route.post()
    save(model:Animal){}
}
```
model parameter will automatically convert to `Animal` inside `save` action
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
Animal {
    birthday: new Date("2018-1-1"), 
    deceased: true, 
    id: 200, 
    name: "Mimi",
    owner: Client {
        id: 400,
        name: "John Doe",
        join: new Date("2015-1-1")
    }
}
```

### Array Converter
Array converter a little bit different due to TypeScript [design type emit limitation](https://github.com/Microsoft/TypeScript/issues/12463).

Plumier provided `@array(TypeConstructor)` to give proper type conversion for Converters.

```typescript
@domain() 
class AnimalDto {
    constructor(
        public id:number
        public name:string
        public deceased:boolean
        public birthday:Date
    ){}
}

export class AnimalController {
    @route.post()
    save(@array(AnimalDto) model:AnimalDto[]){}
}
```
```
POST /animal/save
JSON Payload: [{ id: "200", name: "Mimi", deceased: "ON", birthday: "2018-1-1" }]
Result: 
[{
    id: 200,
    name: "Mimi",
    deceased: true,
    birthday: Date //equals to new Date(2018,1,1)
}]
```


