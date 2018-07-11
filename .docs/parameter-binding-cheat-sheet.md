# Parameter Binding Cheat Sheet

Parameter binding will automatically bind provided query string / form body into action parameter. 

> To be able to make parameter binding work properly Plumier need TypeScript design type information, by providing any decorator on the appropriate action. Use `@route` decorator is best practice to make data binding work properly

### Number Binding

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

### Boolean Binding
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

### Date Binding
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

### Model Binding
Model binding only works for POST and PUT method

> To be able to make Model binding work properly, the model must use [Parameter Properties](https://www.typescriptlang.org/docs/handbook/classes.html#parameter-properties) and any of decorator (on the constructor, or on any of constructor parameter decorator). Best practice is using `@model()` decorator on the top of any model.

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

### Nested Model Binding
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
Array binding a little bit different due to TypeScript [design type emit limitation](https://github.com/Microsoft/TypeScript/issues/12463).

Plumier provided `@bind.array(TypeConstructor)` to give prover type conversion for parameter binding.

```typescript
@model() 
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
    save(@bind.array(AnimalModel) model:AnimalModel[]){}
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

### Request Binding
Bind request to action's parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request() model:Koa.Request){

    }
}
```

part of request can be issued by providing path parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.request("ip") ip:string){

    }
}
```

### Request Body Binding
Bind request body to action's parameter, this feature is the same with model binding but you can specify which property of the body will be bound to the parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.body() model:any){

    }
}
```

You can specify model type to get correct conversion of the model's properties

```typescript
export class AnimalController {
    @route.post()
    save(@bind.body() model:AnimalModel){

    }
}
```

You can bind part of the body by specify the parameter

```typescript
export class AnimalController {
    @route.post()
    save(@bind.body("id") id:number){

    }
}
```

### Query Binding
Bind query to action's parameter 

```typescript
export class AnimalController {
    @route.post()
    save(@bind.query() model:any){

    }
}
```

You can specify the model to get correct conversion

```typescript
@model()
export class AnimalModel {
    constructor(
        public id:number,
        public name:string,
        public birthday:Date,
        public deceased:boolean
    ){}
}

export class AnimalController {
    @route.get()
    save(@bind.query() model:AnimalModel){

    }
}
```

And the query string will be populated to the body properly

```
GET /animal/save?id=200&name=Mimi&deceased=ON&birthday=2018-1-1
Result populated to model: 
AnimalModel{
    id: 200,
    name: "Mimi",
    deceased: true,
    birthday: Date //equals to new Date(2018,1,1)
}
```

It can be combined with the model binding to get bound request body and query

```typescript
class AnimalController {
    @route.post()
    save(@bind.query() page: PagingModel, model: AnimalModel) {
        return { page, model }
    }
}
```

## Custom Error Message
By default if value conversion failed Plumier will throw `ConversionError` with status 400 with message `Unable to convert "<value>" into <Type> in parameter <parameter path>`

If you want to provide another error message you can catch the error on the global middleware and re-throw error with your custom message. 

```typescript
const app = new Plumier()
app.set(new WebApiFacility())
app.use({execute: async x => {
    try{
        return await x.proceed()
    }
    catch(e){
        if(e instanceof ConversionError){
            //e.info contains information of current error such as:
            //- parameter path
            //- parameter type
            //- parameter value
            throw new HttpStatusError(400, "<Your custom message>")
        }
        else 
            throw e
    }
}})

```



